import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.module';
import { AutomationEmailTemplatesService } from '../automation/automation-email-templates.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import {
  CHURCH_ASSIGNABLE_ROLES,
  CreateChurchStaffDto,
  UpdateChurchStaffDto,
} from './dto/church-staff.dto';
import { detachUserReferences } from '../../common/detach-user-references';

@Injectable()
export class ChurchStaffService {
  private readonly logger = new Logger(ChurchStaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailTemplates: AutomationEmailTemplatesService,
    private readonly email: EmailAdapter,
  ) {}

  private async roleIds(names: string[]) {
    const roles = await this.prisma.role.findMany({
      where: { name: { in: names } },
    });
    if (roles.length !== names.length) {
      const found = new Set(roles.map((r) => r.name));
      const missing = names.filter((n) => !found.has(n));
      throw new BadRequestException(`Unknown roles: ${missing.join(', ')}`);
    }
    return roles;
  }

  async list(churchId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        churchId,
        roles: {
          some: { role: { name: { in: [...CHURCH_ASSIGNABLE_ROLES] } } },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { include: { role: { select: { name: true, description: true } } } },
        member: {
          select: {
            id: true,
            status: true,
            serviceUnitLeaderships: {
              where: { isUnitAdmin: true },
              select: {
                serviceUnitId: true,
                serviceUnit: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return users.map((u) => this.toStaffDto(u));
  }

  async create(churchId: string, actorUserId: string, dto: CreateChurchStaffDto) {
    await this.assertCanCreate(actorUserId, churchId, dto.roles);
    this.assertUnitLeaderAssignment(dto.roles, dto.serviceUnitIds, true);

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const roles = await this.roleIds(dto.roles);

    const user = await this.prisma.user.create({
      data: {
        churchId,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim(),
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    const member = await this.ensureMemberProfile(
      churchId,
      user.id,
      user.email,
      user.firstName,
      user.lastName,
    );

    if (dto.serviceUnitIds !== undefined) {
      await this.syncUnitAdminLeadership(churchId, member.id, dto.serviceUnitIds);
    } else if (this.isUnitOnlyLeader(dto.roles)) {
      throw new BadRequestException('Assign at least one service unit for a unit leader');
    }

    await this.sendStaffWelcomeEmail(churchId, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      temporaryPassword: dto.password,
      roles: dto.roles,
    });

    return this.findOne(churchId, user.id);
  }

  private async sendStaffWelcomeEmail(
    churchId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      temporaryPassword: string;
      roles: string[];
    },
  ) {
    try {
      const church = await this.prisma.church.findUnique({
        where: { id: churchId },
        select: { name: true },
      });
      const roleLabel = data.roles.join(', ');
      const rendered = await this.emailTemplates.render(churchId, 'STAFF_WELCOME', {
        churchName: church?.name ?? 'Your church',
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        roleLabel,
      });
      const plain = rendered.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      await this.email.send({
        to: data.email,
        subject: rendered.subject,
        body: plain,
        html: rendered.bodyHtml,
        churchId,
        purpose: 'onboarding',
      });
    } catch (err) {
      this.logger.warn(
        `Staff welcome email failed for ${data.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findOne(churchId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, churchId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { include: { role: { select: { name: true, description: true } } } },
        member: {
          select: {
            id: true,
            status: true,
            serviceUnitLeaderships: {
              where: { isUnitAdmin: true },
              select: {
                serviceUnitId: true,
                serviceUnit: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Staff user not found');
    return this.toStaffDto(user);
  }

  async update(
    churchId: string,
    id: string,
    actorUserId: string,
    dto: UpdateChurchStaffDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, churchId },
      include: {
        roles: { include: { role: true } },
        member: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException('Staff user not found');

    await this.assertCanModify(actorUserId, churchId, user, dto.roles);

    const nextRoles = dto.roles ?? user.roles.map((r) => r.role.name);
    if (dto.serviceUnitIds !== undefined) {
      this.assertUnitLeaderAssignment(nextRoles, dto.serviceUnitIds, false);
    } else if (dto.roles && this.isUnitOnlyLeader(dto.roles)) {
      const existingAdminCount = user.member
        ? await this.prisma.serviceUnitLeader.count({
            where: {
              memberId: user.member.id,
              isUnitAdmin: true,
              serviceUnit: { churchId },
            },
          })
        : 0;
      if (existingAdminCount === 0) {
        throw new BadRequestException(
          'Assign at least one service unit for a unit leader',
        );
      }
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase(), id: { not: id } },
      });
      if (taken) throw new ConflictException('Email already in use');
    }

    const data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.firstName) data.firstName = dto.firstName.trim();
    if (dto.lastName) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({ where: { id }, data });

    if (dto.roles?.length) {
      const roles = await this.roleIds(dto.roles);
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    if (dto.firstName || dto.lastName || dto.email) {
      await this.prisma.member.updateMany({
        where: { userId: id },
        data: {
          ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
          ...(dto.email ? { email: dto.email.toLowerCase().trim() } : {}),
        },
      });
    }

    const member =
      user.member ??
      (await this.ensureMemberProfile(
        churchId,
        id,
        dto.email?.toLowerCase().trim() ?? user.email,
        dto.firstName?.trim() ?? user.firstName,
        dto.lastName?.trim() ?? user.lastName,
      ));

    if (dto.serviceUnitIds !== undefined) {
      await this.syncUnitAdminLeadership(churchId, member.id, dto.serviceUnitIds);
    } else if (
      dto.roles &&
      !dto.roles.includes('LEADER') &&
      !dto.roles.includes('ADMIN') &&
      !dto.roles.includes('PASTOR')
    ) {
      // No leadership-capable roles left — clear unit-admin leadership.
      await this.syncUnitAdminLeadership(churchId, member.id, []);
    }

    return this.findOne(churchId, id);
  }

  async remove(churchId: string, id: string, actorUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, churchId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Staff user not found');

    if (id === actorUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.assertCanModify(actorUserId, churchId, user);

    const roleNames = user.roles.map((r) => r.role.name);
    if (roleNames.includes('PLATFORM_ADMIN')) {
      throw new ForbiddenException('Cannot delete a platform admin account');
    }

    await this.prisma.$transaction(async (tx) => {
      await detachUserReferences(tx, [id]);
      await tx.user.delete({ where: { id } });
    });

    return { success: true, deleted: true };
  }

  private async assertCanCreate(
    actorUserId: string,
    churchId: string,
    roles: string[],
  ) {
    const actor = await this.prisma.user.findFirst({
      where: { id: actorUserId, churchId },
      include: { roles: { include: { role: true } } },
    });
    if (!actor) throw new ForbiddenException('Not allowed');

    const actorNames = actor.roles.map((r) => r.role.name);
    if (actorNames.includes('ADMIN')) return;

    if (!actorNames.includes('PASTOR')) {
      throw new ForbiddenException('Only pastors and church admins may add staff');
    }

    if (roles.includes('PASTOR')) {
      throw new ForbiddenException('Pastors cannot create pastor accounts — ask a church admin');
    }
  }

  /** Pastors may manage ADMIN/LEADER/MEMBER/DRIVER; church ADMIN may manage anyone except PLATFORM_ADMIN. */
  private async assertCanModify(
    actorUserId: string,
    churchId: string,
    target: { id: string; roles: { role: { name: string } }[] },
    newRoles?: string[],
  ) {
    const actor = await this.prisma.user.findFirst({
      where: { id: actorUserId, churchId },
      include: { roles: { include: { role: true } } },
    });
    if (!actor) throw new ForbiddenException('Not allowed');

    const actorNames = actor.roles.map((r) => r.role.name);
    const targetNames = target.roles.map((r) => r.role.name);

    if (actorNames.includes('ADMIN')) return;

    if (!actorNames.includes('PASTOR')) {
      throw new ForbiddenException('Only pastors and church admins may manage staff');
    }

    if (targetNames.includes('PASTOR') && target.id !== actorUserId) {
      throw new ForbiddenException('Pastors cannot modify other pastor accounts');
    }

    if (newRoles?.includes('PASTOR') && target.id !== actorUserId) {
      throw new ForbiddenException('Pastors cannot assign the pastor role to others');
    }
  }

  private async ensureMemberProfile(
    churchId: string,
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    const existing = await this.prisma.member.findUnique({ where: { userId } });
    if (existing) return existing;

    return this.prisma.member.create({
      data: {
        churchId,
        userId,
        email,
        firstName,
        lastName,
        status: 'ACTIVE_MEMBER',
        roles: ['ADULT'],
        gamification: { create: {} },
      },
    });
  }

  private isUnitOnlyLeader(roles: string[]): boolean {
    return (
      roles.includes('LEADER') &&
      !roles.includes('ADMIN') &&
      !roles.includes('PASTOR')
    );
  }

  private assertUnitLeaderAssignment(
    roles: string[],
    serviceUnitIds: string[] | undefined,
    requireOnCreate: boolean,
  ) {
    if (!this.isUnitOnlyLeader(roles)) return;
    if (requireOnCreate && (!serviceUnitIds || serviceUnitIds.length === 0)) {
      throw new BadRequestException('Assign at least one service unit for a unit leader');
    }
    if (serviceUnitIds !== undefined && serviceUnitIds.length === 0) {
      throw new BadRequestException('Assign at least one service unit for a unit leader');
    }
  }

  /**
   * Replace unit-admin leadership for a member with exactly `serviceUnitIds`
   * (must all belong to this church). Also ensures ServiceUnitMember rows.
   */
  async syncUnitAdminLeadership(
    churchId: string,
    memberId: string,
    serviceUnitIds: string[],
  ) {
    const uniqueIds = [...new Set(serviceUnitIds)];
    if (uniqueIds.length) {
      const units = await this.prisma.serviceUnit.findMany({
        where: { churchId, id: { in: uniqueIds } },
        select: { id: true },
      });
      if (units.length !== uniqueIds.length) {
        throw new BadRequestException(
          'One or more service units are invalid for this church',
        );
      }
    }

    const existing = await this.prisma.serviceUnitLeader.findMany({
      where: {
        memberId,
        serviceUnit: { churchId },
        isUnitAdmin: true,
      },
      select: { id: true, serviceUnitId: true },
    });

    const want = new Set(uniqueIds);
    const toRemove = existing.filter((e) => !want.has(e.serviceUnitId));
    if (toRemove.length) {
      await this.prisma.serviceUnitLeader.deleteMany({
        where: { id: { in: toRemove.map((r) => r.id) } },
      });
    }

    for (const serviceUnitId of uniqueIds) {
      await this.prisma.serviceUnitMember.upsert({
        where: {
          serviceUnitId_memberId: { serviceUnitId, memberId },
        },
        create: { serviceUnitId, memberId },
        update: {},
      });
      await this.prisma.serviceUnitLeader.upsert({
        where: {
          serviceUnitId_memberId: { serviceUnitId, memberId },
        },
        create: {
          serviceUnitId,
          memberId,
          role: 'UNIT ADMIN',
          isModerator: true,
          isUnitAdmin: true,
        },
        update: {
          role: 'UNIT ADMIN',
          isModerator: true,
          isUnitAdmin: true,
        },
      });
    }

    if (uniqueIds.length) {
      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
        select: { roles: true },
      });
      if (member && !member.roles.includes('LEADER')) {
        await this.prisma.member.update({
          where: { id: memberId },
          data: { roles: [...member.roles, 'LEADER'] },
        });
      }
    }
  }

  private toStaffDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    roles: { role: { name: string; description: string | null } }[];
    member: {
      id: string;
      status: string;
      serviceUnitLeaderships?: {
        serviceUnitId: string;
        serviceUnit: { id: string; name: string };
      }[];
    } | null;
  }) {
    const led = user.member?.serviceUnitLeaderships ?? [];
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => ({
        name: r.role.name,
        description: r.role.description,
      })),
      memberId: user.member?.id ?? null,
      memberStatus: user.member?.status ?? null,
      serviceUnitIds: led.map((l) => l.serviceUnitId),
      ledServiceUnits: led.map((l) => ({
        id: l.serviceUnit.id,
        name: l.serviceUnit.name,
      })),
    };
  }
}

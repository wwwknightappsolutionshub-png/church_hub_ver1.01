import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  createDefaultChurchLanding,
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  defaultTenantModules,
  mergeTenantModulesIntoSettings,
  parseTenantModulesFromSettings,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  mergeDepartmentModuleSettingsIntoChurchSettings,
  parseDepartmentModuleSettings,
} from '../../common/department-module-settings';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { ResetTenantUserPasswordDto } from './dto/reset-tenant-user-password.dto';
import { PlatformProvisioningService } from './platform-provisioning.service';
import { MembershipConfigService } from '../membership/membership-config.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { UploadsService } from '../uploads/uploads.service';
import { PurgeChurchDto } from './dto/purge-church.dto';
import { UpdateTenantUserEmailDto } from './dto/update-tenant-user-email.dto';
import { detachUserReferences } from '../../common/detach-user-references';

const STAFF_ROLE_NAMES = [
  'ADMIN',
  'PASTOR',
  'LEADER',
  'PROVINCIAL_LEADER',
  'MEMBER',
  'DRIVER',
] as const;

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: PlatformProvisioningService,
    private readonly membershipConfig: MembershipConfigService,
    private readonly email: EmailAdapter,
    private readonly uploads: UploadsService,
  ) {}

  getModuleCatalog() {
    return defaultTenantModules();
  }

  async listChurches() {
    const churches = await this.prisma.church.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        settings: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            members: true,
          },
        },
      },
    });

    const churchIds = churches.map((c) => c.id);
    const pastorsByChurch = new Map<string, number>();
    const adminsByChurch = new Map<string, number>();

    const roleUsers = await this.prisma.user.findMany({
      where: {
        churchId: { in: churchIds },
        isActive: true,
        roles: { some: { role: { name: { in: ['PASTOR', 'ADMIN'] } } } },
      },
      select: {
        churchId: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });

    for (const u of roleUsers) {
      if (!u.churchId) continue;
      const names = u.roles.map((r) => r.role.name);
      if (names.includes('PASTOR')) {
        pastorsByChurch.set(u.churchId, (pastorsByChurch.get(u.churchId) ?? 0) + 1);
      }
      if (names.includes('ADMIN')) {
        adminsByChurch.set(u.churchId, (adminsByChurch.get(u.churchId) ?? 0) + 1);
      }
    }

    return churches.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.city,
      country: c.country,
      isActive: c.isActive,
      createdAt: c.createdAt,
      userCount: c._count.users,
      memberCount: c._count.members,
      pastorCount: pastorsByChurch.get(c.id) ?? 0,
      adminCount: adminsByChurch.get(c.id) ?? 0,
      tenantModules: parseTenantModulesFromSettings(c.settings),
      departmentModuleSettings: parseDepartmentModuleSettings(c.settings),
    }));
  }

  async getChurch(churchId: string) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        address: true,
        timezone: true,
        isActive: true,
        settings: true,
        createdAt: true,
      },
    });
    if (!church) throw new NotFoundException('Church not found');

    const staff = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...STAFF_ROLE_NAMES] } } } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        mustChangePassword: true,
        roles: { include: { role: { select: { name: true, description: true } } } },
        member: { select: { id: true, status: true } },
      },
    });

    const pastors = staff.filter((u) => u.roles.some((r) => r.role.name === 'PASTOR'));
    const admins = staff.filter((u) => u.roles.some((r) => r.role.name === 'ADMIN'));

    return {
      church: {
        ...church,
        tenantModules: parseTenantModulesFromSettings(church.settings),
        departmentModuleSettings: parseDepartmentModuleSettings(church.settings),
      },
      pastors: pastors.map(this.mapStaffUser),
      admins: admins.map(this.mapStaffUser),
      allStaff: staff.map(this.mapStaffUser),
    };
  }

  async createChurch(dto: CreateChurchDto) {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.prisma.church.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Church slug already taken');

    const settings = {
      landing: createDefaultChurchLanding(dto.name.trim(), 'classic'),
      landingMembershipForm: DEFAULT_LANDING_MEMBERSHIP_FORM,
      tenantModules: defaultTenantModules(),
    };

    const church = await this.prisma.church.create({
      data: {
        name: dto.name.trim(),
        slug,
        city: dto.city?.trim() || null,
        country: dto.country?.trim() || null,
        timezone: dto.timezone?.trim() || 'UTC',
        isActive: dto.isActive ?? true,
        settings: settings as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        createdAt: true,
        settings: true,
      },
    });

    const provisionedStaff = await this.provisioning.provisionTenantStaff({
      churchId: church.id,
      churchName: church.name,
      churchSlug: church.slug,
      settings: church.settings,
      adminEmail: dto.adminEmail,
      pastorEmail: dto.pastorEmail,
    });

    await this.membershipConfig.seedChurchDefaults(church.id);

    return {
      ...church,
      tenantModules: parseTenantModulesFromSettings(church.settings),
      departmentModuleSettings: parseDepartmentModuleSettings(church.settings),
      provisionedStaff,
    };
  }

  async updateChurch(churchId: string, dto: UpdateChurchDto) {
    const existing = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!existing) throw new NotFoundException('Church not found');

    if (dto.slug) {
      const slug = dto.slug.trim().toLowerCase();
      const clash = await this.prisma.church.findFirst({
        where: { slug, NOT: { id: churchId } },
      });
      if (clash) throw new ConflictException('Church slug already taken');
    }

    const currentSettings =
      existing.settings && typeof existing.settings === 'object'
        ? (existing.settings as Record<string, unknown>)
        : {};

    let settings = currentSettings;
    if (dto.tenantModules) {
      settings = mergeTenantModulesIntoSettings(
        currentSettings,
        dto.tenantModules as Partial<ChurchTenantModulesMap>,
      );
    }
    if (dto.departmentModuleSettings) {
      settings = mergeDepartmentModuleSettingsIntoChurchSettings(
        settings,
        dto.departmentModuleSettings,
      );
    }

    const church = await this.prisma.church.update({
      where: { id: churchId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country?.trim() || null } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone?.trim() || 'UTC' } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.tenantModules ? { settings: settings as Prisma.InputJsonValue } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        settings: true,
        createdAt: true,
      },
    });

    return {
      ...church,
      tenantModules: parseTenantModulesFromSettings(church.settings),
      departmentModuleSettings: parseDepartmentModuleSettings(church.settings),
    };
  }

  async deleteChurch(churchId: string) {
    const existing = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!existing) throw new NotFoundException('Church not found');

    const userCount = await this.prisma.user.count({ where: { churchId } });
    if (userCount > 0) {
      const row = await this.prisma.church.update({
        where: { id: churchId },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });
      return { id: row.id, isActive: row.isActive, deleted: false, deactivated: true };
    }

    await this.prisma.church.delete({ where: { id: churchId } });
    return { id: churchId, deleted: true, deactivated: false };
  }

  /**
   * Clear Restrict FKs that point at tenant users so church/user cascade can complete.
   * @deprecated Prefer shared detachUserReferences helper.
   */
  private async detachUsersForChurchPurge(
    tx: Prisma.TransactionClient,
    userIds: string[],
  ) {
    await detachUserReferences(tx, userIds);
  }

  /**
   * Irreversible purge: deletes the church row (cascades tenant data + users/emails),
   * marketing trial leads for those emails, and on-disk uploads.
   */
  async permanentlyDeleteChurch(
    churchId: string,
    dto: PurgeChurchDto,
    actor: { userId: string; email: string },
  ) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    if (dto.confirmSlug !== church.slug.toLowerCase()) {
      throw new BadRequestException('Confirmation slug does not match this tenant');
    }
    if (dto.confirmPhrase !== 'DELETE') {
      throw new BadRequestException('Type DELETE to confirm permanent deletion');
    }

    const users = await this.prisma.user.findMany({
      where: { churchId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const userIds = users.map((u) => u.id);
    const emails = users.map((u) => u.email.toLowerCase());
    const emailKeys = [...new Set(emails)];

    const memberCount = await this.prisma.member.count({ where: { churchId } });

    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (emailKeys.length) {
            await tx.marketingTrialLead.deleteMany({
              where: { emailKey: { in: emailKeys } },
            });
          }

          // Detach Restrict FKs, then delete church (cascades users + tenant data).
          // Do NOT delete users first — that is what hits Restrict and fails purge.
          await this.detachUsersForChurchPurge(tx, userIds);
          await tx.church.delete({ where: { id: churchId } });
        },
        { timeout: 120_000 },
      );
    } catch (err) {
      const detail =
        err instanceof Prisma.PrismaClientKnownRequestError
          ? `${err.code}${err.meta ? ` ${JSON.stringify(err.meta)}` : ''}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      this.logger.error(`Permanent delete failed for church ${churchId}: ${detail}`);
      throw new BadRequestException(
        `Could not permanently delete this tenant (${detail.slice(0, 280)}). Deactivate it instead if you need to retain data.`,
      );
    }

    const storage = await this.uploads.deleteChurchStorage(churchId);

    this.logger.warn(
      `PLATFORM PURGE by ${actor.email} (${actor.userId}): church=${church.slug} (${church.id}) ` +
        `users=${users.length} members=${memberCount} emails=[${emailKeys.join(', ')}] ` +
        `uploadsRemoved=${storage.removed.length}`,
    );

    return {
      id: churchId,
      slug: church.slug,
      name: church.name,
      permanentlyDeleted: true,
      usersRemoved: users.length,
      membersRemoved: memberCount,
      emailsRemoved: emailKeys,
      uploadsCleaned: storage.removed.length > 0,
    };
  }

  /**
   * Platform admin updates a tenant staff user's login email.
   * Login looks up users by email globally, so uniqueness is enforced across all churches.
   */
  async updateTenantUserEmail(
    churchId: string,
    userId: string,
    dto: UpdateTenantUserEmailDto,
    actor: { userId: string; email: string },
  ) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { id: true, name: true, slug: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found in this tenant');

    const roleNames = user.roles.map((r) => r.role.name);
    if (roleNames.includes('PLATFORM_ADMIN')) {
      throw new BadRequestException('Cannot change a platform admin email from tenant tools');
    }

    const nextEmail = dto.email.toLowerCase().trim();
    if (nextEmail !== user.email.toLowerCase()) {
      const taken = await this.prisma.user.findFirst({
        where: {
          email: { equals: nextEmail, mode: 'insensitive' },
          id: { not: userId },
        },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Email already in use');

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { email: nextEmail },
        });
        await tx.member.updateMany({
          where: { userId },
          data: { email: nextEmail },
        });
      });

      this.logger.log(
        `Platform admin ${actor.email} changed tenant user email ${user.email} → ${nextEmail} (church ${church.slug})`,
      );
    }

    const updated = await this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        mustChangePassword: true,
        roles: { include: { role: { select: { name: true, description: true } } } },
        member: { select: { id: true, status: true } },
      },
    });
    if (!updated) throw new NotFoundException('User not found after email update');
    return this.mapStaffUser(updated);
  }

  /**
   * Platform admin sets or regenerates a tenant user's password.
   * Always scoped to the church; cannot target PLATFORM_ADMIN accounts.
   */
  async resetTenantUserPassword(
    churchId: string,
    userId: string,
    dto: ResetTenantUserPasswordDto,
    actor: { userId: string; email: string },
  ) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { id: true, name: true, slug: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found in this tenant');
    if (!user.isActive) throw new BadRequestException('Cannot reset password for an inactive user');

    const roleNames = user.roles.map((r) => r.role.name);
    if (roleNames.includes('PLATFORM_ADMIN')) {
      throw new BadRequestException('Cannot reset a platform admin password from tenant tools');
    }

    const custom = dto.newPassword?.trim() || '';
    const generated = !custom;
    const plainPassword = custom || randomBytes(9).toString('base64url').slice(0, 12);
    if (plainPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const mustChangePassword = dto.mustChangePassword ?? true;
    const notifyUser = dto.notifyUser ?? true;
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.loginFailureBucket.deleteMany({
      where: { emailKey: user.email.trim().toLowerCase() },
    });

    let emailSent = false;
    if (notifyUser) {
      const appUrl =
        process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
      const loginUrl = `${appUrl}/login?church=${encodeURIComponent(church.slug)}`;
      const subject = `Your Church_Hub password was reset — ${church.name}`;
      const body = [
        `Hi ${user.firstName},`,
        '',
        `A Church_Hub platform administrator reset the password for your account at ${church.name}.`,
        '',
        `Email: ${user.email}`,
        `Temporary password: ${plainPassword}`,
        '',
        `Sign in: ${loginUrl}`,
        mustChangePassword
          ? 'You will be asked to choose a new password the first time you sign in.'
          : 'You can sign in with this password right away.',
        '',
        'If you did not expect this change, contact your church administrator.',
      ].join('\n');

      try {
        await this.email.send({
          churchId: church.id,
          to: user.email,
          subject,
          body,
          html: `<p>Hi ${user.firstName},</p>
<p>A Church_Hub platform administrator reset the password for your account at <strong>${church.name}</strong>.</p>
<p><strong>Email:</strong> ${user.email}<br/>
<strong>Temporary password:</strong> <code>${plainPassword}</code></p>
<p><a href="${loginUrl}">Sign in to Church_Hub</a></p>
<p>${
            mustChangePassword
              ? 'You will be asked to choose a new password the first time you sign in.'
              : 'You can sign in with this password right away.'
          }</p>
<p style="color:#64748b;font-size:13px;">If you did not expect this change, contact your church administrator.</p>`,
        });
        emailSent = true;
      } catch (err) {
        this.logger.warn(
          `Password reset email failed for ${user.email}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    this.logger.log(
      `Platform admin ${actor.email} reset password for tenant user ${user.email} (church ${church.slug})`,
    );

    return {
      success: true,
      userId: user.id,
      email: user.email,
      mustChangePassword,
      emailSent,
      /** Only returned when a temporary password was generated (so the operator can copy it). */
      temporaryPassword: generated ? plainPassword : undefined,
    };
  }

  private mapStaffUser(u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    mustChangePassword: boolean;
    roles: { role: { name: string; description: string | null } }[];
    member: { id: string; status: string } | null;
  }) {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      mustChangePassword: u.mustChangePassword,
      roles: u.roles.map((r) => ({
        name: r.role.name,
        description: r.role.description,
      })),
      memberId: u.member?.id ?? null,
      memberStatus: u.member?.status ?? null,
    };
  }
}

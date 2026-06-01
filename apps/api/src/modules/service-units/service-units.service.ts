import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { SERVICE_UNIT_CATALOG } from '../../../prisma/service-unit-catalog';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ModuleAccessService, UserMemberContext } from '../access/module-access.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { MembershipService } from '../membership/membership.service';
import type { AssignServiceUnitMemberDto, UpdateServiceUnitMemberDto } from './dto/assign-service-unit-member.dto';

const unitInclude = {
  members: {
    include: {
      member: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
    },
  },
  leaders: {
    include: {
      member: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
    },
  },
  meetings: { orderBy: { startsAt: 'asc' as const } },
  meetingSummaries: {
    orderBy: { meetingDate: 'desc' as const },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  presence: true,
  _count: { select: { members: true, posts: true, meetings: true } },
};

@Injectable()
export class ServiceUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly moduleAccess: ModuleAccessService,
    private readonly email: EmailAdapter,
    private readonly membership: MembershipService,
  ) {}

  private async ensureCatalogUnits(churchId: string) {
    const activeCount = await this.prisma.serviceUnit.count({
      where: { churchId, isActive: true },
    });
    if (activeCount > 0) return;

    for (const unit of SERVICE_UNIT_CATALOG) {
      const existing = await this.prisma.serviceUnit.findFirst({
        where: { churchId, name: unit.name },
      });
      if (existing) {
        await this.prisma.serviceUnit.update({
          where: { id: existing.id },
          data: {
            description: unit.description,
            activities: unit.activities,
            isActive: true,
          },
        });
      } else {
        await this.prisma.serviceUnit.create({
          data: {
            churchId,
            name: unit.name,
            description: unit.description,
            activities: unit.activities,
          },
        });
      }
    }
  }

  async listUnits(churchId: string) {
    await this.ensureCatalogUnits(churchId);
    return this.prisma.serviceUnit.findMany({
      where: { churchId, isActive: true },
      include: {
        leaders: {
          include: {
            member: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        presence: { where: { isOnline: true } },
        _count: { select: { members: true, meetings: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getUnit(churchId: string, id: string) {
    const unit = await this.prisma.serviceUnit.findFirst({
      where: { id, churchId },
      include: unitInclude,
    });
    if (!unit) throw new NotFoundException('Service unit not found');
    return unit;
  }

  async checkUnitAccess(userId: string, churchId: string, serviceUnitId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) {
      return {
        canView: false,
        canManage: false,
        canManageLeaders: false,
        canLead: false,
        canViewFeedbacks: false,
        canSubmitReport: false,
        memberId: null,
        isChurchStaff: false,
        pendingJoinRequest: null,
      };
    }
    const canLeadUnit =
      ctx.unitAdminUnitIds.includes(serviceUnitId) ||
      ctx.unitLeaderUnitIds.includes(serviceUnitId);
    const canManageUnit = this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId);
    const canLead = canManageUnit || canLeadUnit;
    const canView = await this.moduleAccess.canViewServiceUnit(ctx, serviceUnitId);
    const canSubmit =
      canManageUnit ||
      ctx.unitMembershipIds.includes(serviceUnitId) ||
      ctx.unitLeaderUnitIds.includes(serviceUnitId);
    return {
      canView,
      canManage: canView && canManageUnit,
      canManageLeaders: canView && this.moduleAccess.canManageUnitLeaders(ctx, serviceUnitId),
      canLead: canView && canLead,
      /** Reports + Feedbacks hub — unit leader / unit admin only */
      canViewFeedbacks: canView && canLeadUnit,
      canSubmitReport: canView && canLeadUnit,
      memberId: ctx.memberId,
      isChurchStaff: this.moduleAccess.isChurchStaff(ctx),
      pendingJoinRequest: ctx.memberId
        ? await this.prisma.serviceUnitJoinRequest.findFirst({
            where: {
              serviceUnitId,
              memberId: ctx.memberId,
              status: 'PENDING',
            },
          })
        : null,
    };
  }

  async getUnitForUser(userId: string, churchId: string, id: string) {
    const access = await this.checkUnitAccess(userId, churchId, id);
    if (!access.canView) {
      throw new ForbiddenException('You are not a member of this service unit');
    }
    const unit = await this.getUnit(churchId, id);
    return { ...unit, access };
  }

  async submitJoinRequest(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      motivation?: string;
      memberId?: string;
    },
  ) {
    await this.getUnit(churchId, serviceUnitId);
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    const memberId = data.memberId ?? ctx?.memberId ?? undefined;

    if (memberId) {
      const existingMember = await this.prisma.serviceUnitMember.findUnique({
        where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      });
      if (existingMember) {
        throw new BadRequestException('Already a member of this unit');
      }
      const pending = await this.prisma.serviceUnitJoinRequest.findFirst({
        where: { serviceUnitId, memberId, status: 'PENDING' },
      });
      if (pending) throw new BadRequestException('Join request already pending');
    }

    const request = await this.prisma.serviceUnitJoinRequest.create({
      data: {
        churchId,
        serviceUnitId,
        memberId,
        requesterUserId: userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        motivation: data.motivation,
      },
      include: { serviceUnit: { select: { name: true } } },
    });

    await this.notifyJoinRequestCreated(churchId, serviceUnitId, request);
    return request;
  }

  async notifyJoinRequestCreated(
    churchId: string,
    serviceUnitId: string,
    request: { id: string; firstName: string; lastName: string; serviceUnit: { name: string } },
  ) {
    await this.notifyUnitApprovers(churchId, serviceUnitId, request);
  }

  async listJoinRequests(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Only unit admins or church staff can review requests');
    }
    return this.prisma.serviceUnitJoinRequest.findMany({
      where: {
        serviceUnitId,
        churchId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewJoinRequest(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    requestId: string,
    approve: boolean,
  ) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Only unit admins or church staff can review requests');
    }

    const request = await this.prisma.serviceUnitJoinRequest.findFirst({
      where: { id: requestId, serviceUnitId, churchId, status: 'PENDING' },
    });
    if (!request) throw new NotFoundException('Join request not found');

    if (!approve) {
      return this.prisma.serviceUnitJoinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', reviewedById: userId, reviewedAt: new Date() },
      });
    }

    let memberId = request.memberId;
    if (!memberId) {
      const member = await this.prisma.member.create({
        data: {
          churchId,
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          phone: request.phone,
          status: 'VISITOR',
          roles: ['ADULT'],
          ministryInterests: [],
          gamification: { create: {} },
        },
      });
      memberId = member.id;
    }

    await this.prisma.serviceUnitMember.upsert({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      create: { serviceUnitId, memberId },
      update: {},
    });

    const updated = await this.prisma.serviceUnitJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedById: userId,
        reviewedAt: new Date(),
        memberId,
      },
      include: { serviceUnit: { select: { id: true, name: true } } },
    });

    await this.sendWelcomeEmail(churchId, serviceUnitId, {
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      unitName: updated.serviceUnit.name,
      requesterUserId: request.requesterUserId,
    });

    return updated;
  }

  async getEmailTemplate(churchId: string, serviceUnitId: string): Promise<{ subject: string; body: string }> {
    await this.getUnit(churchId, serviceUnitId);
    const emailTpl = (this.prisma as { serviceUnitEmailTemplate: { findUnique: (a: object) => Promise<{ subject: string; body: string } | null>; create: (a: object) => Promise<{ subject: string; body: string }> } }).serviceUnitEmailTemplate;
    let tpl = await emailTpl.findUnique({
      where: { serviceUnitId_type: { serviceUnitId, type: 'WELCOME' } },
    });
    if (!tpl) {
      tpl = await emailTpl.create({
        data: {
          churchId,
          serviceUnitId,
          type: 'WELCOME',
          subject: `Welcome to {{unitName}}`,
          body: `Dear {{firstName}},\n\nYou have been approved to join {{unitName}} at our church. We are glad to have you on the team.\n\nBlessings,\nChurch Hub`,
        },
      });
    }
    return tpl;
  }

  async upsertEmailTemplate(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: { subject: string; body: string },
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    return (this.prisma as { serviceUnitEmailTemplate: { upsert: (a: object) => Promise<unknown> } }).serviceUnitEmailTemplate.upsert({
      where: { serviceUnitId_type: { serviceUnitId, type: 'WELCOME' } },
      create: {
        churchId,
        serviceUnitId,
        type: 'WELCOME',
        subject: data.subject,
        body: data.body,
        updatedById: userId,
      },
      update: {
        subject: data.subject,
        body: data.body,
        updatedById: userId,
      },
    });
  }

  private applyTemplate(
    template: string,
    vars: Record<string, string>,
  ) {
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
      template,
    );
  }

  private async sendWelcomeEmail(
    churchId: string,
    serviceUnitId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string | null;
      unitName: string;
      requesterUserId?: string | null;
    },
  ) {
    const tpl = await this.getEmailTemplate(churchId, serviceUnitId);
    const vars = {
      firstName: data.firstName,
      lastName: data.lastName,
      unitName: data.unitName,
    };
    const subject = this.applyTemplate(tpl.subject, vars);
    const body = this.applyTemplate(tpl.body, vars);

    let to = data.email;
    if (!to && data.requesterUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.requesterUserId },
        select: { email: true },
      });
      to = user?.email;
    }

    if (to) {
      await this.email.send({ churchId, to, subject, body });
    }

    if (data.requesterUserId) {
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: data.requesterUserId,
          type: 'SERVICE_UNIT_WELCOME',
          title: `Welcome to ${data.unitName}`,
          body: `Your membership request was approved.`,
          data: { serviceUnitId },
        },
      });
    }
  }

  private async notifyUnitApprovers(
    churchId: string,
    serviceUnitId: string,
    request: { id: string; firstName: string; lastName: string; serviceUnit: { name: string } },
  ) {
    const unit = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId },
      include: {
        leaders: {
          where: { OR: [{ isUnitAdmin: true }, { isModerator: true }] },
          include: { member: { include: { user: true } } },
        },
      },
    });
    if (!unit) return;

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true, email: true },
    });

    const approverUserIds = new Set<string>(staffUsers.map((u) => u.id));
    for (const leader of unit.leaders) {
      if (leader.member.user?.id) approverUserIds.add(leader.member.user.id);
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const body = `${request.firstName} ${request.lastName} requested to join ${request.serviceUnit.name}.\n\nReview: ${appUrl}/dashboard/service-units/${serviceUnitId}`;

    for (const uid of approverUserIds) {
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: uid,
          type: 'SERVICE_UNIT_JOIN_REQUEST',
          title: `Join request: ${unit.name}`,
          body,
          data: { requestId: request.id, serviceUnitId },
        },
      });
    }
  }

  async listMeetingSummaries(userId: string, churchId: string, serviceUnitId: string) {
    const access = await this.checkUnitAccess(userId, churchId, serviceUnitId);
    if (!access.canView) {
      throw new ForbiddenException('You are not a member of this service unit');
    }
    return this.prisma.serviceUnitMeetingSummary.findMany({
      where: { serviceUnitId, churchId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { meetingDate: 'desc' },
    });
  }

  async createMeetingSummary(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: {
      title: string;
      body: string;
      meetingDate?: string;
      meetingId?: string;
      authorId: string;
    },
  ) {
    const ctx = await this.requireUnitManager(userId, churchId, serviceUnitId);
    if (!ctx.memberId && !this.moduleAccess.isChurchStaff(ctx)) {
      throw new ForbiddenException('Author member required');
    }
    await this.getUnit(churchId, serviceUnitId);
    return this.prisma.serviceUnitMeetingSummary.create({
      data: {
        churchId,
        serviceUnitId,
        title: data.title,
        body: data.body,
        meetingDate: data.meetingDate ? new Date(data.meetingDate) : undefined,
        meetingId: data.meetingId,
        authorId: data.authorId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateMeetingSummary(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    summaryId: string,
    data: Partial<{ title: string; body: string; meetingDate: string | null }>,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    const summary = await this.prisma.serviceUnitMeetingSummary.findFirst({
      where: { id: summaryId, serviceUnitId, churchId },
    });
    if (!summary) throw new NotFoundException('Meeting summary not found');
    return this.prisma.serviceUnitMeetingSummary.update({
      where: { id: summaryId },
      data: {
        ...data,
        meetingDate:
          data.meetingDate === null
            ? null
            : data.meetingDate
              ? new Date(data.meetingDate)
              : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async deleteMeetingSummary(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    summaryId: string,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    const summary = await this.prisma.serviceUnitMeetingSummary.findFirst({
      where: { id: summaryId, serviceUnitId, churchId },
    });
    if (!summary) throw new NotFoundException('Meeting summary not found');
    return this.prisma.serviceUnitMeetingSummary.delete({ where: { id: summaryId } });
  }

  private async requireUnitManager(
    userId: string,
    churchId: string,
    serviceUnitId: string,
  ): Promise<UserMemberContext> {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Service unit admin or church staff required');
    }
    return ctx;
  }

  createUnit(
    churchId: string,
    data: { name: string; description?: string; activities?: string; imageUrl?: string },
  ) {
    return this.prisma.serviceUnit.create({ data: { churchId, ...data } });
  }

  async updateUnit(
    churchId: string,
    id: string,
    data: Partial<{ name: string; description: string; activities: string; imageUrl: string; isActive: boolean }>,
  ) {
    await this.getUnit(churchId, id);
    return this.prisma.serviceUnit.update({ where: { id }, data });
  }

  async deleteUnit(churchId: string, id: string) {
    await this.getUnit(churchId, id);
    return this.prisma.serviceUnit.update({ where: { id }, data: { isActive: false } });
  }

  async addMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: AssignServiceUnitMemberDto,
  ) {
    return this.assignUnitMember(userId, churchId, serviceUnitId, body);
  }

  async updateUnitMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    memberId: string,
    body: UpdateServiceUnitMemberDto,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const profile: Parameters<MembershipService['updateMember']>[2] = {};
    if (body.firstName !== undefined) profile.firstName = body.firstName.trim();
    if (body.lastName !== undefined) profile.lastName = body.lastName.trim();
    if (body.email !== undefined) profile.email = body.email.trim() || undefined;
    if (body.phone !== undefined) profile.phone = body.phone.trim() || undefined;
    if (Object.keys(profile).length > 0) {
      await this.membership.updateMember(churchId, memberId, profile, userId);
    }

    const membership = await this.prisma.serviceUnitMember.findUnique({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
    });
    if (!membership) {
      throw new NotFoundException('Member is not in this service unit');
    }

    if (body.unitRole) {
      await this.applyUnitRole(serviceUnitId, memberId, body.unitRole, body.designation);
    } else if (body.designation !== undefined) {
      const leader = await this.prisma.serviceUnitLeader.findUnique({
        where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      });
      if (leader?.isUnitAdmin) {
        await this.prisma.serviceUnitLeader.update({
          where: { id: leader.id },
          data: { role: body.designation.trim() || 'LEADER' },
        });
      }
    }

    return this.getUnitMemberRow(churchId, serviceUnitId, memberId);
  }

  async removeMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    memberId: string,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    const membership = await this.prisma.serviceUnitMember.findUnique({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
    });
    if (!membership) throw new NotFoundException('Member is not in this service unit');

    await this.prisma.serviceUnitLeader.deleteMany({ where: { serviceUnitId, memberId } });
    await this.prisma.serviceUnitMember.deleteMany({ where: { serviceUnitId, memberId } });
    return { removed: true, memberId };
  }

  private async assignUnitMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: AssignServiceUnitMemberDto,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    let memberId = body.memberId?.trim();
    if (!memberId) {
      const firstName = body.firstName?.trim();
      const lastName = body.lastName?.trim();
      if (!firstName || !lastName) {
        throw new BadRequestException('Provide memberId or first and last name for a new member');
      }
      const email = body.email?.trim() || undefined;
      if (email) {
        const existing = await this.prisma.member.findFirst({
          where: { churchId, email },
          select: { id: true },
        });
        if (existing) {
          memberId = existing.id;
        }
      }
      if (!memberId) {
        const created = await this.membership.createMember(churchId, {
          firstName,
          lastName,
          email,
          phone: body.phone?.trim() || undefined,
          status: 'ACTIVE_MEMBER',
          startOnboarding: false,
        });
        memberId = created.id;
      }
    } else {
      const exists = await this.prisma.member.findFirst({
        where: { id: memberId, churchId },
      });
      if (!exists) throw new NotFoundException('Member not found in this church');
    }

    if (!memberId) {
      throw new BadRequestException('Could not resolve member for this service unit');
    }

    const unitRole = body.unitRole ?? 'MEMBER';
    await this.applyUnitRole(serviceUnitId, memberId, unitRole, body.designation);
    return this.getUnitMemberRow(churchId, serviceUnitId, memberId);
  }

  private async applyUnitRole(
    serviceUnitId: string,
    memberId: string,
    unitRole: 'MEMBER' | 'UNIT_ADMIN',
    designation?: string,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member id is required');
    }
    await this.prisma.serviceUnitMember.upsert({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      create: { serviceUnitId, memberId },
      update: {},
    });

    if (unitRole === 'UNIT_ADMIN') {
      await this.prisma.serviceUnitLeader.upsert({
        where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
        create: {
          serviceUnitId,
          memberId,
          role: designation?.trim() || 'LEADER',
          isModerator: true,
          isUnitAdmin: true,
        },
        update: {
          isUnitAdmin: true,
          role: designation?.trim() || 'LEADER',
        },
      });
    } else {
      await this.prisma.serviceUnitLeader.deleteMany({
        where: { serviceUnitId, memberId },
      });
    }
  }

  private async getUnitMemberRow(churchId: string, serviceUnitId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const leader = await this.prisma.serviceUnitLeader.findUnique({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
    });

    return {
      memberId,
      member,
      unitRole: leader?.isUnitAdmin ? ('UNIT_ADMIN' as const) : ('MEMBER' as const),
      designation: leader?.role ?? null,
      leaderId: leader?.id ?? null,
    };
  }

  async listUnitMembers(userId: string, churchId: string, serviceUnitId: string) {
    const access = await this.checkUnitAccess(userId, churchId, serviceUnitId);
    if (!access.canView) {
      throw new ForbiddenException('You are not a member of this service unit');
    }
    await this.getUnit(churchId, serviceUnitId);

    const rows = await this.prisma.serviceUnitMember.findMany({
      where: { serviceUnitId },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const leaders = await this.prisma.serviceUnitLeader.findMany({
      where: { serviceUnitId },
    });
    const leaderByMember = new Map(leaders.map((l) => [l.memberId, l]));

    return rows.map((row) => {
      const leader = leaderByMember.get(row.memberId);
      return {
        memberId: row.memberId,
        joinedAt: row.joinedAt.toISOString(),
        member: row.member,
        unitRole: leader?.isUnitAdmin ? ('UNIT_ADMIN' as const) : ('MEMBER' as const),
        designation: leader?.role ?? null,
        leaderId: leader?.id ?? null,
      };
    });
  }

  async addLeader(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: {
      memberId: string;
      role?: string;
      isModerator?: boolean;
      isUnitAdmin?: boolean;
    },
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);
    await this.prisma.serviceUnitMember.upsert({
      where: {
        serviceUnitId_memberId: { serviceUnitId, memberId: data.memberId },
      },
      create: { serviceUnitId, memberId: data.memberId },
      update: {},
    });
    return this.prisma.serviceUnitLeader.upsert({
      where: {
        serviceUnitId_memberId: { serviceUnitId, memberId: data.memberId },
      },
      create: {
        serviceUnitId,
        memberId: data.memberId,
        role: data.role ?? 'LEADER',
        isModerator: data.isModerator ?? false,
        isUnitAdmin: data.isUnitAdmin ?? false,
      },
      update: {
        role: data.role ?? undefined,
        isModerator: data.isModerator ?? undefined,
        isUnitAdmin: data.isUnitAdmin ?? undefined,
      },
      include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async removeLeader(churchId: string, serviceUnitId: string, leaderId: string) {
    await this.getUnit(churchId, serviceUnitId);
    const leader = await this.prisma.serviceUnitLeader.findFirst({
      where: { id: leaderId, serviceUnitId },
    });
    if (!leader) throw new NotFoundException('Leader not found');
    return this.prisma.serviceUnitLeader.delete({ where: { id: leaderId } });
  }

  listMeetings(churchId: string, serviceUnitId: string) {
    return this.getUnit(churchId, serviceUnitId).then((u) => u.meetings);
  }

  async createMeeting(
    churchId: string,
    serviceUnitId: string,
    data: {
      title: string;
      description?: string;
      location?: string;
      startsAt: string;
      endsAt?: string;
    },
  ) {
    await this.getUnit(churchId, serviceUnitId);
    return this.prisma.serviceUnitMeeting.create({
      data: {
        churchId,
        serviceUnitId,
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    });
  }

  async updateMeeting(
    churchId: string,
    serviceUnitId: string,
    meetingId: string,
    data: Partial<{
      title: string;
      description: string;
      location: string;
      startsAt: string;
      endsAt: string;
    }>,
  ) {
    await this.getUnit(churchId, serviceUnitId);
    const meeting = await this.prisma.serviceUnitMeeting.findFirst({
      where: { id: meetingId, serviceUnitId, churchId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return this.prisma.serviceUnitMeeting.update({
      where: { id: meetingId },
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    });
  }

  async deleteMeeting(churchId: string, serviceUnitId: string, meetingId: string) {
    await this.getUnit(churchId, serviceUnitId);
    const meeting = await this.prisma.serviceUnitMeeting.findFirst({
      where: { id: meetingId, serviceUnitId, churchId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return this.prisma.serviceUnitMeeting.delete({ where: { id: meetingId } });
  }

  async listPosts(churchId: string, serviceUnitId: string) {
    await this.getUnit(churchId, serviceUnitId);
    return this.prisma.serviceUnitPost.findMany({
      where: { serviceUnitId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createPost(
    churchId: string,
    serviceUnitId: string,
    data: { authorId: string; title?: string; body: string },
  ) {
    await this.getUnit(churchId, serviceUnitId);
    return this.prisma.serviceUnitPost.create({
      data: { serviceUnitId, authorId: data.authorId, title: data.title, body: data.body },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: true,
      },
    });
  }

  async updatePost(
    churchId: string,
    serviceUnitId: string,
    postId: string,
    data: Partial<{ title: string; body: string; isPinned: boolean; isLocked: boolean }>,
    moderatorMemberId?: string,
  ) {
    await this.getUnit(churchId, serviceUnitId);
    const post = await this.prisma.serviceUnitPost.findFirst({ where: { id: postId, serviceUnitId } });
    if (!post) throw new NotFoundException('Post not found');

    const isModerator = moderatorMemberId
      ? await this.isModerator(serviceUnitId, moderatorMemberId)
      : false;
    if (post.isLocked && !isModerator) {
      throw new ForbiddenException('This discussion is locked');
    }

    return this.prisma.serviceUnitPost.update({
      where: { id: postId },
      data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async deletePost(churchId: string, serviceUnitId: string, postId: string) {
    await this.getUnit(churchId, serviceUnitId);
    const post = await this.prisma.serviceUnitPost.findFirst({ where: { id: postId, serviceUnitId } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.serviceUnitPost.delete({ where: { id: postId } });
  }

  async createReply(
    churchId: string,
    serviceUnitId: string,
    postId: string,
    data: { authorId: string; body: string },
  ) {
    await this.getUnit(churchId, serviceUnitId);
    const post = await this.prisma.serviceUnitPost.findFirst({ where: { id: postId, serviceUnitId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.isLocked) {
      const isMod = await this.isModerator(serviceUnitId, data.authorId);
      if (!isMod) throw new ForbiddenException('This discussion is locked');
    }

    return this.prisma.serviceUnitPostReply.create({
      data: { postId, authorId: data.authorId, body: data.body },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async deleteReply(churchId: string, serviceUnitId: string, replyId: string) {
    await this.getUnit(churchId, serviceUnitId);
    const reply = await this.prisma.serviceUnitPostReply.findFirst({
      where: { id: replyId, post: { serviceUnitId } },
    });
    if (!reply) throw new NotFoundException('Reply not found');
    return this.prisma.serviceUnitPostReply.delete({ where: { id: replyId } });
  }

  async heartbeatPresence(serviceUnitId: string, memberId: string) {
    const record = await this.prisma.serviceUnitPresence.upsert({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      create: { serviceUnitId, memberId, isOnline: true, lastSeenAt: new Date() },
      update: { isOnline: true, lastSeenAt: new Date() },
    });
    this.realtime.setMemberOnline(serviceUnitId, memberId);
    return record;
  }

  async setOffline(serviceUnitId: string, memberId: string) {
    await this.prisma.serviceUnitPresence.updateMany({
      where: { serviceUnitId, memberId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });
    this.realtime.setMemberOffline(serviceUnitId, memberId);
  }

  getOnlineMembers(serviceUnitId: string) {
    return this.realtime.getOnlineMembers(serviceUnitId);
  }

  private async isModerator(serviceUnitId: string, memberId: string) {
    const leader = await this.prisma.serviceUnitLeader.findFirst({
      where: { serviceUnitId, memberId, isModerator: true },
    });
    return !!leader;
  }
}

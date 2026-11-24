import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ChoirAttendanceEventType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import { SERVICE_UNIT_CATALOG } from '../../../prisma/service-unit-catalog';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ModuleAccessService, UserMemberContext } from '../access/module-access.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { trySendWhatsApp } from '../notifications/try-send-whatsapp';
import { MembershipService } from '../membership/membership.service';
import { MembershipRegistryService } from '../membership/membership-registry.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { AuthService } from '../auth/auth.service';
import { AutomationEmailTemplatesService } from '../automation/automation-email-templates.service';
import type { AssignServiceUnitMemberDto, UpdateServiceUnitMemberDto } from './dto/assign-service-unit-member.dto';
import type {
  CreateServiceUnitDto,
  CreateServiceUnitWithSetupDto,
  ServiceUnitPersonInputDto,
} from './dto/create-service-unit.dto';
import {
  getUnitMemberImportTemplateCsv,
  parseUnitMemberImportFile,
} from './service-units-member-import.util';
import {
  isUnitDeputyRole,
  normalizeUnitLeaderRole,
  unitRoleFromLeader,
  type UnitDeputyRole,
} from './service-unit-leader-roles';

/** Holding unit for members/records moved off deleted service units. */
export const UNCATEGORIZED_UNIT_NAME = 'Uncategorized';

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
  private readonly logger = new Logger(ServiceUnitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly moduleAccess: ModuleAccessService,
    private readonly email: EmailAdapter,
    private readonly membership: MembershipService,
    private readonly registry: MembershipRegistryService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly auth: AuthService,
    private readonly emailTemplates: AutomationEmailTemplatesService,
    private readonly sms: SmsAdapter,
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

  async listUnits(churchId: string, q?: string) {
    await this.ensureCatalogUnits(churchId);
    const query = q?.trim().slice(0, 100);
    return this.prisma.serviceUnit.findMany({
      where: {
        churchId,
        isActive: true,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
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

  /** Suggest active unit names for admin search autosuggest. */
  async suggestUnits(churchId: string, q: string, limit = 12) {
    const query = q.trim().slice(0, 100);
    if (!query) return [];
    await this.ensureCatalogUnits(churchId);
    return this.prisma.serviceUnit.findMany({
      where: {
        churchId,
        isActive: true,
        name: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 25),
    });
  }

  async ensureUncategorizedUnit(churchId: string) {
    const existing = await this.prisma.serviceUnit.findFirst({
      where: {
        churchId,
        name: { equals: UNCATEGORIZED_UNIT_NAME, mode: 'insensitive' },
      },
    });
    if (existing) {
      if (!existing.isActive) {
        return this.prisma.serviceUnit.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            name: UNCATEGORIZED_UNIT_NAME,
            description:
              existing.description ??
              'Holding place for members and records from deleted units.',
          },
        });
      }
      return existing;
    }
    return this.prisma.serviceUnit.create({
      data: {
        churchId,
        name: UNCATEGORIZED_UNIT_NAME,
        description: 'Holding place for members and records from deleted units.',
        isActive: true,
      },
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
      phone: request.phone,
      unitName: updated.serviceUnit.name,
      requesterUserId: request.requesterUserId,
    });

    return updated;
  }

  async getEmailTemplate(
    userId: string,
    churchId: string,
    serviceUnitId: string,
  ): Promise<{ subject: string; body: string }> {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    return this.loadWelcomeEmailTemplate(churchId, serviceUnitId);
  }

  private async loadWelcomeEmailTemplate(
    churchId: string,
    serviceUnitId: string,
  ): Promise<{ subject: string; body: string }> {
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
    const subject = data.subject?.trim();
    const body = data.body?.trim();
    if (!subject || !body) {
      throw new BadRequestException('Email subject and body are required');
    }
    if (subject.length > 200 || body.length > 20_000) {
      throw new BadRequestException('Email template exceeds allowed length');
    }
    return (this.prisma as { serviceUnitEmailTemplate: { upsert: (a: object) => Promise<unknown> } }).serviceUnitEmailTemplate.upsert({
      where: { serviceUnitId_type: { serviceUnitId, type: 'WELCOME' } },
      create: {
        churchId,
        serviceUnitId,
        type: 'WELCOME',
        subject,
        body,
        updatedById: userId,
      },
      update: {
        subject,
        body,
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
      phone?: string | null;
      unitName: string;
      requesterUserId?: string | null;
    },
  ) {
    const tpl = await this.loadWelcomeEmailTemplate(churchId, serviceUnitId);
    const vars = {
      firstName: data.firstName,
      lastName: data.lastName,
      unitName: data.unitName,
    };
    const subject = this.applyTemplate(tpl.subject, vars);
    const body = this.applyTemplate(tpl.body, vars);

    let to = data.email;
    let phone = data.phone;
    if (data.requesterUserId && (!to || !phone)) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.requesterUserId },
        select: { email: true, phone: true },
      });
      if (!to) to = user?.email;
      if (!phone) phone = user?.phone;
    }

    if (to) {
      await this.email.send({ churchId, to, subject, body });
    }

    await trySendWhatsApp(this.sms, this.logger, {
      to: phone,
      body: `${subject}\n\n${body}`,
      churchId,
      label: 'Unit join welcome',
    });

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
      authorId?: string;
    },
  ) {
    const ctx = await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    const authorId = await this.resolveSummaryAuthorId(
      churchId,
      userId,
      data.authorId?.trim(),
      ctx,
    );

    const meetingId = data.meetingId?.trim() || null;
    if (meetingId) {
      const meeting = await this.prisma.serviceUnitMeeting.findFirst({
        where: { id: meetingId, churchId, serviceUnitId },
      });
      if (!meeting) throw new NotFoundException('Linked meeting not found');
    }

    let meetingDate: Date | undefined;
    if (data.meetingDate) {
      const parsed = new Date(data.meetingDate);
      if (!Number.isNaN(parsed.getTime())) meetingDate = parsed;
    }

    const row = await this.prisma.serviceUnitMeetingSummary.create({
      data: {
        churchId,
        serviceUnitId,
        title: data.title.trim(),
        body: data.body.trim(),
        meetingDate,
        meetingId,
        authorId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        serviceUnit: { select: { id: true, name: true } },
      },
    });

    try {
      await this.notifyLeadershipOfMeetingSummary(churchId, serviceUnitId, row);
    } catch (err) {
      // Summary is already saved — do not fail Publish if notify fails.
      console.warn(
        `Meeting summary notify failed for ${row.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
    return row;
  }

  /** Ensure Publish always has a valid Member author (staff without congregant get a stub). */
  private async resolveSummaryAuthorId(
    churchId: string,
    userId: string,
    preferredMemberId: string | undefined,
    ctx: UserMemberContext,
  ): Promise<string> {
    // Never trust a client-supplied authorId for another person — only the caller's member.
    if (preferredMemberId && ctx.memberId && preferredMemberId === ctx.memberId) {
      return ctx.memberId;
    }
    if (preferredMemberId && preferredMemberId !== ctx.memberId) {
      throw new ForbiddenException('Cannot publish a meeting summary as another member');
    }
    if (ctx.memberId) return ctx.memberId;

    const linked = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    if (linked) return linked.id;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) {
      throw new BadRequestException('User not found in this church');
    }

    if (user.email) {
      const byEmail = await this.prisma.member.findFirst({
        where: { churchId, email: { equals: user.email, mode: 'insensitive' } },
        select: { id: true, userId: true },
      });
      if (byEmail) {
        if (!byEmail.userId) {
          await this.prisma.member.update({
            where: { id: byEmail.id },
            data: { userId: user.id },
          });
        }
        return byEmail.id;
      }
    }

    const created = await this.prisma.member.create({
      data: {
        churchId,
        userId: user.id,
        firstName: user.firstName?.trim() || 'Staff',
        lastName: user.lastName?.trim() || 'User',
        email: user.email,
        status: 'ACTIVE_MEMBER',
      },
    });
    return created.id;
  }

  private async notifyLeadershipOfMeetingSummary(
    churchId: string,
    serviceUnitId: string,
    row: {
      id: string;
      title: string;
      body: string;
      meetingDate: Date | null;
      createdAt: Date;
      author: { firstName: string; lastName: string };
      serviceUnit: { name: string };
    },
  ) {
    const dateLabel = row.meetingDate
      ? row.meetingDate.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : new Date(row.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
    const unitName = row.serviceUnit.name;
    const authorName = `${row.author.firstName} ${row.author.lastName}`.trim();
    const timestamp = new Date().toISOString();
    const title = `[Meeting Summary] ${unitName} — ${row.title}`;
    const body = [
      `Service Unit: ${unitName}`,
      `Title: ${row.title}`,
      `Date: ${dateLabel}`,
      `Author: ${authorName}`,
      `Timestamp: ${timestamp}`,
      ``,
      row.body,
    ].join('\n');

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title,
        body,
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        targetUserId: staff.id,
        metadata: {
          reportType: 'Meeting Summary',
          serviceUnitId,
          serviceUnitName: unitName,
          summaryId: row.id,
          date: dateLabel,
          timestamp,
        },
      });
    }
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
    // Tenant bind first — church staff must not manage foreign-church unit UUIDs.
    await this.getUnit(churchId, serviceUnitId);
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Service unit admin or church staff required');
    }
    return ctx;
  }

  createUnit(churchId: string, data: CreateServiceUnitDto) {
    const name = data.name.trim();
    if (!name) throw new BadRequestException('Unit name is required');
    return this.prisma.serviceUnit.create({
      data: {
        churchId,
        name,
        description: data.description?.trim() || undefined,
        activities: data.activities?.trim() || undefined,
        imageUrl: data.imageUrl?.trim() || undefined,
      },
    });
  }

  getMemberImportTemplateCsv(): string {
    return getUnitMemberImportTemplateCsv();
  }

  /** Parse/validate a unit-member CSV or .xlsx without writing (wizard staging). */
  async previewMemberImportCsv(file: { buffer: Buffer; originalname?: string }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV or Excel (.xlsx) file is required');
    }
    const { rows, failures } = await parseUnitMemberImportFile(
      file.buffer,
      file.originalname,
    );
    if (!rows.length && failures.length) {
      throw new BadRequestException(failures[0]?.reason ?? 'Could not parse file');
    }
    return {
      rowCount: rows.length,
      rows: rows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
      })),
      failures,
    };
  }

  /**
   * Create a unit and optionally attach members + one unit admin in one staff action.
   * Rolls back the new unit (hard delete) if member/leader attachment fails mid-way.
   */
  async createUnitWithSetup(
    userId: string,
    churchId: string,
    data: CreateServiceUnitWithSetupDto,
  ) {
    const unit = await this.createUnit(churchId, data);
    const members: Awaited<ReturnType<ServiceUnitsService['assignUnitMember']>>[] = [];
    let leader: Awaited<ReturnType<ServiceUnitsService['assignUnitMember']>> | null = null;

    try {
      for (const person of data.members ?? []) {
        members.push(
          await this.assignUnitMember(userId, churchId, unit.id, {
            ...this.personToAssignDto(person),
            unitRole: 'MEMBER',
          }),
        );
      }

      if (data.leader) {
        leader = await this.assignUnitMember(userId, churchId, unit.id, {
          ...this.personToAssignDto(data.leader),
          unitRole: 'UNIT_ADMIN',
        });
      }

      return { unit, members, leader };
    } catch (err) {
      await this.prisma.$transaction(async (tx) => {
        await tx.serviceUnitLeader.deleteMany({ where: { serviceUnitId: unit.id } });
        await tx.serviceUnitMember.deleteMany({ where: { serviceUnitId: unit.id } });
        await tx.serviceUnit.delete({ where: { id: unit.id } });
      });
      throw err;
    }
  }

  private personToAssignDto(person: ServiceUnitPersonInputDto): AssignServiceUnitMemberDto {
    return {
      memberId: person.memberId,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
    };
  }

  /**
   * Import unit members from CSV or .xlsx. Church staff or unit admin.
   * Partial success: valid rows are applied; failures are listed per row.
   */
  async importMembersFromCsv(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    file: { buffer: Buffer; originalname?: string },
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV or Excel (.xlsx) file is required');
    }

    const { rows, failures } = await parseUnitMemberImportFile(
      file.buffer,
      file.originalname,
    );
    if (!rows.length && failures.length) {
      throw new BadRequestException(failures[0]?.reason ?? 'Could not parse file');
    }
    if (!rows.length) {
      throw new BadRequestException('File has no data rows');
    }

    const imported: Awaited<ReturnType<ServiceUnitsService['assignUnitMember']>>[] = [];
    const rowFailures = [...failures];

    for (const row of rows) {
      try {
        const result = await this.assignUnitMember(userId, churchId, serviceUnitId, {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          unitRole: 'MEMBER',
        });
        imported.push(result);
      } catch (err) {
        let reason = 'Could not import row';
        if (err instanceof BadRequestException || err instanceof ForbiddenException) {
          const res = err.getResponse();
          if (typeof res === 'string') reason = res;
          else if (res && typeof res === 'object' && 'message' in res) {
            const msg = (res as { message: string | string[] }).message;
            reason = Array.isArray(msg) ? msg.join(', ') : String(msg);
          } else if (err.message) reason = err.message;
        } else if (err instanceof Error) {
          reason = err.message;
        }
        rowFailures.push({ rowIndex: row.rowIndex, reason });
      }
    }

    return {
      importedCount: imported.length,
      failedCount: rowFailures.length,
      imported,
      failures: rowFailures,
    };
  }

  async updateUnit(
    userId: string,
    churchId: string,
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      activities: string | null;
      imageUrl: string | null;
      isActive: boolean;
    }>,
  ) {
    await this.requireUnitManager(userId, churchId, id);
    const patch: Prisma.ServiceUnitUpdateInput = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new BadRequestException('Unit name is required');
      patch.name = name;
    }
    if (data.description !== undefined) {
      patch.description = data.description?.trim() || null;
    }
    if (data.activities !== undefined) {
      patch.activities = data.activities?.trim() || null;
    }
    if (data.imageUrl !== undefined) {
      patch.imageUrl = data.imageUrl?.trim() || null;
    }
    if (data.isActive !== undefined) {
      // Soft-delete / restore is church-staff only (leaders manage content, not lifecycle).
      const ctx = await this.moduleAccess.resolveContext(userId, churchId);
      if (!ctx || !this.moduleAccess.isChurchStaff(ctx)) {
        throw new ForbiddenException('Only church staff can activate or deactivate a unit');
      }
      patch.isActive = data.isActive;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }
    return this.prisma.serviceUnit.update({
      where: { id },
      data: patch,
    });
  }

  /**
   * Soft-delete a unit. Members and related hub records are moved to Uncategorized
   * so nothing is orphaned when the unit leaves the active list.
   */
  async deleteUnit(churchId: string, id: string) {
    const unit = await this.getUnit(churchId, id);
    if (unit.name.trim().toLowerCase() === UNCATEGORIZED_UNIT_NAME.toLowerCase()) {
      throw new BadRequestException('The Uncategorized unit cannot be deleted');
    }

    const uncategorized = await this.ensureUncategorizedUnit(churchId);
    if (uncategorized.id === id) {
      throw new BadRequestException('The Uncategorized unit cannot be deleted');
    }

    return this.prisma.$transaction(
      async (tx) => {
        await this.reassignUnitDataToUncategorized(tx as never, churchId, id, uncategorized.id);
        return tx.serviceUnit.update({
          where: { id },
          data: { isActive: false },
        });
      },
      { timeout: 60_000 },
    );
  }

  private async reassignUnitDataToUncategorized(
    db: Prisma.TransactionClient,
    churchId: string,
    fromUnitId: string,
    toUnitId: string,
  ) {

    const members = await db.serviceUnitMember.findMany({
      where: { serviceUnitId: fromUnitId },
      select: { memberId: true },
    });
    const leaders = await db.serviceUnitLeader.findMany({
      where: { serviceUnitId: fromUnitId },
      select: { memberId: true },
    });
    const memberIds = [
      ...new Set([...members.map((m) => m.memberId), ...leaders.map((l) => l.memberId)]),
    ];

    if (memberIds.length) {
      const already = await db.serviceUnitMember.findMany({
        where: { serviceUnitId: toUnitId, memberId: { in: memberIds } },
        select: { memberId: true },
      });
      const have = new Set(already.map((a) => a.memberId));
      const toCreate = memberIds.filter((id) => !have.has(id));
      if (toCreate.length) {
        await db.serviceUnitMember.createMany({
          data: toCreate.map((memberId) => ({ serviceUnitId: toUnitId, memberId })),
          skipDuplicates: true,
        });
      }
    }

    await db.serviceUnitMember.deleteMany({ where: { serviceUnitId: fromUnitId } });
    await db.serviceUnitLeader.deleteMany({ where: { serviceUnitId: fromUnitId } });
    await db.serviceUnitPresence.deleteMany({ where: { serviceUnitId: fromUnitId } });

    await db.serviceUnitMeeting.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.serviceUnitMeetingSummary.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.serviceUnitPost.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.serviceUnitJoinRequest.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.chatChannel.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.rtpRequest.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.communicationQueueItem.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.attendanceRecord.updateMany({
      where: { churchId, serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });

    const emailTemplates = await db.serviceUnitEmailTemplate.findMany({
      where: { serviceUnitId: fromUnitId },
      select: { id: true, type: true },
    });
    for (const tpl of emailTemplates) {
      const existing = await db.serviceUnitEmailTemplate.findFirst({
        where: { serviceUnitId: toUnitId, type: tpl.type },
        select: { id: true },
      });
      if (existing) {
        await db.serviceUnitEmailTemplate.delete({ where: { id: tpl.id } });
      } else {
        await db.serviceUnitEmailTemplate.update({
          where: { id: tpl.id },
          data: { serviceUnitId: toUnitId },
        });
      }
    }

    await this.moveUniqueWeekRows(
      () =>
        db.serviceUnitWeeklyReport.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, weekStart: true },
        }),
      (weekStart) =>
        db.serviceUnitWeeklyReport.findFirst({
          where: { serviceUnitId: toUnitId, weekStart },
          select: { id: true },
        }),
      (id) => db.serviceUnitWeeklyReport.delete({ where: { id } }),
      (id) =>
        db.serviceUnitWeeklyReport.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
    );

    await this.moveUniqueWeekRows(
      () =>
        db.usheringWeeklyHeadcount.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, weekStart: true },
        }),
      (weekStart) =>
        db.usheringWeeklyHeadcount.findFirst({
          where: { serviceUnitId: toUnitId, weekStart },
          select: { id: true },
        }),
      (id) => db.usheringWeeklyHeadcount.delete({ where: { id } }),
      (id) =>
        db.usheringWeeklyHeadcount.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
    );

    // Non-unique hub/dept rows — safe wholesale move.
    await db.serviceUnitAttendance.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptSchedule.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptAssignment.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptModuleReport.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptInventoryItem.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptResource.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptTask.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptIncident.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });
    await db.deptUnitFeedback.updateMany({
      where: { serviceUnitId: fromUnitId },
      data: { serviceUnitId: toUnitId },
    });

    // Unique-constrained dept rows: move when free, drop source row when target already has the key.
    await this.moveOrDropByUniqueKey(
      () =>
        db.deptChildrenClassEnrollment.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, childMemberId: true },
        }),
      (childMemberId) =>
        db.deptChildrenClassEnrollment.findFirst({
          where: { serviceUnitId: toUnitId, childMemberId },
          select: { id: true },
        }),
      (id) => db.deptChildrenClassEnrollment.delete({ where: { id } }),
      (id) =>
        db.deptChildrenClassEnrollment.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => row.childMemberId,
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptChildrenClassDefinition.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, code: true },
        }),
      (code) =>
        db.deptChildrenClassDefinition.findFirst({
          where: { serviceUnitId: toUnitId, code },
          select: { id: true },
        }),
      (id) => db.deptChildrenClassDefinition.delete({ where: { id } }),
      (id) =>
        db.deptChildrenClassDefinition.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => row.code,
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptChildrenDutyRoster.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, weekStart: true, classGroup: true },
        }),
      (key) => {
        const [weekStart, classGroup] = key.split('\0');
        return db.deptChildrenDutyRoster.findFirst({
          where: { serviceUnitId: toUnitId, weekStart: new Date(weekStart), classGroup },
          select: { id: true },
        });
      },
      (id) => db.deptChildrenDutyRoster.delete({ where: { id } }),
      (id) =>
        db.deptChildrenDutyRoster.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => `${row.weekStart.toISOString()}\0${row.classGroup}`,
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptMedicalTeamAttendance.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, memberId: true, serviceDate: true },
        }),
      (key) => {
        const [memberId, serviceDate] = key.split('\0');
        return db.deptMedicalTeamAttendance.findFirst({
          where: { serviceUnitId: toUnitId, memberId, serviceDate: new Date(serviceDate) },
          select: { id: true },
        });
      },
      (id) => db.deptMedicalTeamAttendance.delete({ where: { id } }),
      (id) =>
        db.deptMedicalTeamAttendance.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => `${row.memberId}\0${row.serviceDate.toISOString()}`,
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptSkill.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, memberId: true, skill: true },
        }),
      (key) => {
        const [memberId, skill] = key.split('\0');
        return db.deptSkill.findFirst({
          where: { serviceUnitId: toUnitId, memberId, skill },
          select: { id: true },
        });
      },
      (id) => db.deptSkill.delete({ where: { id } }),
      (id) =>
        db.deptSkill.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => `${row.memberId}\0${row.skill}`,
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptPrayerScriptureGuide.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, serviceDate: true },
        }),
      (serviceDateIso) =>
        db.deptPrayerScriptureGuide.findFirst({
          where: { serviceUnitId: toUnitId, serviceDate: new Date(serviceDateIso) },
          select: { id: true },
        }),
      (id) => db.deptPrayerScriptureGuide.delete({ where: { id } }),
      (id) =>
        db.deptPrayerScriptureGuide.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => row.serviceDate.toISOString(),
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptPrayerChecklist.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, checklistDate: true, itemKey: true },
        }),
      (key) => {
        const [checklistDate, itemKey] = key.split('\0');
        return db.deptPrayerChecklist.findFirst({
          where: {
            serviceUnitId: toUnitId,
            checklistDate: new Date(checklistDate),
            itemKey,
          },
          select: { id: true },
        });
      },
      (id) => db.deptPrayerChecklist.delete({ where: { id } }),
      (id) =>
        db.deptPrayerChecklist.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => `${row.checklistDate.toISOString()}\0${row.itemKey}`,
    );

    await this.moveOrDropByUniqueKey(
      () =>
        db.deptChoirAttendance.findMany({
          where: { serviceUnitId: fromUnitId },
          select: { id: true, eventType: true, eventDate: true, memberId: true },
        }),
      (key) => {
        const [eventType, eventDate, memberId] = key.split('\0');
        return db.deptChoirAttendance.findFirst({
          where: {
            serviceUnitId: toUnitId,
            eventType: eventType as ChoirAttendanceEventType,
            eventDate: new Date(eventDate),
            memberId,
          },
          select: { id: true },
        });
      },
      (id) => db.deptChoirAttendance.delete({ where: { id } }),
      (id) =>
        db.deptChoirAttendance.update({
          where: { id },
          data: { serviceUnitId: toUnitId },
        }),
      (row) => `${row.eventType}\0${row.eventDate.toISOString()}\0${row.memberId}`,
    );
  }

  private async moveUniqueWeekRows(
    listFrom: () => Promise<Array<{ id: string; weekStart: Date }>>,
    findTarget: (weekStart: Date) => Promise<{ id: string } | null>,
    deleteRow: (id: string) => Promise<unknown>,
    updateRow: (id: string) => Promise<unknown>,
  ) {
    const rows = await listFrom();
    for (const row of rows) {
      const existing = await findTarget(row.weekStart);
      if (existing) {
        await deleteRow(row.id);
      } else {
        await updateRow(row.id);
      }
    }
  }

  /** Move rows to target unit; if unique key already exists on target, drop the source row. */
  private async moveOrDropByUniqueKey<T extends { id: string }>(
    listFrom: () => Promise<T[]>,
    findTarget: (key: string) => Promise<{ id: string } | null>,
    deleteRow: (id: string) => Promise<unknown>,
    updateRow: (id: string) => Promise<unknown>,
    keyOf: (row: T) => string,
  ) {
    const rows = await listFrom();
    for (const row of rows) {
      const existing = await findTarget(keyOf(row));
      if (existing) {
        await deleteRow(row.id);
      } else {
        await updateRow(row.id);
      }
    }
  }

  /** A member may be unit-admin of at most one active service unit in the church. */
  private async assertSoleUnitAdminLeadership(
    churchId: string,
    memberId: string,
    serviceUnitId: string,
  ) {
    const other = await this.prisma.serviceUnitLeader.findFirst({
      where: {
        memberId,
        isUnitAdmin: true,
        serviceUnitId: { not: serviceUnitId },
        serviceUnit: { churchId, isActive: true },
      },
      select: { serviceUnit: { select: { name: true } } },
    });
    if (other) {
      throw new BadRequestException(
        `This person already leads "${other.serviceUnit.name}". A member can lead only one service unit.`,
      );
    }
  }

  async addMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: AssignServiceUnitMemberDto,
  ) {
    return this.assignUnitMember(userId, churchId, serviceUnitId, body);
  }

  /** Full congregant create via global membership form, then attach to this unit. */
  async createMemberAndAdd(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: Record<string, unknown>,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    const firstName = String(data.firstName ?? '').trim();
    const lastName = String(data.lastName ?? '').trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    const incomingUnits = Array.isArray(data.serviceUnitIds)
      ? data.serviceUnitIds.map((id) => String(id)).filter(Boolean)
      : [];
    const serviceUnitIds = Array.from(new Set([...incomingUnits, serviceUnitId]));

    const created = await this.membership.createMember(churchId, {
      ...(data as Parameters<MembershipService['createMember']>[1]),
      firstName,
      lastName,
      serviceUnitIds,
      startOnboarding: data.startOnboarding === true,
      requireContactFields: data.requireContactFields !== false,
    });

    const membership = await this.prisma.serviceUnitMember.findUnique({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId: created.id } },
    });
    if (!membership) {
      await this.applyUnitRole(churchId, serviceUnitId, created.id, 'MEMBER');
    }

    return created;
  }

  async getRegistryCatalog(churchId: string) {
    return this.registry.getRegistryCatalog(churchId);
  }

  private nonNegInt(value: unknown, field: string): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }
    return Math.floor(n);
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async listAttendance(userId: string, churchId: string, serviceUnitId: string) {
    const access = await this.checkUnitAccess(userId, churchId, serviceUnitId);
    if (!access.canView) {
      throw new ForbiddenException('You are not a member of this service unit');
    }
    return this.prisma.serviceUnitAttendance.findMany({
      where: { churchId, serviceUnitId },
      orderBy: [{ meetingDate: 'desc' }, { weekStart: 'desc' }, { createdAt: 'desc' }],
      take: 52,
    });
  }

  async recordAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      weekStart?: string;
      meetingDate?: string;
      presentCount?: number;
      absentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      testifiersCount?: number;
      firstTimersCount?: number;
      notes?: string;
    },
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    const maleCount = this.nonNegInt(body.maleCount ?? 0, 'maleCount');
    const femaleCount = this.nonNegInt(body.femaleCount ?? 0, 'femaleCount');
    const boysCount = this.nonNegInt(body.boysCount ?? 0, 'boysCount');
    const girlsCount = this.nonNegInt(body.girlsCount ?? 0, 'girlsCount');
    const testifiersCount = this.nonNegInt(body.testifiersCount ?? 0, 'testifiersCount');
    const firstTimersCount = this.nonNegInt(body.firstTimersCount ?? 0, 'firstTimersCount');
    const demographicTotal = maleCount + femaleCount + boysCount + girlsCount;
    const presentCount =
      body.presentCount != null && Number.isFinite(Number(body.presentCount))
        ? this.nonNegInt(body.presentCount, 'presentCount')
        : demographicTotal;

    const meetingDate = body.meetingDate
      ? new Date(body.meetingDate)
      : body.weekStart
        ? new Date(body.weekStart)
        : new Date();
    if (Number.isNaN(meetingDate.getTime())) {
      throw new BadRequestException('Invalid meeting date');
    }
    const weekStart = body.weekStart ? new Date(body.weekStart) : this.startOfWeek(meetingDate);
    if (Number.isNaN(weekStart.getTime())) {
      throw new BadRequestException('Invalid week start');
    }

    const row = await this.prisma.serviceUnitAttendance.create({
      data: {
        churchId,
        serviceUnitId,
        weekStart,
        meetingDate,
        presentCount,
        absentCount:
          body.absentCount != null && Number.isFinite(body.absentCount)
            ? Math.floor(body.absentCount)
            : null,
        maleCount,
        femaleCount,
        boysCount,
        girlsCount,
        testifiersCount,
        firstTimersCount,
        notes: body.notes?.trim() || null,
        recordedByUserId: userId,
      },
    });
    await this.notifyLeadershipOfAttendance(churchId, serviceUnitId, row, 'created');
    return row;
  }

  async updateAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    attendanceId: string,
    body: {
      weekStart?: string;
      meetingDate?: string;
      presentCount?: number;
      absentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      testifiersCount?: number;
      firstTimersCount?: number;
      notes?: string;
    },
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    const existing = await this.prisma.serviceUnitAttendance.findFirst({
      where: { id: attendanceId, churchId, serviceUnitId },
    });
    if (!existing) throw new NotFoundException('Attendance record not found');

    const maleCount =
      body.maleCount != null ? this.nonNegInt(body.maleCount, 'maleCount') : existing.maleCount;
    const femaleCount =
      body.femaleCount != null
        ? this.nonNegInt(body.femaleCount, 'femaleCount')
        : existing.femaleCount;
    const boysCount =
      body.boysCount != null ? this.nonNegInt(body.boysCount, 'boysCount') : existing.boysCount;
    const girlsCount =
      body.girlsCount != null ? this.nonNegInt(body.girlsCount, 'girlsCount') : existing.girlsCount;
    const testifiersCount =
      body.testifiersCount != null
        ? this.nonNegInt(body.testifiersCount, 'testifiersCount')
        : existing.testifiersCount;
    const firstTimersCount =
      body.firstTimersCount != null
        ? this.nonNegInt(body.firstTimersCount, 'firstTimersCount')
        : existing.firstTimersCount;
    const demographicTotal = maleCount + femaleCount + boysCount + girlsCount;
    const presentCount =
      body.presentCount != null && Number.isFinite(Number(body.presentCount))
        ? this.nonNegInt(body.presentCount, 'presentCount')
        : demographicTotal > 0
          ? demographicTotal
          : existing.presentCount;

    const meetingDate = body.meetingDate
      ? new Date(body.meetingDate)
      : existing.meetingDate ?? existing.weekStart;
    if (Number.isNaN(meetingDate.getTime())) {
      throw new BadRequestException('Invalid meeting date');
    }
    const weekStart = body.weekStart
      ? new Date(body.weekStart)
      : this.startOfWeek(meetingDate);
    if (Number.isNaN(weekStart.getTime())) {
      throw new BadRequestException('Invalid week start');
    }

    const row = await this.prisma.serviceUnitAttendance.update({
      where: { id: attendanceId },
      data: {
        weekStart,
        meetingDate,
        presentCount,
        absentCount:
          body.absentCount != null && Number.isFinite(body.absentCount)
            ? Math.floor(body.absentCount)
            : existing.absentCount,
        maleCount,
        femaleCount,
        boysCount,
        girlsCount,
        testifiersCount,
        firstTimersCount,
        notes: body.notes !== undefined ? body.notes.trim() || null : existing.notes,
      },
    });
    await this.notifyLeadershipOfAttendance(churchId, serviceUnitId, row, 'updated');
    return row;
  }

  private async notifyLeadershipOfAttendance(
    churchId: string,
    serviceUnitId: string,
    row: {
      id: string;
      weekStart: Date;
      meetingDate: Date | null;
      presentCount: number;
      maleCount: number;
      femaleCount: number;
      boysCount: number;
      girlsCount: number;
      testifiersCount: number;
      firstTimersCount: number;
      createdAt: Date;
    },
    action: 'created' | 'updated',
  ) {
    const unit = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId },
      select: { name: true },
    });
    const unitName = unit?.name ?? 'Service unit';
    const meetingDate = row.meetingDate ?? row.weekStart;
    const dateLabel = meetingDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timestamp = new Date().toISOString();
    const title = `[Attendance Report] ${unitName} — ${dateLabel}`;
    const body = [
      `Tags: Service Unit Name · Date · Attendance Report · Timestamp`,
      ``,
      `Service Unit Name: ${unitName}`,
      `Date: ${dateLabel}`,
      `Attendance Report: ${action === 'created' ? 'New' : 'Updated'} weekly attendance`,
      `Timestamp: ${timestamp}`,
      ``,
      `Male: ${row.maleCount}`,
      `Female: ${row.femaleCount}`,
      `Boys: ${row.boysCount}`,
      `Girls: ${row.girlsCount}`,
      `Testifiers: ${row.testifiersCount}`,
      `First Timers: ${row.firstTimersCount}`,
      `Total present: ${row.presentCount}`,
    ].join('\n');

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_WEEKLY_REPORT',
        title,
        body,
        channels: ['IN_APP'],
        targetUserId: staff.id,
        serviceUnitId,
        metadata: {
          tags: ['Service Unit Name', 'Date', 'Attendance Report', 'Timestamp'],
          serviceUnitId,
          serviceUnitName: unitName,
          date: dateLabel,
          reportType: 'Attendance Report',
          timestamp,
          attendanceId: row.id,
          action,
          presentCount: row.presentCount,
          maleCount: row.maleCount,
          femaleCount: row.femaleCount,
          boysCount: row.boysCount,
          girlsCount: row.girlsCount,
          firstTimersCount: row.firstTimersCount,
          testifiersCount: row.testifiersCount,
        },
      });
    }
  }

  /**
   * After 3 PM church-local time every Sunday, remind unit admins whose units
   * have not recorded attendance for that Sunday (email + in-app bell).
   */
  async runSundayAttendanceReminders(now = new Date()) {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true, timezone: true, name: true },
    });

    let reminded = 0;
    for (const church of churches) {
      const timezone = church.timezone?.trim() || 'UTC';
      const local = this.localClockParts(now, timezone);
      if (local.weekday !== 0) continue; // Sunday
      if (local.hour < 15) continue; // after 3 PM

      const sundayYmd = local.ymd;
      const dayStart = new Date(`${sundayYmd}T00:00:00.000Z`);
      const dayEnd = new Date(`${sundayYmd}T23:59:59.999Z`);
      const weekStart = this.startOfWeek(new Date(`${sundayYmd}T12:00:00`));

      const units = await this.prisma.serviceUnit.findMany({
        where: { churchId: church.id, isActive: true },
        select: { id: true, name: true },
      });

      for (const unit of units) {
        const recorded = await this.prisma.serviceUnitAttendance.findFirst({
          where: {
            churchId: church.id,
            serviceUnitId: unit.id,
            OR: [
              { meetingDate: { gte: dayStart, lte: dayEnd } },
              { weekStart },
            ],
          },
          select: { id: true },
        });
        if (recorded) continue;

        const admins = await this.prisma.serviceUnitLeader.findMany({
          where: { serviceUnitId: unit.id, isUnitAdmin: true },
          include: {
            member: {
              select: {
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        if (admins.length === 0) continue;

        const title = `Reminder: update ${unit.name} attendance`;
        const body = [
          `Hello,`,
          ``,
          `Sunday attendance for "${unit.name}" has not been recorded yet.`,
          `Please open the Attendance tab and submit today's demographic counts.`,
          ``,
          `Church: ${church.name}`,
          `Date: ${sundayYmd}`,
          `Deadline reminder: after 3:00 PM Sunday`,
        ].join('\n');

        for (const admin of admins) {
          const reminderKey = `sunday-attendance:${unit.id}:${sundayYmd}:${admin.member.id}`;
          const already = await this.prisma.communicationQueueItem.findFirst({
            where: {
              churchId: church.id,
              kind: 'DIRECT_ALERT',
              metadata: { path: ['reminderKey'], equals: reminderKey },
            },
            select: { id: true },
          });
          if (already) continue;

          // Do not set serviceUnitId on the queue row — that fans out to every unit member.
          await this.commQueue.enqueue(church.id, {
            kind: 'DIRECT_ALERT',
            title,
            body,
            channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
            targetUserId: admin.member.userId ?? undefined,
            targetMemberId: admin.member.id,
            metadata: {
              reminderKey,
              reminderType: 'SUNDAY_ATTENDANCE',
              serviceUnitId: unit.id,
              serviceUnitName: unit.name,
              sundayDate: sundayYmd,
            },
          });
          reminded++;
        }
      }
    }

    return { churches: churches.length, reminded };
  }

  private localClockParts(
    date: Date,
    timezone: string,
  ): { hour: number; weekday: number; ymd: string } {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = fmt.formatToParts(date);
      const hourRaw = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
      const hour = hourRaw === 24 ? 0 : hourRaw;
      const weekdayLabel = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
      const map: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const year = parts.find((p) => p.type === 'year')?.value ?? '';
      const month = parts.find((p) => p.type === 'month')?.value ?? '';
      const day = parts.find((p) => p.type === 'day')?.value ?? '';
      return {
        hour,
        weekday: map[weekdayLabel] ?? date.getUTCDay(),
        ymd: `${year}-${month}-${day}`,
      };
    } catch {
      return {
        hour: date.getUTCHours(),
        weekday: date.getUTCDay(),
        ymd: date.toISOString().slice(0, 10),
      };
    }
  }

  async updateUnitMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    memberId: string,
    body: UpdateServiceUnitMemberDto,
  ) {
    const ctx = await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);
    if (body.unitRole === 'UNIT_ADMIN' && !this.moduleAccess.canAssignUnitAdmin(ctx)) {
      throw new ForbiddenException(
        'Only church admin or pastor can assign a Unit Leader. Use Assign Assistants for Assistant/Secretary.',
      );
    }

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
      const priorLeader =
        body.unitRole === 'UNIT_ADMIN'
          ? await this.prisma.serviceUnitLeader.findUnique({
              where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
              select: { isUnitAdmin: true },
            })
          : null;
      const newlyUnitAdmin = body.unitRole === 'UNIT_ADMIN' && !priorLeader?.isUnitAdmin;
      await this.applyUnitRole(churchId, serviceUnitId, memberId, body.unitRole, body.designation);
      if (newlyUnitAdmin) {
        await this.provisionUnitLeaderLoginAndWelcome(churchId, serviceUnitId, memberId);
      }
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
    const ctx = await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);
    if (body.unitRole === 'UNIT_ADMIN' && !this.moduleAccess.canAssignUnitAdmin(ctx)) {
      throw new ForbiddenException(
        'Only church admin or pastor can assign a Unit Leader. Use Assign Assistants for Assistant/Secretary.',
      );
    }

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
    const priorLeader =
      unitRole === 'UNIT_ADMIN'
        ? await this.prisma.serviceUnitLeader.findUnique({
            where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
            select: { isUnitAdmin: true },
          })
        : null;
    const newlyUnitAdmin = unitRole === 'UNIT_ADMIN' && !priorLeader?.isUnitAdmin;

    await this.applyUnitRole(churchId, serviceUnitId, memberId, unitRole, body.designation);

    if (newlyUnitAdmin) {
      await this.provisionUnitLeaderLoginAndWelcome(churchId, serviceUnitId, memberId);
    }

    return this.getUnitMemberRow(churchId, serviceUnitId, memberId);
  }

  private async applyUnitRole(
    churchId: string,
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
      await this.assertSoleUnitAdminLeadership(churchId, memberId, serviceUnitId);
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
      unitRole: unitRoleFromLeader(!!leader?.isUnitAdmin, leader?.role),
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
        unitRole: unitRoleFromLeader(!!leader?.isUnitAdmin, leader?.role),
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
      memberId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: string;
      isModerator?: boolean;
      isUnitAdmin?: boolean;
      deputyRole?: UnitDeputyRole;
    },
  ) {
    const ctx = await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);

    const deputyRole: UnitDeputyRole | null = data.deputyRole
      ? data.deputyRole
      : isUnitDeputyRole(data.role)
        ? (normalizeUnitLeaderRole(data.role) as UnitDeputyRole)
        : null;
    const makeUnitAdmin = data.isUnitAdmin === true && !deputyRole;

    if (makeUnitAdmin) {
      if (!this.moduleAccess.canAssignUnitAdmin(ctx)) {
        throw new ForbiddenException(
          'Only church admin or pastor can assign a Unit Leader (volunteer unit admin)',
        );
      }
    } else if (deputyRole) {
      if (!this.moduleAccess.canAssignUnitDeputies(ctx, serviceUnitId)) {
        throw new ForbiddenException(
          'Only the Unit Admin or church staff can assign Assistant or Secretary',
        );
      }
    } else if (!this.moduleAccess.canManageUnitLeaders(ctx, serviceUnitId)) {
      throw new ForbiddenException('Unit Admin or church staff required to manage leaders');
    }

    if (makeUnitAdmin && !data.memberId?.trim() && !data.email?.trim()) {
      throw new BadRequestException(
        'Email is required when assigning a new Unit Leader so they can receive a login invite',
      );
    }

    const memberId = await this.resolveLeaderMemberId(churchId, data);

    if (makeUnitAdmin) {
      await this.assertSoleUnitAdminLeadership(churchId, memberId, serviceUnitId);
    }

    if (deputyRole) {
      await this.assertSoleDeputySlot(serviceUnitId, deputyRole, memberId);
    }

    const storedRole =
      deputyRole ?? (data.role?.trim() || (makeUnitAdmin ? 'LEADER' : 'LEADER'));
    const moderator = data.isModerator ?? (makeUnitAdmin || !!deputyRole);

    const priorLeader = await this.prisma.serviceUnitLeader.findUnique({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      select: { isUnitAdmin: true },
    });
    const newlyUnitAdmin = makeUnitAdmin && !priorLeader?.isUnitAdmin;

    await this.prisma.serviceUnitMember.upsert({
      where: {
        serviceUnitId_memberId: { serviceUnitId, memberId },
      },
      create: { serviceUnitId, memberId },
      update: {},
    });
    const leader = await this.prisma.serviceUnitLeader.upsert({
      where: {
        serviceUnitId_memberId: { serviceUnitId, memberId },
      },
      create: {
        serviceUnitId,
        memberId,
        role: storedRole,
        isModerator: moderator,
        isUnitAdmin: makeUnitAdmin,
      },
      update: {
        role: storedRole,
        isModerator: moderator,
        isUnitAdmin: makeUnitAdmin,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (newlyUnitAdmin) {
      await this.provisionUnitLeaderLoginAndWelcome(churchId, serviceUnitId, memberId);
    }

    return leader;
  }

  /**
   * Ensure the Unit Leader has a login User + send welcome with set-password link
   * (same pattern as church staff onboarding).
   */
  private async provisionUnitLeaderLoginAndWelcome(
    churchId: string,
    serviceUnitId: string,
    memberId: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      select: {
        id: true,
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const email = member.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException(
        'Email is required to assign a Unit Leader so they can receive a login invite',
      );
    }

    const unit = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId },
      select: { name: true },
    });
    if (!unit) throw new NotFoundException('Service unit not found');

    let userId = member.userId ?? undefined;
    let createdUser = false;
    let needsPasswordSetup = false;

    if (!userId) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email, churchId },
        select: {
          id: true,
          mustChangePassword: true,
          lastLoginAt: true,
          member: { select: { id: true } },
        },
      });
      if (existingUser) {
        if (existingUser.member && existingUser.member.id !== member.id) {
          throw new ConflictException(
            'That email already belongs to another login account in this church',
          );
        }
        userId = existingUser.id;
        if (!existingUser.member) {
          await this.prisma.member.update({
            where: { id: member.id },
            data: { userId },
          });
        }
        needsPasswordSetup =
          existingUser.mustChangePassword || existingUser.lastLoginAt == null;
      } else {
        const memberRole = await this.prisma.role.upsert({
          where: { name: 'MEMBER' },
          update: {},
          create: { name: 'MEMBER', description: 'Church member' },
        });
        const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), 12);
        const user = await this.prisma.user.create({
          data: {
            churchId,
            email,
            passwordHash,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone ?? undefined,
            mustChangePassword: true,
            roles: { create: [{ roleId: memberRole.id }] },
          },
          select: { id: true },
        });
        userId = user.id;
        createdUser = true;
        needsPasswordSetup = true;
        await this.prisma.member.update({
          where: { id: member.id },
          data: { userId },
        });
      }
    } else {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, churchId },
        select: { mustChangePassword: true, lastLoginAt: true, email: true },
      });
      if (!user) {
        throw new BadRequestException('Linked login account was not found');
      }
      needsPasswordSetup = user.mustChangePassword || user.lastLoginAt == null;
    }

    let setPasswordUrl = '';
    if (needsPasswordSetup || createdUser) {
      try {
        setPasswordUrl = await this.auth.createPasswordSetupLink(userId);
      } catch (err) {
        this.logger.warn(
          `Password setup link failed for unit leader ${email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    await this.sendUnitLeaderWelcomeEmail(churchId, {
      email,
      phone: member.phone,
      firstName: member.firstName,
      lastName: member.lastName,
      unitName: unit.name,
      setPasswordUrl,
    });
  }

  private async sendUnitLeaderWelcomeEmail(
    churchId: string,
    data: {
      email: string;
      phone?: string | null;
      firstName: string;
      lastName: string;
      unitName: string;
      setPasswordUrl: string;
    },
  ) {
    try {
      const church = await this.prisma.church.findUnique({
        where: { id: churchId },
        select: { name: true },
      });
      const hasLink = Boolean(data.setPasswordUrl);
      const setPasswordBlock = hasLink
        ? `<p style="margin:0;"><a href="${data.setPasswordUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Set your password</a></p>
<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Or copy this link:<br/>${data.setPasswordUrl}</p>`
        : `<p style="margin:0;font-size:13px;color:#64748b;">Sign in with your existing ChurchHub password.</p>`;

      const rendered = await this.emailTemplates.render(churchId, 'UNIT_LEADER_WELCOME', {
        churchName: church?.name ?? 'Your church',
        unitName: data.unitName,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        setPasswordUrl:
          data.setPasswordUrl ||
          'Contact your church admin if you need a password reset.',
        passwordSetupBlurb: hasLink
          ? 'For security, we do not send passwords by email. Use the secure link below to choose your password (expires in 45 minutes).'
          : 'Your ChurchHub login is ready — use the password you already set.',
        setPasswordBlock,
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
      // Never put set-password bearer URLs on WhatsApp (phone may be unverified/stale).
      const waBody = hasLink
        ? `${rendered.subject}\n\nHi ${data.firstName}, you are Unit Leader for ${data.unitName}. Check your email for a one-time set-password link (expires in 45 minutes).`
        : `${rendered.subject}\n\nHi ${data.firstName}, you are Unit Leader for ${data.unitName}. Sign in with your existing ChurchHub password.`;
      await trySendWhatsApp(this.sms, this.logger, {
        to: data.phone,
        body: waBody,
        churchId,
        label: 'Unit leader welcome',
      });
    } catch (err) {
      this.logger.warn(
        `Unit leader welcome email failed for ${data.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async resolveLeaderMemberId(
    churchId: string,
    data: {
      memberId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
  ): Promise<string> {
    let memberId = data.memberId?.trim();
    if (memberId) {
      const exists = await this.prisma.member.findFirst({
        where: { id: memberId, churchId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Member not found in this church');
      return memberId;
    }

    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('Provide memberId or first and last name');
    }
    const email = data.email?.trim() || undefined;
    if (email) {
      const existing = await this.prisma.member.findFirst({
        where: { churchId, email },
        select: { id: true },
      });
      if (existing) return existing.id;
    }
    const created = await this.membership.createMember(churchId, {
      firstName,
      lastName,
      email,
      phone: data.phone?.trim() || undefined,
      status: 'ACTIVE_MEMBER',
      startOnboarding: false,
    });
    return created.id;
  }

  private async assertSoleDeputySlot(
    serviceUnitId: string,
    deputyRole: UnitDeputyRole,
    memberId: string,
  ) {
    const existing = await this.prisma.serviceUnitLeader.findMany({
      where: { serviceUnitId, isUnitAdmin: false },
      select: { memberId: true, role: true },
    });
    const taken = existing.find(
      (row) =>
        normalizeUnitLeaderRole(row.role) === deputyRole && row.memberId !== memberId,
    );
    if (taken) {
      throw new BadRequestException(
        `This unit already has a ${deputyRole === 'ASSISTANT' ? 'Assistant' : 'Secretary'}. Remove them first.`,
      );
    }
  }

  async removeLeader(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    leaderId: string,
  ) {
    const ctx = await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);
    const leader = await this.prisma.serviceUnitLeader.findFirst({
      where: { id: leaderId, serviceUnitId },
    });
    if (!leader) throw new NotFoundException('Leader not found');

    if (leader.isUnitAdmin) {
      if (!this.moduleAccess.canAssignUnitAdmin(ctx)) {
        throw new ForbiddenException('Only church admin or pastor can remove a Unit Leader');
      }
    } else if (!this.moduleAccess.canManageUnitLeaders(ctx, serviceUnitId)) {
      throw new ForbiddenException('Unit Admin or church staff required to remove leaders');
    }

    return this.prisma.serviceUnitLeader.delete({ where: { id: leaderId } });
  }

  async listMeetings(userId: string, churchId: string, serviceUnitId: string) {
    const access = await this.checkUnitAccess(userId, churchId, serviceUnitId);
    if (!access.canView) {
      throw new ForbiddenException('You are not a member of this service unit');
    }
    const unit = await this.getUnit(churchId, serviceUnitId);
    return unit.meetings;
  }

  async createMeeting(
    userId: string,
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
    await this.requireUnitManager(userId, churchId, serviceUnitId);
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
    userId: string,
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
    await this.requireUnitManager(userId, churchId, serviceUnitId);
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

  async deleteMeeting(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    meetingId: string,
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    await this.getUnit(churchId, serviceUnitId);
    const meeting = await this.prisma.serviceUnitMeeting.findFirst({
      where: { id: meetingId, serviceUnitId, churchId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return this.prisma.serviceUnitMeeting.delete({ where: { id: meetingId } });
  }

  private async requireUnitViewer(
    userId: string,
    churchId: string,
    serviceUnitId: string,
  ): Promise<UserMemberContext> {
    await this.getUnit(churchId, serviceUnitId);
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !(await this.moduleAccess.canViewServiceUnit(ctx, serviceUnitId))) {
      throw new ForbiddenException('You are not a member of this service unit');
    }
    return ctx;
  }

  private requireCallerMemberId(ctx: UserMemberContext): string {
    if (!ctx.memberId) {
      throw new ForbiddenException('A member profile is required for this action');
    }
    return ctx.memberId;
  }

  async listPosts(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireUnitViewer(userId, churchId, serviceUnitId);
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
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: { title?: string; body: string },
  ) {
    const ctx = await this.requireUnitViewer(userId, churchId, serviceUnitId);
    const authorId = this.requireCallerMemberId(ctx);
    const body = data.body?.trim();
    if (!body) throw new BadRequestException('Post body is required');
    if (body.length > 10_000) throw new BadRequestException('Post body is too long');
    const title = data.title?.trim() || undefined;
    if (title && title.length > 200) throw new BadRequestException('Post title is too long');
    return this.prisma.serviceUnitPost.create({
      data: { serviceUnitId, authorId, title, body },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: true,
      },
    });
  }

  async updatePost(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    postId: string,
    data: Partial<{ title: string; body: string; isPinned: boolean; isLocked: boolean }>,
  ) {
    const ctx = await this.requireUnitViewer(userId, churchId, serviceUnitId);
    const callerMemberId = ctx.memberId;
    const post = await this.prisma.serviceUnitPost.findFirst({
      where: { id: postId, serviceUnitId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const isModerator =
      this.moduleAccess.isChurchStaff(ctx) ||
      (callerMemberId ? await this.isModerator(serviceUnitId, callerMemberId) : false);
    const isAuthor = !!callerMemberId && post.authorId === callerMemberId;

    if (post.isLocked && !isModerator) {
      throw new ForbiddenException('This discussion is locked');
    }

    const patch: Prisma.ServiceUnitPostUpdateInput = {};
    if (data.title !== undefined) {
      if (!isAuthor && !isModerator) throw new ForbiddenException('Not allowed to edit this post');
      patch.title = data.title?.trim() || null;
    }
    if (data.body !== undefined) {
      if (!isAuthor && !isModerator) throw new ForbiddenException('Not allowed to edit this post');
      const body = data.body.trim();
      if (!body) throw new BadRequestException('Post body is required');
      patch.body = body;
    }
    if (data.isPinned !== undefined || data.isLocked !== undefined) {
      if (!isModerator) {
        throw new ForbiddenException('Only unit moderators or church staff can pin or lock posts');
      }
      if (data.isPinned !== undefined) patch.isPinned = data.isPinned;
      if (data.isLocked !== undefined) patch.isLocked = data.isLocked;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.prisma.serviceUnitPost.update({
      where: { id: postId },
      data: patch,
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

  async deletePost(userId: string, churchId: string, serviceUnitId: string, postId: string) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    const post = await this.prisma.serviceUnitPost.findFirst({
      where: { id: postId, serviceUnitId },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.serviceUnitPost.delete({ where: { id: postId } });
  }

  async createReply(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    postId: string,
    data: { body: string },
  ) {
    const ctx = await this.requireUnitViewer(userId, churchId, serviceUnitId);
    const authorId = this.requireCallerMemberId(ctx);
    const post = await this.prisma.serviceUnitPost.findFirst({
      where: { id: postId, serviceUnitId },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.isLocked) {
      const isMod =
        this.moduleAccess.isChurchStaff(ctx) ||
        (await this.isModerator(serviceUnitId, authorId));
      if (!isMod) throw new ForbiddenException('This discussion is locked');
    }
    const body = data.body?.trim();
    if (!body) throw new BadRequestException('Reply body is required');
    if (body.length > 5_000) throw new BadRequestException('Reply body is too long');

    return this.prisma.serviceUnitPostReply.create({
      data: { postId, authorId, body },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async deleteReply(userId: string, churchId: string, serviceUnitId: string, replyId: string) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
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

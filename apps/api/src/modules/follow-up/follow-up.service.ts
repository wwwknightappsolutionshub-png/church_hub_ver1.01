import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateFollowUpSchema,
  UpdateFollowUpSchema,
  optionalEmailSchema,
  optionalPhoneSchema,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import {
  encryptPastoralNoteContent,
  mapPastoralNoteRow,
} from '../../common/crypto/pastoral-notes.crypto';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import { runWithTenantContextAsync } from '../../prisma/tenant-context';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { trySendWhatsApp } from '../notifications/try-send-whatsapp';
import {
  DEFAULT_FOLLOW_UP_TEMPLATES,
  FOLLOW_UP_STAGE_ORDER,
} from './follow-up.constants';
import { FollowUpTeamNotifyService } from './follow-up-team-notify.service';
import { FollowUpAutomationService } from './follow-up-automation.service';
import { ModuleAccessService } from '../access/module-access.service';
import { ESTABLISHMENT_MANAGER_UNIT_NAMES, FOLLOW_UP_UNIT_NAME } from '../access/access.constants';
import { isUnitDeputyRole } from '../service-units/service-unit-leader-roles';
import { findOneAdminAndOnePastor } from '../notifications/report-digest.util';
import type { EstablishmentAccess } from '../access/establishment-access.types';
import {
  assignmentSlaCutoff,
  assignmentStaleWhereBranches,
  dueAtFromProgress,
  dueTodayProgressWindow,
} from './follow-up-assignment-sla';
import { PipelineResolveService } from './pipeline-resolve.service';
import {
  entryStageKey,
  graduatedStageKeys,
  isArchiveBlockedStageKey,
  type StageFlagRow,
} from './pipeline-stage-flags';

const followUpInclude = {
  member: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  archivedBy: { select: { id: true, firstName: true, lastName: true } },
  archiveRequestedBy: { select: { id: true, firstName: true, lastName: true } },
  wsfCellBranch: { select: { id: true, name: true } },
  reminders: { orderBy: { remindAt: 'asc' as const } },
};

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsQueueService,
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
    private readonly teamNotify: FollowUpTeamNotifyService,
    private readonly automation: FollowUpAutomationService,
    private readonly moduleAccess: ModuleAccessService,
    private readonly pipelineResolve: PipelineResolveService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  private async pipelineFlags(churchId: string): Promise<StageFlagRow[]> {
    const pipeline = await this.pipelineResolve.resolveForChurch(churchId);
    return pipeline.stages.map((s) => ({
      key: s.key,
      isEntry: s.isEntry,
      blocksArchive: s.blocksArchive,
      graduatesSla: s.graduatesSla,
      isEnabled: s.isEnabled,
    }));
  }

  private async assertStageInPipeline(churchId: string, stage: string): Promise<StageFlagRow[]> {
    const flags = await this.pipelineFlags(churchId);
    const allowed = flags.filter((s) => s.isEnabled).map((s) => s.key);
    if (!allowed.includes(stage)) {
      throw new BadRequestException(`Unknown or disabled pipeline stage: ${stage}`);
    }
    return flags;
  }

  async getAccess(churchId: string, userId: string): Promise<EstablishmentAccess> {
    return this.moduleAccess.getEstablishmentAccessForUser(userId, churchId);
  }

  private async requireAccess(churchId: string, userId: string): Promise<EstablishmentAccess> {
    const access = await this.getAccess(churchId, userId);
    if (access.mode === 'none') {
      throw new ForbiddenException('Establishment access denied');
    }
    return access;
  }

  private scopedWhere(
    churchId: string,
    access: EstablishmentAccess,
    userId: string,
    extra: Prisma.FollowUpWhereInput = {},
  ): Prisma.FollowUpWhereInput {
    const scope = this.moduleAccess.buildEstablishmentListScope(access, userId);
    return {
      churchId,
      ...(scope ?? {}),
      ...extra,
    };
  }

  async list(
    churchId: string,
    actorUserId: string,
    stage?: string,
    assignedToId?: string,
    opts?: { archived?: boolean },
  ) {
    const access = await this.requireAccess(churchId, actorUserId);
    const archived = opts?.archived === true;

    // Workers cannot broaden via assignedToId query; managers may filter.
    let assigneeFilter = assignedToId;
    if (access.mode === 'worker') {
      assigneeFilter = actorUserId;
    } else if (access.mode === 'viewOnly' || access.mode === 'wsfLeader') {
      assigneeFilter = undefined;
    }

    return this.prisma.followUp.findMany({
      where: this.scopedWhere(churchId, access, actorUserId, {
        ...(stage ? { stage } : {}),
        ...(assigneeFilter ? { assignedToId: assigneeFilter } : {}),
        ...(archived ? { archivedAt: { not: null } } : { archivedAt: null }),
      }),
      include: followUpInclude,
      orderBy: archived
        ? [{ archivedAt: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
    });
  }

  async listCalendar(
    churchId: string,
    actorUserId: string,
    from: Date,
    to: Date,
  ) {
    const access = await this.requireAccess(churchId, actorUserId);
    const items = await this.prisma.followUp.findMany({
      where: this.scopedWhere(churchId, access, actorUserId, {
        archivedAt: null,
        dueAt: { gte: from, lte: to },
      }),
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        wsfCellBranch: { select: { id: true, name: true } },
      },
      orderBy: { dueAt: 'asc' },
    });

    return items.map((f) => ({
      id: f.id,
      contactName: f.contactName,
      stage: f.stage,
      dueAt: f.dueAt,
      nextAction: f.nextAction,
      contactPhone: f.contactPhone,
      contactEmail: f.contactEmail,
      assignedTo: f.assignedTo,
      wsfCellBranch: f.wsfCellBranch,
      archiveRequestedAt: f.archiveRequestedAt,
      journeyDiscontinuedAt: f.journeyDiscontinuedAt,
    }));
  }

  async getOne(churchId: string, id: string, actorUserId?: string) {
    const row = await this.prisma.followUp.findFirst({
      where: { id, churchId },
      include: {
        ...followUpInclude,
        pastoralNotes: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Follow-up not found');

    if (actorUserId) {
      const access = await this.requireAccess(churchId, actorUserId);
      if (
        !this.moduleAccess.canViewEstablishmentRecord(access, actorUserId, {
          assignedToId: row.assignedToId,
          wsfCellBranchId: row.wsfCellBranchId,
        })
      ) {
        throw new ForbiddenException('You cannot view this Establishment contact');
      }
      const isStaff = await this.userIsStaff(actorUserId);
      const pastoralNotes = row.pastoralNotes
        .filter((n) => isStaff || !n.isConfidential || n.authorId === actorUserId)
        .map((n) => mapPastoralNoteRow(n));
      await this.auditPastoralReads(churchId, actorUserId, pastoralNotes);
      return { ...row, pastoralNotes };
    }
    return {
      ...row,
      pastoralNotes: row.pastoralNotes.map((n) => mapPastoralNoteRow(n)),
    };
  }

  /** Assignees must be active users in the same church (blocks cross-tenant assignment). */
  private async assertAssigneeInChurch(churchId: string, assignedToId: string | null | undefined) {
    if (!assignedToId) return;
    const user = await this.prisma.user.findFirst({
      where: { id: assignedToId, churchId, isActive: true },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Assignee must be an active user in this church');
    }
  }

  async getStats(churchId: string, actorUserId: string) {
    const access = await this.requireAccess(churchId, actorUserId);
    const base = this.scopedWhere(churchId, access, actorUserId, { archivedAt: null });

    const grouped = await this.prisma.followUp.groupBy({
      by: ['stage'],
      where: base,
      _count: { id: true },
    });

    const now = new Date();

    /** Graduated stages from resolved pipeline flags (fallback: winners_default). */
    const pipelineFlags = await this.pipelineFlags(churchId);
    const stageKeysForStats = [
      ...new Set([
        ...pipelineFlags.filter((s) => s.isEnabled).map((s) => s.key),
        ...FOLLOW_UP_STAGE_ORDER,
        ...grouped.map((g) => g.stage),
      ]),
    ];
    const byStage = Object.fromEntries(
      stageKeysForStats.map((s) => [s, grouped.find((g) => g.stage === s)?._count.id ?? 0]),
    ) as Record<string, number>;
    const graduatedStages = graduatedStageKeys(pipelineFlags);
    const slaCutoff = assignmentSlaCutoff(now);
    const dueTodayWindow = dueTodayProgressWindow(now);

    const [
      assigned,
      pending,
      overdue,
      dueToday,
      graduated,
      remindersDue,
      archived,
      archiveRequested,
    ] = await Promise.all([
      this.prisma.followUp.count({ where: base }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: graduatedStages },
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: graduatedStages },
          OR: [{ dueAt: { lt: now } }, ...assignmentStaleWhereBranches(slaCutoff)],
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: graduatedStages },
          lastProgressAt: { gte: dueTodayWindow.from, lte: dueTodayWindow.to },
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { in: graduatedStages },
        },
      }),
      this.prisma.followUpReminder.count({
        where: {
          sentAt: null,
          remindAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          followUp: this.scopedWhere(churchId, access, actorUserId, { archivedAt: null }),
        },
      }),
      this.prisma.followUp.count({
        where: this.scopedWhere(churchId, access, actorUserId, {
          archivedAt: { not: null },
        }),
      }),
      this.prisma.followUp.count({
        where: this.scopedWhere(churchId, access, actorUserId, {
          archivedAt: null,
          archiveRequestedAt: { not: null },
        }),
      }),
    ]);

    return {
      byStage,
      assigned,
      pending,
      overdue,
      dueToday,
      graduated,
      remindersDue,
      archived,
      archiveRequested,
      accessMode: access.mode,
    };
  }

  async listAssignees(churchId: string, actorUserId: string) {
    const access = await this.requireAccess(churchId, actorUserId);
    if (!access.canAssign) return [];

    return this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: {
          some: {
            role: { name: { in: ['ADMIN', 'PASTOR', 'LEADER'] } },
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(
    churchId: string,
    data: {
      memberId?: string;
      contactName: string;
      contactPhone?: string;
      contactEmail?: string;
      stage?: string;
      assignedToId?: string;
      dueAt?: string;
      notes?: string;
      referredBy?: string;
      scheduleReminder?: boolean;
      reminderChannel?: string;
      wsfCellBranchId?: string | null;
    },
    actorUserId?: string,
  ) {
    if (actorUserId) {
      const access = await this.requireAccess(churchId, actorUserId);
      if (!access.canCreate) {
        throw new ForbiddenException('Only Establishment managers can create contacts');
      }
      if (data.assignedToId && !access.canAssign) {
        throw new ForbiddenException('You cannot assign Establishment contacts');
      }
      if (data.wsfCellBranchId && !access.canAssignWsf) {
        throw new ForbiddenException('You cannot assign contacts to a WSF');
      }
    }
    const contact = CreateFollowUpSchema.safeParse({
      memberId: data.memberId,
      contactName: data.contactName,
      contactPhone: data.contactPhone || undefined,
      contactEmail: data.contactEmail || undefined,
      stage: data.stage,
      assignedToId: data.assignedToId || undefined,
      dueAt: data.dueAt || undefined,
      notes: data.notes,
    });
    if (!contact.success) {
      throw new BadRequestException(contact.error.issues[0]?.message ?? 'Invalid follow-up details');
    }

    if (data.wsfCellBranchId) {
      const branch = await this.prisma.cellBranch.findFirst({
        where: { id: data.wsfCellBranchId, churchId },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('WSF cell branch not found');
    }

    const assignedToId = contact.data.assignedToId ?? data.assignedToId;
    await this.assertAssigneeInChurch(churchId, assignedToId);
    const flags = await this.pipelineFlags(churchId);
    const stage = contact.data.stage ?? entryStageKey(flags);
    await this.assertStageInPipeline(churchId, stage);
    const assignedNow = assignedToId ? new Date() : null;
    const explicitDue = data.dueAt ? new Date(data.dueAt) : undefined;

    const followUp = await this.prisma.followUp.create({
      data: {
        churchId,
        memberId: contact.data.memberId,
        contactName: contact.data.contactName,
        contactPhone: contact.data.contactPhone,
        contactEmail: contact.data.contactEmail,
        // Managers may set stage via create; default NEW_LEAD. Stage changes after create use updateStage (audited).
        stage,
        assignedToId,
        assignedAt: assignedNow,
        stageAtAssignment: assignedToId ? stage : null,
        assignmentStaleNotifiedAt: null,
        lastProgressAt: assignedNow,
        wsfCellBranchId: data.wsfCellBranchId ?? undefined,
        dueAt:
          explicitDue ??
          (assignedNow ? dueAtFromProgress(assignedNow) : undefined),
        notes: contact.data.notes,
        referredBy: data.referredBy?.trim() || null,
      },
      include: followUpInclude,
    });

    if (data.scheduleReminder !== false && followUp.dueAt) {
      await this.scheduleReminder(churchId, followUp.id, {
        remindAt: followUp.dueAt.toISOString(),
        channel: data.reminderChannel ?? 'WHATSAPP',
        message: `Follow-up reminder: ${data.contactName}`,
      });
    }

    await this.automation.onFollowUpEvent(churchId, followUp.id, 'NEW_LEAD');

    if (followUp.assignedToId && actorUserId) {
      try {
        await this.teamNotify.notifyAssigneeOnAssignment({
          churchId,
          followUpId: followUp.id,
          contactName: followUp.contactName,
          assignedToId: followUp.assignedToId,
          assignedByUserId: actorUserId,
        });
      } catch (err) {
        this.logger.warn(
          `Assignment notify failed for ${followUp.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return this.getOne(churchId, followUp.id, actorUserId);
  }

  async update(
    churchId: string,
    id: string,
    raw: Record<string, unknown>,
    actorUserId: string,
  ) {
    const parsed = UpdateFollowUpSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid Establishment update payload',
      );
    }
    const data = parsed.data;

    const existing = await this.getOne(churchId, id, actorUserId);
    const access = await this.requireAccess(churchId, actorUserId);

    const assigning =
      data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId;
    const assigningWsf =
      data.wsfCellBranchId !== undefined &&
      data.wsfCellBranchId !== existing.wsfCellBranchId;

    if (assigning && !access.canAssign) {
      throw new ForbiddenException('You cannot assign Establishment contacts');
    }
    if (assigningWsf && !access.canAssignWsf) {
      throw new ForbiddenException('You cannot assign contacts to a WSF');
    }

    if (
      !assigning &&
      !assigningWsf &&
      !this.moduleAccess.canMutateEstablishmentRecord(access, actorUserId, existing)
    ) {
      throw new ForbiddenException('You cannot edit this Establishment contact');
    }
    if (
      (assigning || assigningWsf) &&
      access.mode !== 'manager' &&
      !this.moduleAccess.canMutateEstablishmentRecord(access, actorUserId, existing)
    ) {
      // Managers assign any; workers never reach here due to canAssign checks.
      throw new ForbiddenException('You cannot edit this Establishment contact');
    }

    if (data.wsfCellBranchId) {
      const branch = await this.prisma.cellBranch.findFirst({
        where: { id: data.wsfCellBranchId, churchId },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('WSF cell branch not found');
    }

    await this.assertAssigneeInChurch(churchId, data.assignedToId);

    let dueAt: Date | null | undefined = undefined;
    if (data.dueAt === null || data.dueAt === '') dueAt = null;
    else if (typeof data.dueAt === 'string') {
      const parsedDue = new Date(data.dueAt);
      if (Number.isNaN(parsedDue.getTime())) {
        throw new BadRequestException('Invalid due date');
      }
      dueAt = parsedDue;
    }

    const progressNow = new Date();
    const assignmentClock =
      data.assignedToId === undefined
        ? {}
        : data.assignedToId
          ? {
              assignedToId: data.assignedToId,
              assignedAt: progressNow,
              stageAtAssignment: existing.stage,
              assignmentStaleNotifiedAt: null,
              lastProgressAt: progressNow,
              ...(dueAt === undefined ? { dueAt: dueAtFromProgress(progressNow) } : {}),
            }
          : {
              assignedToId: null,
              assignedAt: null,
              stageAtAssignment: null,
              assignmentStaleNotifiedAt: null,
              lastProgressAt: null,
            };

    const updated = await this.prisma.followUp.update({
      where: { id },
      data: {
        ...(data.contactName !== undefined ? { contactName: data.contactName } : {}),
        ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone ?? null } : {}),
        ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail ?? null } : {}),
        ...assignmentClock,
        ...(data.wsfCellBranchId !== undefined ? { wsfCellBranchId: data.wsfCellBranchId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.nextAction !== undefined ? { nextAction: data.nextAction } : {}),
        ...(dueAt !== undefined ? { dueAt } : {}),
      },
      include: followUpInclude,
    });

    if (assigning && updated.assignedToId) {
      try {
        await this.teamNotify.notifyAssigneeOnAssignment({
          churchId,
          followUpId: id,
          contactName: updated.contactName,
          assignedToId: updated.assignedToId,
          assignedByUserId: actorUserId,
        });
      } catch (err) {
        this.logger.warn(
          `Assignment notify failed for ${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return updated;
  }

  async linkMember(
    churchId: string,
    followUpId: string,
    memberId: string,
    actorId?: string,
  ) {
    await this.getOne(churchId, followUpId);
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const updated = await this.prisma.followUp.update({
      where: { id: followUpId },
      data: { memberId: member.id },
      include: followUpInclude,
    });

    const flags = await this.pipelineFlags(churchId);
    if (isArchiveBlockedStageKey(updated.stage, flags) && !updated.archivedAt) {
      return this.completeJoinedGroupAsMember(churchId, followUpId, actorId ?? null);
    }
    return updated;
  }

  async createMemberFromLead(churchId: string, followUpId: string, actorId?: string) {
    const followUp = await this.getOne(churchId, followUpId);
    if (followUp.memberId) {
      throw new BadRequestException('This lead is already linked to a member');
    }

    const parts = followUp.contactName.trim().split(/\s+/);
    const firstName = parts[0] ?? 'Unknown';
    const lastName = parts.slice(1).join(' ') || 'Guest';

    const member = await this.prisma.member.create({
      data: {
        churchId,
        firstName,
        lastName,
        email: followUp.contactEmail,
        phone: followUp.contactPhone,
        status: 'VISITOR',
        roles: ['ADULT'],
        ministryInterests: ['Follow-up & Discipleship'],
        notes: followUp.notes,
        onboardingStep: 0,
        gamification: { create: {} },
      },
    });

    const updated = await this.prisma.followUp.update({
      where: { id: followUpId },
      data: { memberId: member.id },
      include: followUpInclude,
    });

    const flags = await this.pipelineFlags(churchId);
    if (isArchiveBlockedStageKey(updated.stage, flags) && !updated.archivedAt) {
      return this.completeJoinedGroupAsMember(churchId, followUpId, actorId ?? null);
    }
    return updated;
  }

  /** Leave archive-blocked stage after conversion to Membership (bypasses archive block). */
  private async completeJoinedGroupAsMember(
    churchId: string,
    id: string,
    actorId: string | null,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    const flags = await this.pipelineFlags(churchId);
    if (!existing || !isArchiveBlockedStageKey(existing.stage, flags) || existing.archivedAt) {
      return this.getOne(churchId, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          archivedById: actorId,
          archiveReason: 'Converted to Member from Joined Group',
          archiveRequestedAt: null,
          archiveRequestedById: null,
          archiveRequestReason: null,
          dueAt: null,
          completedAt: new Date(),
        },
        include: followUpInclude,
      });

      if (actorId) {
        await tx.pastoralNote.create({
          data: {
            churchId,
            authorId: actorId,
            followUpId: id,
            memberId: row.memberId,
            content: 'Converted to Member — left Joined Group phase.',
            isConfidential: false,
            stageAtTime: existing.stage,
            kind: 'ARCHIVE',
          },
        });
      }

      await tx.followUpReminder.updateMany({
        where: { followUpId: id, sentAt: null },
        data: { sentAt: new Date() },
      });

      return row;
    });
  }

  async updateStage(
    churchId: string,
    id: string,
    authorId: string,
    data: {
      stage: string;
      notes?: string;
      whatWasDone?: string;
      whatNext?: string;
      dueAt?: string | null;
    },
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) {
      throw new BadRequestException('Archived leads cannot progress in the pipeline');
    }

    const access = await this.requireAccess(churchId, authorId);
    if (
      !this.moduleAccess.canMutateEstablishmentRecord(access, authorId, existing)
    ) {
      throw new ForbiddenException('You cannot update this Establishment contact');
    }

    const flags = await this.assertStageInPipeline(churchId, data.stage);

    const whatWasDone = data.whatWasDone?.trim() ?? '';
    const whatNext = data.whatNext?.trim() ?? '';
    let dueAt: Date | null | undefined = undefined;
    if (data.dueAt === null) dueAt = null;
    else if (typeof data.dueAt === 'string' && data.dueAt.trim()) {
      const parsed = new Date(data.dueAt);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid due date');
      dueAt = parsed;
    }

    const progressNoteParts: string[] = [];
    if (whatWasDone) progressNoteParts.push(`What was done:\n${whatWasDone}`);
    if (whatNext) progressNoteParts.push(`What should be done next:\n${whatNext}`);
    if (dueAt) {
      progressNoteParts.push(
        `When it should be done:\n${dueAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`,
      );
    }
    const progressNote = progressNoteParts.join('\n\n');

    const enteringJoinedGroup =
      isArchiveBlockedStageKey(data.stage, flags) &&
      !isArchiveBlockedStageKey(existing.stage, flags);
    const leavingJoinedGroup =
      isArchiveBlockedStageKey(existing.stage, flags) &&
      !isArchiveBlockedStageKey(data.stage, flags);

    const stageChanged = existing.stage !== data.stage;
    const progressNow = stageChanged ? new Date() : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          stage: data.stage,
          notes: data.notes ?? (progressNote || existing.notes),
          ...(dueAt !== undefined
            ? { dueAt }
            : progressNow
              ? { dueAt: dueAtFromProgress(progressNow) }
              : {}),
          ...(whatNext ? { nextAction: whatNext } : {}),
          ...(stageChanged && progressNow
            ? {
                assignmentStaleNotifiedAt: null,
                lastProgressAt: progressNow,
              }
            : {}),
          ...(enteringJoinedGroup
            ? { completedAt: new Date(), joinedGroupDay6NotifiedAt: null }
            : leavingJoinedGroup
              ? { completedAt: null, joinedGroupDay6NotifiedAt: null }
              : {}),
        },
        include: followUpInclude,
      });

      if (progressNote) {
        await tx.pastoralNote.create({
          data: {
            churchId,
            authorId,
            followUpId: id,
            memberId: existing.memberId,
            content: progressNote,
            isConfidential: false,
            stageAtTime: data.stage,
            kind: 'STAGE_PROGRESS',
          },
        });
      }

      if (stageChanged) {
        await tx.followUpStageAudit.create({
          data: {
            churchId,
            followUpId: id,
            actorId: authorId,
            fromStage: existing.stage,
            toStage: data.stage,
            note: progressNote || data.notes?.trim() || null,
          },
        });
      }

      return row;
    });

    if (dueAt) {
      await this.scheduleStaffDueReminder(churchId, id, dueAt, whatNext || undefined);
    }

    await this.automation.onFollowUpEvent(churchId, id, { stage: data.stage });

    return updated;
  }

  /** Managers only — stage-change audit trail for a contact. */
  async listStageAudits(churchId: string, followUpId: string, actorUserId: string) {
    const access = await this.requireAccess(churchId, actorUserId);
    if (access.mode !== 'manager') {
      throw new ForbiddenException('Only Establishment managers can view stage audit history');
    }
    await this.getOne(churchId, followUpId, actorUserId);

    return this.prisma.followUpStageAudit.findMany({
      where: { churchId, followUpId },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** In-app (+ queue) reminder for assignee and unit leaders when next action is due. */
  private async scheduleStaffDueReminder(
    churchId: string,
    followUpId: string,
    dueAt: Date,
    nextAction?: string,
  ) {
    const followUp = await this.getOne(churchId, followUpId);
    if (followUp.archivedAt) return;

    const message = [
      `Next action due for ${followUp.contactName}.`,
      nextAction ? `Action: ${nextAction}` : null,
      `Open Outreach pipeline to follow up.`,
    ]
      .filter(Boolean)
      .join('\n');

    const reminder = await this.prisma.followUpReminder.create({
      data: {
        followUpId,
        remindAt: dueAt,
        channel: 'IN_APP',
        message,
      },
    });

    await this.notifications.scheduleFollowUpReminder({
      churchId,
      followUpId,
      reminderId: reminder.id,
      body: message,
      subject: `Action due: ${followUp.contactName}`,
      remindAt: dueAt,
      contactEmail: null,
      contactPhone: null,
      assignedToId: followUp.assignedToId,
      notifyLeaders: true,
    });
  }

  async scheduleReminder(
    churchId: string,
    followUpId: string,
    data: { remindAt: string; channel: string; message: string; templateId?: string },
    actorUserId?: string,
  ) {
    const followUp = await this.getOne(churchId, followUpId, actorUserId);
    if (actorUserId) {
      const access = await this.requireAccess(churchId, actorUserId);
      if (
        !this.moduleAccess.canMutateEstablishmentRecord(access, actorUserId, followUp)
      ) {
        throw new ForbiddenException('You cannot schedule reminders for this contact');
      }
    }
    const remindAt = new Date(data.remindAt);
    if (Number.isNaN(remindAt.getTime())) throw new BadRequestException('Invalid remindAt');

    let message = data.message;
    if (data.templateId) {
      const tpl = await this.prisma.followUpTemplate.findFirst({
        where: { id: data.templateId, churchId },
      });
      if (tpl) message = this.applyTemplate(tpl.body, followUp.contactName, churchId);
    }

    const reminder = await this.prisma.followUpReminder.create({
      data: {
        followUpId,
        remindAt,
        channel: data.channel,
        message,
      },
    });

    const channel = data.channel.toUpperCase();
    const useEmail = channel === 'EMAIL' || channel === 'BOTH' || channel === 'ALL';
    const useWhatsApp =
      channel === 'WHATSAPP' || channel === 'SMS' || channel === 'BOTH' || channel === 'ALL';
    const contactEmail = useEmail ? followUp.contactEmail : null;
    const contactPhone = useWhatsApp ? followUp.contactPhone : null;

    if (contactEmail || contactPhone || followUp.assignedToId) {
      await this.notifications.scheduleFollowUpReminder({
        churchId,
        followUpId,
        reminderId: reminder.id,
        body: message,
        subject: `Follow-up: ${followUp.contactName}`,
        remindAt,
        contactEmail,
        contactPhone,
        assignedToId: followUp.assignedToId,
        notifyLeaders: true,
      });
    }

    return reminder;
  }

  async createFromOutreach(
    churchId: string,
    data: {
      firstName: string;
      lastName?: string;
      phone?: string;
      email?: string;
      notes?: string;
      outreachContactId?: string;
      evangelistMemberId?: string | null;
      capturedByUserId?: string | null;
      referredBy?: string;
    },
  ) {
    const contactName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const phoneParsed = optionalPhoneSchema.safeParse(data.phone);
    const emailParsed = optionalEmailSchema.safeParse(data.email);
    const phone = phoneParsed.success ? phoneParsed.data : undefined;
    const email = emailParsed.success ? emailParsed.data : undefined;

    const orConditions: Array<{ contactPhone?: string; contactEmail?: string }> = [];
    if (phone) orConditions.push({ contactPhone: phone });
    if (email) orConditions.push({ contactEmail: email });

    if (orConditions.length > 0) {
      const existing = await this.prisma.followUp.findFirst({
        where: { churchId, archivedAt: null, OR: orConditions },
      });
      if (existing) {
        // Duplicate match: link capture only — do not append capturer-supplied notes
        // onto pipeline contacts the capturer may not be allowed to edit.
        if (data.outreachContactId) {
          await this.prisma.outreachContact.update({
            where: { id: data.outreachContactId },
            data: { followUpId: existing.id },
          });
        }
        return this.prisma.followUp.findFirstOrThrow({
          where: { id: existing.id, churchId },
          include: followUpInclude,
        });
      }
    }

    const assignedToId = await this.teamNotify.resolveAssigneeForCapture(churchId, {
      evangelistMemberId: data.evangelistMemberId,
      capturedByUserId: data.capturedByUserId,
    });

    const evangelistName = await this.teamNotify.getEvangelistDisplayName(
      churchId,
      data.evangelistMemberId,
    );

    const noteParts = ['Created from Outreach capture.'];
    if (data.outreachContactId) noteParts.push(`Outreach ID: ${data.outreachContactId}.`);
    if (evangelistName) noteParts.push(`Evangelist: ${evangelistName}.`);
    if (data.referredBy?.trim()) noteParts.push(`Referred by: ${data.referredBy.trim()}.`);
    if (data.notes?.trim()) noteParts.push(data.notes.trim());

    const flags = await this.pipelineFlags(churchId);
    const followUp = await this.create(churchId, {
      contactName,
      contactPhone: phone,
      contactEmail: email,
      stage: entryStageKey(flags),
      assignedToId,
      notes: noteParts.join(' '),
      referredBy: data.referredBy,
      scheduleReminder: false,
    });

    try {
      await this.teamNotify.notifyTeamOnNewLead({
        churchId,
        followUpId: followUp.id,
        contactName,
        contactPhone: phone,
        contactEmail: email,
        assignedToId: followUp.assignedToId,
        evangelistName,
      });
      if (followUp.assignedToId) {
        await this.teamNotify.notifyAssigneeOnAssignment({
          churchId,
          followUpId: followUp.id,
          contactName,
          assignedToId: followUp.assignedToId,
          assignedByUserId: data.capturedByUserId ?? null,
        });
      }
    } catch (err) {
      // Non-fatal — lead is already in the pipeline
      console.warn(
        `Team notify failed for follow-up ${followUp.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    if (data.outreachContactId) {
      await this.prisma.outreachContact.update({
        where: { id: data.outreachContactId },
        data: { followUpId: followUp.id },
      });
    }

    return followUp;
  }

  async listReminders(churchId: string, followUpId: string, actorUserId: string) {
    await this.getOne(churchId, followUpId, actorUserId);
    return this.prisma.followUpReminder.findMany({
      where: { followUpId },
      orderBy: { remindAt: 'asc' },
    });
  }

  async listTemplates(churchId: string) {
    const existing = await this.prisma.followUpTemplate.count({ where: { churchId } });
    if (existing === 0) {
      await this.prisma.followUpTemplate.createMany({
        data: DEFAULT_FOLLOW_UP_TEMPLATES.map((t) => ({
          churchId,
          name: t.name,
          channel: t.channel,
          subject: 'subject' in t ? t.subject : null,
          body: t.body,
        })),
      });
    }
    return this.prisma.followUpTemplate.findMany({
      where: { churchId, isActive: true },
      orderBy: [{ channel: 'asc' }, { name: 'asc' }],
    });
  }

  async createTemplate(
    churchId: string,
    data: { name: string; channel: string; body: string; subject?: string },
  ) {
    return this.prisma.followUpTemplate.create({
      data: { churchId, ...data },
    });
  }

  async sendTemplateNow(
    churchId: string,
    followUpId: string,
    templateId: string,
    actorUserId: string,
  ) {
    const followUp = await this.getOne(churchId, followUpId, actorUserId);
    const access = await this.requireAccess(churchId, actorUserId);
    if (
      !this.moduleAccess.canMutateEstablishmentRecord(access, actorUserId, followUp)
    ) {
      throw new ForbiddenException('You cannot message this Establishment contact');
    }
    const tpl = await this.prisma.followUpTemplate.findFirst({
      where: { id: templateId, churchId, isActive: true },
    });
    if (!tpl) throw new NotFoundException('Template not found');

    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    const body = this.applyTemplate(tpl.body, followUp.contactName, church?.name ?? 'Our church');
    const subject = tpl.subject
      ? this.applyTemplate(tpl.subject, followUp.contactName, church?.name ?? 'Our church')
      : 'Message from your church';

    if (tpl.channel === 'EMAIL') {
      if (!followUp.contactEmail) throw new BadRequestException('No email on this follow-up');
      await this.email.send({
        to: followUp.contactEmail,
        subject,
        body,
        churchId,
      });
    } else {
      if (!followUp.contactPhone) throw new BadRequestException('No phone on this follow-up');
      await this.sms.sendWhatsApp({ to: followUp.contactPhone, body, churchId });
    }

    return { success: true, channel: tpl.channel, preview: body };
  }

  private applyTemplate(text: string, contactName: string, churchName: string) {
    return text
      .replace(/\{\{name\}\}/gi, contactName)
      .replace(/\{\{church\}\}/gi, churchName);
  }

  async addPastoralNote(
    churchId: string,
    authorId: string,
    data: {
      content: string;
      isConfidential?: boolean;
      memberId?: string;
      followUpId?: string;
      stageAtTime?: string;
      kind?: string;
    },
  ) {
    if (!data.memberId && !data.followUpId) {
      throw new BadRequestException('memberId or followUpId required');
    }
    let stageAtTime = data.stageAtTime;
    if (data.followUpId) {
      const fu = await this.getOne(churchId, data.followUpId);
      if (!data.memberId && fu.memberId) data.memberId = fu.memberId;
      if (!stageAtTime) stageAtTime = fu.stage;
    }

    const created = await this.prisma.pastoralNote.create({
      data: {
        churchId,
        authorId,
        memberId: data.memberId,
        followUpId: data.followUpId,
        content: encryptPastoralNoteContent(data.content),
        isConfidential: data.isConfidential ?? true,
        stageAtTime: stageAtTime ?? null,
        kind: data.kind ?? 'NOTE',
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.securityAudit.append({
      churchId,
      actorId: authorId,
      action: 'CREATE_PASTORAL_NOTE',
      targetType: 'PastoralNote',
      targetId: created.id,
      metadata: {
        memberId: data.memberId ?? null,
        followUpId: data.followUpId ?? null,
        isConfidential: created.isConfidential,
      },
    });
    return mapPastoralNoteRow(created);
  }

  async archive(
    churchId: string,
    id: string,
    actorId: string,
    reason: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    const archiveFlags = await this.pipelineFlags(churchId);
    if (isArchiveBlockedStageKey(existing.stage, archiveFlags)) {
      throw new BadRequestException(
        'This pipeline stage cannot be archived. Convert the contact to a Member within 7 days.',
      );
    }

    const access = await this.requireAccess(churchId, actorId);
    if (!access.canArchive) {
      throw new ForbiddenException('Only Establishment managers can archive contacts');
    }

    const trimmed = reason.trim();
    if (trimmed.length < 3) throw new BadRequestException('Enter a reason for archiving');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          archivedById: actorId,
          archiveReason: trimmed,
          archiveRequestedAt: null,
          archiveRequestedById: null,
          archiveRequestReason: null,
          dueAt: null,
          completedAt: new Date(),
        },
        include: followUpInclude,
      });

      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: `Archived from membership journey.\nReason: ${trimmed}`,
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE',
        },
      });

      await tx.followUpReminder.updateMany({
        where: { followUpId: id, sentAt: null },
        data: { sentAt: new Date() },
      });

      return row;
    });

    if (existing.journeyDiscontinuedAt) {
      await this.notifyLeadershipOfArchive(churchId, existing.contactName);
    }

    return updated;
  }

  async discontinueJourney(
    churchId: string,
    id: string,
    actorId: string,
    data: { whatWasDone?: string; whatNext?: string; dueAt?: string | null },
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    if (existing.journeyDiscontinuedAt) {
      throw new BadRequestException('This journey is already marked to discontinue');
    }
    const flags = await this.pipelineFlags(churchId);
    if (isArchiveBlockedStageKey(existing.stage, flags)) {
      throw new BadRequestException(
        'This pipeline stage cannot be archived. Convert the contact to a Member within 7 days.',
      );
    }

    const access = await this.requireAccess(churchId, actorId);
    if (!this.moduleAccess.canMutateEstablishmentRecord(access, actorId, existing)) {
      throw new ForbiddenException('You cannot update this Establishment contact');
    }

    const whatWasDone = data.whatWasDone?.trim() ?? '';
    const whatNext = data.whatNext?.trim() ?? '';
    if (whatWasDone.length < 3 || whatNext.length < 3) {
      throw new BadRequestException('Describe what was done and what should happen next');
    }
    let dueAt: Date | null = null;
    if (typeof data.dueAt === 'string' && data.dueAt.trim()) {
      const parsed = new Date(data.dueAt);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid due date');
      dueAt = parsed;
    } else {
      throw new BadRequestException('Choose when it should be done');
    }

    const note = [
      'Discontinue Journey',
      `What was done:\n${whatWasDone}`,
      `What should be done next:\n${whatNext}`,
      `When it should be done:\n${dueAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`,
    ].join('\n\n');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          journeyDiscontinuedAt: new Date(),
          archiveRequestedAt: new Date(),
          archiveRequestedById: actorId,
          archiveRequestReason: whatWasDone,
          nextAction: whatNext,
          dueAt,
          notes: note,
        },
        include: followUpInclude,
      });
      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: encryptPastoralNoteContent(note),
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE_REQUEST',
        },
      });
      return row;
    });

    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { name: true },
    });
    const churchName = (church?.name ?? 'our church').replace(/[<>]/g, '');
    await this.sendDiscontinueFarewell(churchId, existing.contactEmail, existing.contactPhone, churchName);
    await this.notifyUnitLeaderToConfirmArchive(
      churchId,
      id,
      existing.contactName,
      existing.assignedToId,
    );
    return updated;
  }

  async requestArchive(
    churchId: string,
    id: string,
    actorId: string,
    reason: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    const requestFlags = await this.pipelineFlags(churchId);
    if (isArchiveBlockedStageKey(existing.stage, requestFlags)) {
      throw new BadRequestException(
        'This pipeline stage cannot be archived. Convert the contact to a Member within 7 days.',
      );
    }

    const access = await this.requireAccess(churchId, actorId);
    if (!access.canRequestArchive) {
      throw new ForbiddenException('You cannot request archive for Establishment contacts');
    }
    if (
      !this.moduleAccess.canMutateEstablishmentRecord(access, actorId, existing)
    ) {
      throw new ForbiddenException('You can only request archive on contacts assigned to you');
    }

    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('Explain why this lead should be archived');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archiveRequestedAt: new Date(),
          archiveRequestedById: actorId,
          archiveRequestReason: trimmed,
        },
        include: followUpInclude,
      });

      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: `Archive requested (DND).\nReason: ${trimmed}`,
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE_REQUEST',
        },
      });

      return row;
    });

    const requester = await this.prisma.user.findFirst({
      where: { id: actorId },
      select: { firstName: true, lastName: true },
    });
    const requesterName = requester
      ? `${requester.firstName} ${requester.lastName}`.trim()
      : 'A team member';

    await this.teamNotify.notifyTeamOnArchiveRequest({
      churchId,
      followUpId: id,
      contactName: existing.contactName,
      reason: trimmed,
      requesterName,
    });

    return updated;
  }

  async declineArchiveRequest(
    churchId: string,
    id: string,
    actorId: string,
    note?: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    if (!existing.archiveRequestedAt) {
      throw new BadRequestException('No pending archive request');
    }

    const access = await this.requireAccess(churchId, actorId);
    if (!access.canArchive) {
      throw new ForbiddenException('Only Establishment managers can decline archive requests');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archiveRequestedAt: null,
          archiveRequestedById: null,
          archiveRequestReason: null,
        },
        include: followUpInclude,
      });

      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: [
            'Archive request declined — lead stays in the pipeline.',
            note?.trim() ? `Note: ${note.trim()}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE_DECLINED',
        },
      });

      return row;
    });

    return updated;
  }

  async recontactArchived(
    churchId: string,
    id: string,
    actorId: string,
    data: { subject: string; body: string },
  ) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!followUp) throw new NotFoundException('Follow-up not found');
    if (!followUp.archivedAt) {
      throw new BadRequestException('Only archived leads can be re-contacted this way');
    }

    const access = await this.requireAccess(churchId, actorId);
    if (access.mode !== 'manager') {
      throw new ForbiddenException('Only Establishment managers can re-contact archived leads');
    }
    if (!followUp.contactEmail && !followUp.contactPhone) {
      throw new BadRequestException('No email or phone on this archived lead');
    }

    const subject = data.subject.trim();
    const body = data.body.trim();
    if (!subject || !body) throw new BadRequestException('Subject and message are required');

    const channels: string[] = [];
    if (followUp.contactEmail) {
      await this.email.send({
        to: followUp.contactEmail,
        subject,
        body,
        churchId,
      });
      channels.push('email');
    }
    if (followUp.contactPhone) {
      await trySendWhatsApp(this.sms, this.logger, {
        to: followUp.contactPhone,
        body: `${subject}\n\n${body}`,
        churchId,
        label: 'Archived recontact',
      });
      channels.push('whatsapp');
    }

    await this.prisma.pastoralNote.create({
      data: {
        churchId,
        authorId: actorId,
        followUpId: id,
        memberId: followUp.memberId,
        content: `Re-contacted by ${channels.join(' + ')}.\nSubject: ${subject}\n\n${body}`,
        isConfidential: false,
        stageAtTime: followUp.stage,
        kind: 'RECONTACT',
      },
    });

    return {
      success: true,
      to: followUp.contactEmail ?? undefined,
      phone: followUp.contactPhone ?? undefined,
      channels,
    };
  }

  async getPastoralNotes(
    churchId: string,
    requesterId: string,
    filters: { memberId?: string; followUpId?: string },
  ) {
    const notes = await this.prisma.pastoralNote.findMany({
      where: {
        churchId,
        ...(filters.memberId ? { memberId: filters.memberId } : {}),
        ...(filters.followUpId ? { followUpId: filters.followUpId } : {}),
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const isStaff = await this.userIsStaff(requesterId);
    const visible = notes
      .filter((n) => isStaff || !n.isConfidential || n.authorId === requesterId)
      .map((n) => mapPastoralNoteRow(n));
    await this.auditPastoralReads(churchId, requesterId, visible);
    return visible;
  }

  async softDeletePastoralNote(churchId: string, id: string, actorId: string) {
    const note = await this.prisma.pastoralNote.findFirst({ where: { id, churchId } });
    if (!note) throw new NotFoundException('Pastoral note not found');
    await this.prisma.pastoralNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.securityAudit.append({
      churchId,
      actorId,
      action: 'SOFT_DELETE_PASTORAL_NOTE',
      targetType: 'PastoralNote',
      targetId: id,
    });
    return { success: true };
  }

  async restorePastoralNote(churchId: string, id: string, actorId: string) {
    return runWithTenantContextAsync({ includeDeleted: true }, async () => {
      const note = await this.prisma.pastoralNote.findFirst({
        where: { id, churchId, deletedAt: { not: null } },
      });
      if (!note) throw new NotFoundException('Deleted pastoral note not found');
      await this.prisma.pastoralNote.update({
        where: { id },
        data: { deletedAt: null },
      });
      await this.securityAudit.append({
        churchId,
        actorId,
        action: 'RESTORE_PASTORAL_NOTE',
        targetType: 'PastoralNote',
        targetId: id,
      });
      return mapPastoralNoteRow(
        await this.prisma.pastoralNote.findFirstOrThrow({ where: { id, churchId } }),
      );
    });
  }

  async listDeletedPastoralNotes(churchId: string) {
    return runWithTenantContextAsync({ includeDeleted: true }, async () => {
      const notes = await this.prisma.pastoralNote.findMany({
        where: { churchId, deletedAt: { not: null } },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { deletedAt: 'desc' },
      });
      return notes.map((n) => mapPastoralNoteRow(n));
    });
  }

  private async auditPastoralReads(
    churchId: string,
    actorId: string,
    notes: Array<{ id: string; isConfidential: boolean }>,
  ) {
    const confidential = notes.filter((n) => n.isConfidential);
    await Promise.all(
      confidential.map((n) =>
        this.securityAudit.append({
          churchId,
          actorId,
          action: 'READ_PASTORAL_NOTE',
          targetType: 'PastoralNote',
          targetId: n.id,
        }),
      ),
    );
  }

  private async userIsStaff(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const names = roles.map((r) => r.role.name);
    return names.includes('ADMIN') || names.includes('PASTOR') || names.includes('LEADER');
  }

  private async sendDiscontinueFarewell(
    churchId: string,
    email: string | null,
    phone: string | null,
    churchName: string,
  ) {
    const title = "Oh Wow, It's Disheartening To See You Leave";
    const body = [
      "We are so glad you fellowshipped with us though it's sad that you are leaving so soon but we are confident that the presence of God will not depart from you.",
      'Thank you for the time you spent with us and we look forward to seeing you another time.',
      'If you would like us to keep in touch when we have special events, do let us know and we will keep you posted when we have such events.',
      `We pray that God bless you abundantly in Jesus name. With love from ${churchName}`,
    ].join(' ');
    if (email) {
      await this.email.send({ to: email, subject: title, body, churchId });
    }
    if (phone) {
      await trySendWhatsApp(this.sms, this.logger, {
        to: phone,
        body: `${title}\n\n${body}`,
        churchId,
        label: 'Discontinue journey',
      });
    }
  }

  private async notifyUnitLeaderToConfirmArchive(
    churchId: string,
    followUpId: string,
    contactName: string,
    assignedToId: string | null,
  ) {
    const leaderSelect = {
      leaders: {
        select: {
          isUnitAdmin: true,
          role: true,
          member: { select: { userId: true } },
        },
      },
    } as const;
    const assignedScope = assignedToId
      ? {
          OR: [
            { members: { some: { member: { userId: assignedToId } } } },
            { leaders: { some: { member: { userId: assignedToId } } } },
          ],
        }
      : {};
    let units = await this.prisma.serviceUnit.findMany({
      where: {
        churchId,
        isActive: true,
        name: { in: [...ESTABLISHMENT_MANAGER_UNIT_NAMES] },
        ...assignedScope,
      },
      select: leaderSelect,
    });
    if (units.length === 0) {
      units = await this.prisma.serviceUnit.findMany({
        where: { churchId, isActive: true, name: FOLLOW_UP_UNIT_NAME },
        select: leaderSelect,
      });
    }
    const userIds = new Set<string>();
    for (const unit of units) {
      for (const leader of unit.leaders) {
        if ((leader.isUnitAdmin || !isUnitDeputyRole(leader.role)) && leader.member.userId) {
          userIds.add(leader.member.userId);
        }
      }
    }
    const leaders = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] }, churchId, isActive: true },
      select: { id: true },
    });
    const title = `Confirm archiving ${contactName}`;
    const body = `${contactName} discontinued their membership journey. Confirm archiving so the contact moves to Archived leads.`;
    await Promise.all(
      leaders.map((leader) =>
        this.prisma.notification.create({
          data: {
            churchId,
            userId: leader.id,
            title,
            body,
            type: 'FOLLOW_UP_ARCHIVE_REQUEST',
            data: { followUpId, channel: 'in_app' },
          },
        }),
      ),
    );
  }

  private async notifyLeadershipOfArchive(churchId: string, contactName: string) {
    const recipients = await findOneAdminAndOnePastor(this.prisma, churchId);
    const title = 'A contact has been archived';
    const body = `${contactName} has been archived.`;
    await Promise.all(
      recipients.map(async (staff) => {
        await this.prisma.notification.create({
          data: {
            churchId,
            userId: staff.id,
            title,
            body,
            type: 'FOLLOW_UP_ARCHIVED',
            data: { channel: 'in_app' },
          },
        });
        if (staff.email) {
          await this.email.send({ to: staff.email, subject: title, body, churchId });
        }
      }),
    );
  }
}

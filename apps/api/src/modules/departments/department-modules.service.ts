import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceScope,
  DeptPrayerItemStatus,
  DeptReportCategory,
  DeptScheduleType,
  DeptTaskStatus,
  DepartmentCode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  DEPT_MODULE_LABEL,
  resolveDeptModuleCode,
} from '../../../prisma/dept-module-catalog';
import {
  enabledTabsForDepartment,
  parseDepartmentModuleSettings,
} from '../../common/department-module-settings';
import { DepartmentAccessService } from './department-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { MedicalDepartmentService } from './medical-department.service';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class DepartmentModulesService {
  private readonly logger = new Logger(DepartmentModulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DepartmentAccessService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly medical: MedicalDepartmentService,
  ) {}

  private async safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  }

  async getContext(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.access.requireView(userId, churchId, serviceUnitId);
    const code = resolveDeptModuleCode(unit.departmentCode, unit.name) as DepartmentCode;
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    const deptConfig = parseDepartmentModuleSettings(church?.settings ?? {});
    const flags = this.access.accessFlags(ctx, serviceUnitId);
    let enabledTabs = enabledTabsForDepartment(
      deptConfig,
      code as Parameters<typeof enabledTabsForDepartment>[1],
    );
    if (!flags.canViewFeedbacks) {
      enabledTabs = enabledTabs.filter((t) => t !== 'feedbacks' && t !== 'reports');
    }

    return {
      unit: {
        id: unit.id,
        name: unit.name,
        departmentCode: code,
        departmentLabel: DEPT_MODULE_LABEL[code] ?? unit.name,
      },
      access: flags,
      ui: { enabledTabs },
    };
  }

  async getDashboard(userId: string, churchId: string, serviceUnitId: string) {
    const { unit } = await this.access.requireView(userId, churchId, serviceUnitId);
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setUTCDate(weekAhead.getUTCDate() + 7);
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 28);

    const code = resolveDeptModuleCode(unit.departmentCode, unit.name);

    const [
      memberCount,
      attendanceSessions4wk,
      upcomingSchedules,
      openAssignments,
      lowInventory,
      openPrayer,
      openTasks,
      recentIncidents,
      activeCheckIns,
    ] = await Promise.all([
      this.prisma.serviceUnitMember.count({ where: { serviceUnitId } }),
      this.prisma.attendanceRecord.count({
        where: {
          churchId,
          serviceUnitId,
          scope: AttendanceScope.DEPARTMENT,
          serviceDate: { gte: since },
        },
      }),
      this.safe('deptSchedule.count', () =>
        this.prisma.deptSchedule.count({
          where: { serviceUnitId, startsAt: { gte: now, lte: weekAhead } },
        }),
      0),
      this.safe('deptAssignment.count', () =>
        this.prisma.deptAssignment.count({
          where: { serviceUnitId, status: { in: ['OPEN', 'ASSIGNED'] } },
        }),
      0),
      this.safe('deptInventoryItem.count', () =>
        this.prisma.deptInventoryItem.count({
          where: {
            serviceUnitId,
            OR: [{ minQuantity: { not: null }, quantity: { lte: 0 } }],
          },
        }),
      0),
      code === 'PRAYER'
        ? this.safe('deptPrayerItem.count', () =>
            this.prisma.deptPrayerItem.count({
              where: { serviceUnitId, isAnswered: false },
            }),
          0)
        : Promise.resolve(0),
      code === 'MEDIA'
        ? this.safe('deptTask.count', () =>
            this.prisma.deptTask.count({
              where: { serviceUnitId, status: { not: 'DONE' } },
            }),
          0)
        : Promise.resolve(0),
      code === 'MEDICAL'
        ? this.safe('deptIncident.count', () =>
            this.prisma.deptIncident.count({
              where: { serviceUnitId, resolvedAt: null },
            }),
          0)
        : Promise.resolve(0),
      code === 'CHILDREN'
        ? this.safe('deptChildCheckIn.count', () =>
            this.prisma.deptChildCheckIn.count({
              where: { serviceUnitId, checkedOutAt: null },
            }),
          0)
        : Promise.resolve(0),
    ]);

    const schedules = await this.safe(
      'deptSchedule.findMany',
      () =>
        this.prisma.deptSchedule.findMany({
          where: { serviceUnitId, startsAt: { gte: now } },
          orderBy: { startsAt: 'asc' },
          take: 5,
          include: { assignedMember: { select: memberSelect } },
        }),
      [] as Awaited<ReturnType<typeof this.prisma.deptSchedule.findMany>>,
    );

    return {
      stats: {
        memberCount,
        attendanceSessions4wk,
        upcomingSchedules,
        openAssignments,
        lowInventory,
        openPrayer,
        openTasks,
        recentIncidents,
        activeCheckIns,
      },
      upcoming: schedules,
    };
  }

  // ─── Schedules ───────────────────────────────────────────────

  listSchedules(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptSchedule.findMany({
        where: { serviceUnitId },
        orderBy: { startsAt: 'desc' },
        take: 100,
        include: { assignedMember: { select: memberSelect } },
      }),
    );
  }

  async createSchedule(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      type: DeptScheduleType;
      title: string;
      description?: string;
      location?: string;
      startsAt: string;
      endsAt?: string;
      assignedMemberId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    return this.prisma.deptSchedule.create({
      data: {
        churchId,
        serviceUnitId,
        type: body.type,
        title: body.title,
        description: body.description,
        location: body.location,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        assignedMemberId: body.assignedMemberId,
        metadata: (body.metadata ?? {}) as object,
      },
      include: { assignedMember: { select: memberSelect } },
    });
  }

  async deleteSchedule(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.prisma.deptSchedule.deleteMany({ where: { id, serviceUnitId, churchId } });
    return { ok: true };
  }

  // ─── Assignments ─────────────────────────────────────────────

  listAssignments(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptAssignment.findMany({
        where: { serviceUnitId },
        orderBy: { createdAt: 'desc' },
        include: { member: { select: memberSelect } },
      }),
    );
  }

  async upsertAssignment(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      title: string;
      role?: string;
      memberId?: string;
      dueAt?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    const canManage = this.access.accessFlags(ctx, serviceUnitId).canManage;
    if (body.id) {
      const existing = await this.prisma.deptAssignment.findFirst({
        where: { id: body.id, serviceUnitId },
      });
      if (!existing) throw new Error('Assignment not found');
      if (!canManage && existing.memberId !== ctx.memberId) {
        throw new Error('Cannot edit this assignment');
      }
      return this.prisma.deptAssignment.update({
        where: { id: body.id },
        data: {
          title: body.title,
          role: body.role,
          memberId: body.memberId,
          dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
          status: body.status as never,
          metadata: (body.metadata ?? {}) as object,
        },
        include: { member: { select: memberSelect } },
      });
    }
    if (!canManage && !body.memberId) {
      await this.access.requireManage(userId, churchId, serviceUnitId);
    }
    return this.prisma.deptAssignment.create({
      data: {
        churchId,
        serviceUnitId,
        title: body.title,
        role: body.role,
        memberId: body.memberId,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        status: (body.status as never) ?? 'OPEN',
        metadata: (body.metadata ?? {}) as object,
      },
      include: { member: { select: memberSelect } },
    });
  }

  async deleteAssignment(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    await this.prisma.deptAssignment.deleteMany({ where: { id, serviceUnitId } });
    return { ok: true };
  }

  // ─── Inventory ───────────────────────────────────────────────

  listInventory(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptInventoryItem.findMany({
        where: { serviceUnitId },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async upsertInventory(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      name: string;
      quantity: number;
      minQuantity?: number;
      expiryDate?: string;
      location?: string;
      category?: string;
      notes?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    if (body.id) {
      return this.prisma.deptInventoryItem.update({
        where: { id: body.id },
        data: {
          name: body.name,
          quantity: body.quantity,
          minQuantity: body.minQuantity,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
          location: body.location,
          category: body.category,
          notes: body.notes,
        },
      });
    }
    return this.prisma.deptInventoryItem.create({
      data: {
        churchId,
        serviceUnitId,
        name: body.name,
        quantity: body.quantity,
        minQuantity: body.minQuantity,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        location: body.location,
        category: body.category,
        notes: body.notes,
      },
    });
  }

  // ─── Resources ───────────────────────────────────────────────

  listResources(userId: string, churchId: string, serviceUnitId: string, category?: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptResource.findMany({
        where: { serviceUnitId, ...(category ? { category } : {}) },
        orderBy: { createdAt: 'desc' },
        include: { author: { select: memberSelect } },
      }),
    );
  }

  async createResource(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      category: string;
      title: string;
      fileUrl?: string;
      body?: string;
      tags?: string[];
    },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    return this.prisma.deptResource.create({
      data: {
        churchId,
        serviceUnitId,
        category: body.category,
        title: body.title,
        fileUrl: body.fileUrl,
        body: body.body,
        tags: body.tags ?? [],
        authorId: ctx.memberId ?? undefined,
      },
      include: { author: { select: memberSelect } },
    });
  }

  // ─── Tasks (Kanban) ──────────────────────────────────────────

  listTasks(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptTask.findMany({
        where: { serviceUnitId },
        orderBy: [{ column: 'asc' }, { sortOrder: 'asc' }],
        include: { assignee: { select: memberSelect } },
      }),
    );
  }

  async upsertTask(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      title: string;
      status?: DeptTaskStatus;
      column?: string;
      sortOrder?: number;
      assigneeId?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    if (body.id) {
      return this.prisma.deptTask.update({
        where: { id: body.id },
        data: {
          title: body.title,
          status: body.status,
          column: body.column,
          sortOrder: body.sortOrder,
          assigneeId: body.assigneeId,
        },
        include: { assignee: { select: memberSelect } },
      });
    }
    return this.prisma.deptTask.create({
      data: {
        churchId,
        serviceUnitId,
        title: body.title,
        status: body.status ?? 'TODO',
        column: body.column ?? 'backlog',
        sortOrder: body.sortOrder ?? 0,
        assigneeId: body.assigneeId,
      },
      include: { assignee: { select: memberSelect } },
    });
  }

  // ─── Incidents (Medical) ─────────────────────────────────────

  listIncidents(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(async ({ unit }) => {
      const code = resolveDeptModuleCode(unit.departmentCode, unit.name);
      if (code === 'MEDICAL') {
        return this.medical.listIncidents(userId, churchId, serviceUnitId);
      }
      return this.prisma.deptIncident.findMany({
        where: { serviceUnitId },
        orderBy: { occurredAt: 'desc' },
        include: { reporter: { select: memberSelect } },
      });
    });
  }

  async createIncident(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      title: string;
      description: string;
      severity?: string;
      occurredAt: string;
      category?: string;
      subjectMemberId?: string;
      memberHint?: { firstName?: string; lastName?: string; phone?: string };
      followUpRequired?: boolean;
      requestPrayerTeam?: boolean;
    },
  ) {
    const { ctx, unit } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    const code = resolveDeptModuleCode(unit.departmentCode, unit.name);
    if (code === 'MEDICAL') {
      return this.medical.createIncident(userId, churchId, serviceUnitId, {
        ...body,
        category: body.category as never,
      });
    }
    const authorId = await this.access.resolveAuthorMemberId(ctx);
    return this.prisma.deptIncident.create({
      data: {
        churchId,
        serviceUnitId,
        reporterId: authorId,
        title: body.title,
        description: body.description,
        severity: body.severity ?? 'LOW',
        occurredAt: new Date(body.occurredAt),
      },
      include: { reporter: { select: memberSelect } },
    });
  }

  // ─── Child check-in ──────────────────────────────────────────

  listCheckIns(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptChildCheckIn.findMany({
        where: { serviceUnitId },
        orderBy: { checkedInAt: 'desc' },
        take: 50,
        include: {
          child: { select: memberSelect },
          guardian: { select: memberSelect },
        },
      }),
    );
  }

  async checkInChild(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      childMemberId: string;
      guardianMemberId?: string;
      classGroup?: string;
      notes?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    return this.prisma.deptChildCheckIn.create({
      data: {
        churchId,
        serviceUnitId,
        childMemberId: body.childMemberId,
        guardianMemberId: body.guardianMemberId,
        classGroup: body.classGroup,
        notes: body.notes,
      },
      include: {
        child: { select: memberSelect },
        guardian: { select: memberSelect },
      },
    });
  }

  async checkOutChild(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    return this.prisma.deptChildCheckIn.update({
      where: { id },
      data: { checkedOutAt: new Date() },
    });
  }

  // ─── Prayer queue ────────────────────────────────────────────

  listPrayerItems(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptPrayerItem.findMany({
        where: { serviceUnitId },
        orderBy: { createdAt: 'desc' },
        include: { assignedMember: { select: memberSelect } },
      }),
    );
  }

  async createPrayerItem(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      content: string;
      requesterName?: string;
      isAnonymous?: boolean;
      assignedMemberId?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    return this.prisma.deptPrayerItem.create({
      data: {
        churchId,
        serviceUnitId,
        content: body.content,
        requesterName: body.requesterName,
        isAnonymous: body.isAnonymous ?? false,
        assignedMemberId: body.assignedMemberId,
        status: body.assignedMemberId ? 'ASSIGNED' : 'NEW',
      },
      include: { assignedMember: { select: memberSelect } },
    });
  }

  async updatePrayerItem(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    id: string,
    body: {
      status?: DeptPrayerItemStatus;
      assignedMemberId?: string;
      isAnswered?: boolean;
      answeredNote?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    return this.prisma.deptPrayerItem.update({
      where: { id },
      data: {
        status: body.status,
        assignedMemberId: body.assignedMemberId,
        isAnswered: body.isAnswered,
        answeredNote: body.answeredNote,
        answeredAt: body.isAnswered ? new Date() : undefined,
      },
      include: { assignedMember: { select: memberSelect } },
    });
  }

  // ─── Skills, songs, certifications ───────────────────────────

  listSkills(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptSkill.findMany({
        where: { serviceUnitId },
        include: { member: { select: memberSelect } },
      }),
    );
  }

  async addSkill(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { memberId: string; skill: string; level?: string },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    return this.prisma.deptSkill.create({
      data: { churchId, serviceUnitId, ...body },
      include: { member: { select: memberSelect } },
    });
  }

  listSongs(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptChoirSong.findMany({ where: { serviceUnitId }, orderBy: { title: 'asc' } }),
    );
  }

  async upsertSong(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      title: string;
      musicalKey?: string;
      vocalParts?: Record<string, unknown>;
      recordingUrl?: string;
      notes?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    if (body.id) {
      return this.prisma.deptChoirSong.update({
        where: { id: body.id },
        data: {
          title: body.title,
          musicalKey: body.musicalKey,
          vocalParts: (body.vocalParts ?? {}) as object,
          recordingUrl: body.recordingUrl,
          notes: body.notes,
        },
      });
    }
    return this.prisma.deptChoirSong.create({
      data: {
        churchId,
        serviceUnitId,
        title: body.title,
        musicalKey: body.musicalKey,
        vocalParts: (body.vocalParts ?? {}) as object,
        recordingUrl: body.recordingUrl,
        notes: body.notes,
      },
    });
  }

  listCertifications(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptCertification.findMany({
        where: { serviceUnitId },
        include: { member: { select: memberSelect } },
      }),
    );
  }

  async addCertification(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      memberId: string;
      title: string;
      issuedAt?: string;
      expiresAt?: string;
      notes?: string;
    },
  ) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    return this.prisma.deptCertification.create({
      data: {
        churchId,
        serviceUnitId,
        memberId: body.memberId,
        title: body.title,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        notes: body.notes,
      },
      include: { member: { select: memberSelect } },
    });
  }

  // ─── Progress notes, checklist, follow-ups ───────────────────

  listProgressNotes(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptProgressNote.findMany({
        where: { serviceUnitId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          child: { select: memberSelect },
          author: { select: memberSelect },
        },
      }),
    );
  }

  async addProgressNote(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { childMemberId: string; body: string; behaviorTag?: string },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    const authorId = await this.access.resolveAuthorMemberId(ctx);
    return this.prisma.deptProgressNote.create({
      data: {
        churchId,
        serviceUnitId,
        childMemberId: body.childMemberId,
        authorId,
        body: body.body,
        behaviorTag: body.behaviorTag,
      },
      include: { child: { select: memberSelect }, author: { select: memberSelect } },
    });
  }

  async getChecklist(userId: string, churchId: string, serviceUnitId: string, date: string) {
    await this.access.requireView(userId, churchId, serviceUnitId);
    const day = new Date(`${date}T00:00:00.000Z`);
    return this.prisma.deptPrayerChecklist.findMany({
      where: { serviceUnitId, checklistDate: day },
    });
  }

  async toggleChecklist(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { date: string; itemKey: string; completed: boolean },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    const checklistDate = new Date(`${body.date}T00:00:00.000Z`);
    return this.prisma.deptPrayerChecklist.upsert({
      where: {
        serviceUnitId_checklistDate_itemKey: {
          serviceUnitId,
          checklistDate,
          itemKey: body.itemKey,
        },
      },
      create: {
        churchId,
        serviceUnitId,
        checklistDate,
        itemKey: body.itemKey,
        completed: body.completed,
        memberId: ctx.memberId ?? undefined,
      },
      update: {
        completed: body.completed,
        memberId: ctx.memberId ?? undefined,
      },
    });
  }

  listFollowUps(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireView(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptFollowUpLog.findMany({
        where: { serviceUnitId },
        orderBy: { followedAt: 'desc' },
        include: {
          member: { select: memberSelect },
          author: { select: memberSelect },
        },
      }),
    );
  }

  async addFollowUp(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { memberId: string; body: string },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    const authorId = await this.access.resolveAuthorMemberId(ctx);
    return this.prisma.deptFollowUpLog.create({
      data: {
        churchId,
        serviceUnitId,
        memberId: body.memberId,
        body: body.body,
        authorId,
      },
      include: { member: { select: memberSelect }, author: { select: memberSelect } },
    });
  }

  // ─── Reports ─────────────────────────────────────────────────

  listReports(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireViewFeedbacks(userId, churchId, serviceUnitId).then(() =>
      this.prisma.deptModuleReport.findMany({
        where: { serviceUnitId },
        orderBy: { submittedAt: 'desc' },
        include: { author: { select: memberSelect } },
      }),
    );
  }

  async submitReport(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      category: DeptReportCategory;
      title: string;
      body: string;
      stats?: Record<string, unknown>;
    },
  ) {
    const { ctx } = await this.access.requireViewFeedbacks(userId, churchId, serviceUnitId);
    const authorId = await this.access.resolveAuthorMemberId(ctx);
    return this.prisma.deptModuleReport.create({
      data: {
        churchId,
        serviceUnitId,
        category: body.category,
        title: body.title,
        body: body.body,
        stats: (body.stats ?? {}) as object,
        authorId,
      },
      include: { author: { select: memberSelect } },
    });
  }

  async submitQuickReport(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.access.requireViewFeedbacks(
      userId,
      churchId,
      serviceUnitId,
    );
    const authorId = await this.access.resolveAuthorMemberId(ctx);
    const code = resolveDeptModuleCode(unit.departmentCode, unit.name);
    const label = (code && DEPT_MODULE_LABEL[code]) ?? unit.name;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 28);
    const now = new Date();

    const [attendanceRecords, schedules, meetings, meetingSummaries, followUps, inventoryItems, memberCount] =
      await Promise.all([
        this.prisma.attendanceRecord.findMany({
          where: {
            churchId,
            serviceUnitId,
            scope: AttendanceScope.DEPARTMENT,
            serviceDate: { gte: since },
          },
          orderBy: { serviceDate: 'desc' },
        }),
        this.safe(
          'deptSchedule',
          () =>
            this.prisma.deptSchedule.findMany({
              where: { serviceUnitId, startsAt: { gte: since } },
              orderBy: { startsAt: 'desc' },
              take: 12,
              include: { assignedMember: { select: memberSelect } },
            }),
          [],
        ),
        this.prisma.serviceUnitMeeting.findMany({
          where: { serviceUnitId, startsAt: { gte: since } },
          orderBy: { startsAt: 'desc' },
          take: 12,
        }),
        this.prisma.serviceUnitMeetingSummary.findMany({
          where: { serviceUnitId },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        this.safe(
          'deptFollowUpLog',
          () =>
            this.prisma.deptFollowUpLog.findMany({
              where: { serviceUnitId },
              orderBy: { followedAt: 'desc' },
              take: 15,
              include: {
                member: { select: memberSelect },
                author: { select: memberSelect },
              },
            }),
          [],
        ),
        this.safe(
          'deptInventoryItem',
          () =>
            this.prisma.deptInventoryItem.findMany({
              where: { serviceUnitId },
              orderBy: { name: 'asc' },
            }),
          [],
        ),
        this.prisma.serviceUnitMember.count({ where: { serviceUnitId } }),
      ]);

    const sessionsByDate = new Map<string, { present: number; absent: number }>();
    for (const row of attendanceRecords) {
      const key = row.serviceDate.toISOString().slice(0, 10);
      const bucket = sessionsByDate.get(key) ?? { present: 0, absent: 0 };
      if (row.present) bucket.present++;
      else bucket.absent++;
      sessionsByDate.set(key, bucket);
    }

    const attendanceLines =
      sessionsByDate.size === 0
        ? ['  (no department attendance recorded in the last 4 weeks)']
        : [...sessionsByDate.entries()]
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 8)
            .map(([date, s]) => `  ${date}: ${s.present} present, ${s.absent} absent`);

    const meetingLines = [
      ...schedules.map(
        (s) =>
          `  ${new Date(s.startsAt).toLocaleString()} — ${s.title} (${s.type})${
            s.assignedMember
              ? ` · ${s.assignedMember.firstName} ${s.assignedMember.lastName}`
              : ''
          }`,
      ),
      ...meetings.map(
        (m) => `  ${new Date(m.startsAt).toLocaleString()} — ${m.title}`,
      ),
      ...meetingSummaries.map(
        (s) =>
          `  Summary (${s.meetingDate ? new Date(s.meetingDate).toLocaleDateString() : 'recent'}): ${s.title} — ${s.body.slice(0, 100)}${s.body.length > 100 ? '…' : ''}`,
      ),
    ];
    if (meetingLines.length === 0) {
      meetingLines.push('  (no schedules, meetings, or summaries in the last 4 weeks)');
    }

    const activityLines =
      followUps.length === 0
        ? ['  (no follow-up / activity log entries)']
        : followUps.map(
            (f) =>
              `  ${new Date(f.followedAt).toLocaleDateString()} — ${f.member.firstName} ${f.member.lastName}: ${f.body.slice(0, 120)}${f.body.length > 120 ? '…' : ''}`,
          );

    const lowStock = inventoryItems.filter(
      (i) =>
        i.quantity <= 0 ||
        (i.minQuantity != null && i.quantity <= i.minQuantity),
    );
    const inventoryLines =
      inventoryItems.length === 0
        ? ['  (no inventory tracked for this unit)']
        : lowStock.length === 0
          ? ['  All tracked items are above minimum levels.']
          : lowStock.map(
              (i) =>
                `  ${i.name}: qty ${i.quantity}${i.minQuantity != null ? ` (min ${i.minQuantity})` : ''}`,
            );

    const totalPresent = attendanceRecords.filter((r) => r.present).length;
    const totalAbsent = attendanceRecords.filter((r) => !r.present).length;

    const body = [
      `${label} — department quick report`,
      `Generated: ${now.toLocaleString()}`,
      `Unit members: ${memberCount}`,
      '',
      'Attendance (last 4 weeks):',
      ...attendanceLines,
      `  Totals: ${totalPresent} present marks, ${totalAbsent} absent marks`,
      '',
      'Meeting / schedule summary:',
      ...meetingLines.slice(0, 12),
      '',
      'Activity log (recent follow-ups):',
      ...activityLines,
      '',
      'Inventory needs:',
      ...inventoryLines,
    ].join('\n');

    const stats = {
      memberCount,
      attendanceSessions: sessionsByDate.size,
      totalPresent,
      totalAbsent,
      schedulesCount: schedules.length,
      meetingsCount: meetings.length,
      meetingSummariesCount: meetingSummaries.length,
      followUpCount: followUps.length,
      lowInventoryCount: lowStock.length,
      generatedAt: now.toISOString(),
    };

    const category: DeptReportCategory =
      code === 'MEDICAL'
        ? 'WEEKLY_COVERAGE'
        : code === 'MEDIA'
          ? 'SERVICE_COVERAGE'
          : code === 'CHILDREN'
            ? 'WEEKLY_ATTENDANCE'
            : code === 'CHOIR'
              ? 'REHEARSAL_PARTICIPATION'
              : code === 'PRAYER'
                ? 'PRAYER_REQUEST_STATUS'
                : 'GENERAL';

    const report = await this.prisma.deptModuleReport.create({
      data: {
        churchId,
        serviceUnitId,
        category,
        title: `${label} quick report`,
        body,
        stats: stats as object,
        authorId,
      },
      include: { author: { select: memberSelect } },
    });

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    let notified = 0;
    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_WEEKLY_REPORT',
        title: `${label} — quick report for pastors`,
        body,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetUserId: staff.id,
        metadata: { reportId: report.id, quickReport: true },
      });
      notified++;
    }

    return { report, notified, stats };
  }

  async sendAlert(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { subject: string; message: string; memberIds?: string[] },
  ) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    const unit = await this.access.requireDeptUnit(churchId, serviceUnitId);
    const members = body.memberIds?.length
      ? await this.prisma.serviceUnitMember.findMany({
          where: { serviceUnitId, memberId: { in: body.memberIds } },
          include: { member: { select: { email: true, firstName: true } } },
        })
      : await this.prisma.serviceUnitMember.findMany({
          where: { serviceUnitId },
          include: { member: { select: { email: true, firstName: true } } },
        });

    let queued = 0;
    for (const m of members) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_ABSENTEE',
        title: `[${unit.name}] ${body.subject}`,
        body: body.message,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetMemberId: m.memberId,
        metadata: { alertType: 'department_module' },
      });
      queued++;
    }
    return { queued };
  }

  private feedbackInclude() {
    return {
      authorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      authorMember: { select: memberSelect },
      replies: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          authorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          authorMember: { select: memberSelect },
        },
      },
    };
  }

  private mapFeedback(row: {
    id: string;
    parentId: string | null;
    subject: string | null;
    body: string;
    authorRole: string;
    createdAt: Date;
    authorUser: { firstName: string; lastName: string; email: string } | null;
    authorMember: { firstName: string; lastName: string } | null;
    replies?: Array<{
      id: string;
      body: string;
      authorRole: string;
      createdAt: Date;
      authorUser: { firstName: string; lastName: string } | null;
      authorMember: { firstName: string; lastName: string } | null;
    }>;
  }) {
    const authorName = row.authorUser
      ? `${row.authorUser.firstName} ${row.authorUser.lastName}`.trim() || row.authorUser.email
      : row.authorMember
        ? `${row.authorMember.firstName} ${row.authorMember.lastName}`.trim()
        : 'Unknown';
    return {
      id: row.id,
      parentId: row.parentId,
      subject: row.subject,
      body: row.body,
      authorRole: row.authorRole,
      authorName,
      createdAt: row.createdAt.toISOString(),
      replies: (row.replies ?? []).map((r) => ({
        id: r.id,
        body: r.body,
        authorRole: r.authorRole,
        authorName: r.authorUser
          ? `${r.authorUser.firstName} ${r.authorUser.lastName}`.trim()
          : r.authorMember
            ? `${r.authorMember.firstName} ${r.authorMember.lastName}`.trim()
            : 'Unknown',
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async listFeedbacks(userId: string, churchId: string, serviceUnitId: string) {
    await this.access.requireViewFeedbacks(userId, churchId, serviceUnitId);
    const rows = await this.prisma.deptUnitFeedback.findMany({
      where: { churchId, serviceUnitId, parentId: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.feedbackInclude(),
    });
    return rows.map((r) => this.mapFeedback(r));
  }

  async createFeedback(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { parentId?: string; subject?: string; body: string },
  ) {
    const { ctx, unit } = await this.access.requireViewAnyUnit(userId, churchId, serviceUnitId);
    const isStaff = this.access.isChurchStaff(ctx);

    if (body.parentId) {
      if (!this.access.canViewFeedbacks(ctx, serviceUnitId) && !isStaff) {
        throw new ForbiddenException('Cannot reply to feedback');
      }
      const parent = await this.prisma.deptUnitFeedback.findFirst({
        where: { id: body.parentId, churchId, serviceUnitId },
      });
      if (!parent) throw new NotFoundException('Parent message not found');
    } else if (!isStaff) {
      throw new ForbiddenException('Only pastor or church admin can start a new message');
    }

    let authorRole: 'PASTOR' | 'ADMIN' | 'UNIT_LEADER';
    let authorUserId: string | null = null;
    let authorMemberId: string | null = null;

    if (isStaff && !body.parentId) {
      const roles = ctx.userRoles;
      authorRole = roles.includes('PASTOR') ? 'PASTOR' : 'ADMIN';
      authorUserId = ctx.userId;
    } else if (isStaff && body.parentId) {
      authorRole = ctx.userRoles.includes('PASTOR') ? 'PASTOR' : 'ADMIN';
      authorUserId = ctx.userId;
    } else {
      authorRole = 'UNIT_LEADER';
      authorMemberId = await this.access.resolveAuthorMemberId(ctx);
    }

    const row = await this.prisma.deptUnitFeedback.create({
      data: {
        churchId,
        serviceUnitId,
        parentId: body.parentId ?? null,
        subject: body.parentId ? null : body.subject?.trim() || null,
        body: body.body.trim(),
        authorUserId,
        authorMemberId,
        authorRole,
      },
      include: body.parentId
        ? {
            authorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            authorMember: { select: memberSelect },
          }
        : this.feedbackInclude(),
    });

    if (!body.parentId && isStaff) {
      const leaders = await this.prisma.serviceUnitLeader.findMany({
        where: { serviceUnitId },
        include: {
          member: {
            select: {
              email: true,
              user: { select: { id: true } },
            },
          },
        },
      });
      const label = unit.name;
      const preview = body.body.trim().slice(0, 240);
      for (const lead of leaders) {
        const targetUserId = lead.member.user?.id;
        if (!targetUserId) continue;
        await this.commQueue.enqueue(churchId, {
          kind: 'DIRECT_ALERT',
          title: `Message for ${label} leadership`,
          body: body.subject?.trim()
            ? `${body.subject.trim()}\n\n${preview}`
            : preview,
          channels: ['IN_APP'],
          serviceUnitId,
          targetUserId,
          metadata: { feedbackId: row.id, feedbackHub: true },
        });
      }
    }

    return this.mapFeedback(
      body.parentId
        ? {
            ...row,
            replies: [],
            parentId: row.parentId,
            authorUser: row.authorUser,
            authorMember: row.authorMember,
          }
        : row,
    );
  }
}

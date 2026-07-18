import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CellFormKind,
  CellIncidentSeverity,
  CellIncidentStatus,
  CellPrayerStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';
import { MembershipService } from '../membership/membership.service';
import { MembershipRegistryService } from '../membership/membership-registry.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import {
  MinistryCellsAccessService,
  type MinistryCellsRole,
} from './ministry-cells-access.service';

const branchInclude = {
  leader: { select: { id: true, firstName: true, lastName: true, email: true } },
  _count: { select: { members: true, incidents: true } },
} satisfies Prisma.CellBranchInclude;

const branchListInclude = {
  ...branchInclude,
  members: {
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          family: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
} satisfies Prisma.CellBranchInclude;

@Injectable()
export class MinistryCellsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MinistryCellsAccessService,
    private readonly membership: MembershipService,
    private readonly registry: MembershipRegistryService,
    private readonly commQueue: CommunicationsQueueService,
  ) {}

  async getContext(user: AuthUser, churchId: string) {
    await this.access.assertModuleEnabled(churchId);
    const ctx = await this.access.resolveRole(user, churchId);
    return {
      role: ctx.role,
      leaderBranchId: ctx.leaderBranchId,
      canManage: ctx.role === 'admin' || ctx.role === 'pastor',
      canViewAnalytics: ctx.role === 'admin' || ctx.role === 'pastor',
    };
  }

  private branchWhere(churchId: string, role: MinistryCellsRole, leaderBranchId: string | null) {
    if (role === 'cellLeader' && leaderBranchId) {
      return { churchId, id: leaderBranchId };
    }
    return { churchId };
  }

  async listBranches(user: AuthUser, churchId: string) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const branches = await this.prisma.cellBranch.findMany({
      where: this.branchWhere(churchId, ctx.role, ctx.leaderBranchId),
      include: branchListInclude,
      orderBy: { name: 'asc' },
    });
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      location: b.location,
      createdAt: b.createdAt,
      memberCount: b._count.members,
      incidentCount: b._count.incidents,
      members: b.members.map((row) => ({
        id: row.member.id,
        firstName: row.member.firstName,
        lastName: row.member.lastName,
        name: `${row.member.firstName} ${row.member.lastName}`.trim(),
        email: row.member.email,
        phone: row.member.phone,
        status: row.member.status,
        family: row.member.family
          ? { id: row.member.family.id, name: row.member.family.name }
          : null,
        joinedAt: row.joinedAt,
      })),
      leader: b.leader
        ? {
            id: b.leader.id,
            name: `${b.leader.firstName} ${b.leader.lastName}`.trim(),
            email: b.leader.email,
          }
        : null,
    }));
  }

  async createBranch(
    user: AuthUser,
    churchId: string,
    body: { name: string; location?: string; leaderUserId?: string },
  ) {
    await this.access.assertLeadership(user, churchId);
    if (body.leaderUserId) {
      await this.assertLeaderAvailable(churchId, body.leaderUserId);
    }
    return this.prisma.cellBranch.create({
      data: {
        churchId,
        name: body.name.trim(),
        location: body.location?.trim() || null,
        leaderUserId: body.leaderUserId || null,
      },
      include: branchInclude,
    });
  }

  async updateBranch(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: { name?: string; location?: string; leaderUserId?: string | null },
  ) {
    await this.access.assertLeadership(user, churchId);
    await this.getBranchOrThrow(churchId, branchId);
    if (body.leaderUserId) {
      await this.assertLeaderAvailable(churchId, body.leaderUserId, branchId);
    }
    return this.prisma.cellBranch.update({
      where: { id: branchId },
      data: {
        name: body.name?.trim(),
        location: body.location !== undefined ? body.location?.trim() || null : undefined,
        leaderUserId: body.leaderUserId,
      },
      include: branchInclude,
    });
  }

  async deleteBranch(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertLeadership(user, churchId);
    await this.getBranchOrThrow(churchId, branchId);
    await this.prisma.cellBranch.delete({ where: { id: branchId } });
    return { ok: true };
  }

  async getBranchDetail(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const branch = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
      include: {
        ...branchInclude,
        members: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
                family: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const [latestAttendance, openIncidents, openPrayers] = await Promise.all([
      this.prisma.cellAttendance.findFirst({
        where: { branchId, churchId },
        orderBy: { weekStart: 'desc' },
      }),
      this.prisma.cellIncident.count({
        where: { branchId, churchId, status: { in: ['OPEN', 'REVIEWING'] } },
      }),
      this.prisma.cellPrayerRequest.count({
        where: { branchId, churchId, status: { in: ['OPEN', 'PRAYING'] } },
      }),
    ]);

    return {
      id: branch.id,
      name: branch.name,
      location: branch.location,
      createdAt: branch.createdAt,
      leader: branch.leader
        ? {
            id: branch.leader.id,
            name: `${branch.leader.firstName} ${branch.leader.lastName}`.trim(),
            email: branch.leader.email,
          }
        : null,
      members: branch.members.map((m) => ({
        id: m.member.id,
        firstName: m.member.firstName,
        lastName: m.member.lastName,
        email: m.member.email,
        phone: m.member.phone,
        status: m.member.status,
        family: m.member.family
          ? { id: m.member.family.id, name: m.member.family.name }
          : null,
        joinedAt: m.joinedAt,
      })),
      memberCount: branch.members.length,
      latestAttendance,
      openIncidents,
      openPrayers,
    };
  }

  async addMember(
    user: AuthUser,
    churchId: string,
    branchId: string,
    memberId: string,
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const existing = await this.prisma.cellBranchMember.findUnique({
      where: { churchId_memberId: { churchId, memberId } },
    });
    if (existing && existing.branchId !== branchId) {
      throw new BadRequestException('Member is already assigned to another cell branch');
    }
    if (existing) return existing;
    return this.prisma.cellBranchMember.create({
      data: { churchId, branchId, memberId },
    });
  }

  /**
   * Create a new church member when search finds no match, then attach to this branch.
   * Accepts the global congregant editor payload and writes to the membership database.
   */
  async createMemberAndAdd(
    user: AuthUser,
    churchId: string,
    branchId: string,
    data: Record<string, unknown>,
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);
    const firstName = String(data.firstName ?? '').trim();
    const lastName = String(data.lastName ?? '').trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }
    const created = await this.membership.createMember(churchId, {
      ...(data as Parameters<MembershipService['createMember']>[1]),
      firstName,
      lastName,
      cellBranchId: branchId,
      startOnboarding: data.startOnboarding === true,
      requireContactFields: data.requireContactFields !== false,
    });
    const row = await this.prisma.cellBranchMember.findUnique({
      where: { churchId_memberId: { churchId, memberId: created.id } },
    });
    if (!row) {
      await this.addMember(user, churchId, branchId, created.id);
    }
    return created;
  }

  async getRegistryCatalog(user: AuthUser, churchId: string) {
    await this.access.assertCanAccess(user, churchId);
    return this.registry.getRegistryCatalog(churchId);
  }

  async removeMember(
    user: AuthUser,
    churchId: string,
    branchId: string,
    memberId: string,
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const row = await this.prisma.cellBranchMember.findFirst({
      where: { churchId, branchId, memberId },
    });
    if (!row) throw new NotFoundException('Member not in this branch');
    await this.prisma.cellBranchMember.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async listForms(user: AuthUser, churchId: string) {
    await this.access.assertCanAccess(user, churchId);
    return this.prisma.cellFormDefinition.findMany({
      where: { churchId },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  async upsertForm(
    user: AuthUser,
    churchId: string,
    body: {
      id?: string;
      kind: CellFormKind;
      name: string;
      description?: string;
      fields?: unknown;
      isActive?: boolean;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    if (body.id) {
      return this.prisma.cellFormDefinition.update({
        where: { id: body.id },
        data: {
          kind: body.kind,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          fields: (body.fields ?? []) as Prisma.InputJsonValue,
          isActive: body.isActive,
        },
      });
    }
    return this.prisma.cellFormDefinition.create({
      data: {
        churchId,
        kind: body.kind,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        fields: (body.fields ?? []) as Prisma.InputJsonValue,
        isActive: body.isActive ?? true,
      },
    });
  }

  async seedDefaultForms(user: AuthUser, churchId: string) {
    await this.access.assertLeadership(user, churchId);
    const existing = await this.prisma.cellFormDefinition.count({ where: { churchId } });
    if (existing > 0) return { seeded: false };
    await this.prisma.cellFormDefinition.createMany({
      data: [
        {
          churchId,
          kind: 'WEEKLY_REPORT',
          name: 'Weekly Cell Report',
          description: 'Standard weekly meeting report',
          fields: [
            { key: 'meetingHeld', label: 'Meeting held?', type: 'boolean' },
            { key: 'attendance', label: 'Attendance count', type: 'number' },
            { key: 'newVisitors', label: 'New visitors', type: 'number' },
            { key: 'highlights', label: 'Highlights', type: 'text' },
            { key: 'prayerNeeds', label: 'Prayer needs', type: 'text' },
          ] as Prisma.InputJsonValue,
        },
        {
          churchId,
          kind: 'INCIDENT',
          name: 'Incident Report',
          description: 'Report an incident in your cell',
          fields: [
            { key: 'title', label: 'Title', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'text', required: true },
            { key: 'severity', label: 'Severity', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          ] as Prisma.InputJsonValue,
        },
      ],
    });
    return { seeded: true };
  }

  async listTeaching(user: AuthUser, churchId: string) {
    await this.access.assertCanAccess(user, churchId);
    return this.prisma.cellTeachingResource.findMany({
      where: { churchId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async upsertTeaching(
    user: AuthUser,
    churchId: string,
    body: {
      id?: string;
      title: string;
      description?: string;
      fileUrl?: string;
      content?: string;
      sortOrder?: number;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    if (body.id) {
      return this.prisma.cellTeachingResource.update({
        where: { id: body.id },
        data: {
          title: body.title.trim(),
          description: body.description?.trim() || null,
          fileUrl: body.fileUrl || null,
          content: body.content || null,
          sortOrder: body.sortOrder,
        },
      });
    }
    return this.prisma.cellTeachingResource.create({
      data: {
        churchId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        fileUrl: body.fileUrl || null,
        content: body.content || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  async deleteTeaching(user: AuthUser, churchId: string, id: string) {
    await this.access.assertLeadership(user, churchId);
    await this.prisma.cellTeachingResource.delete({ where: { id } });
    return { ok: true };
  }

  async submitReport(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: { formId: string; payload: Record<string, unknown> },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const form = await this.prisma.cellFormDefinition.findFirst({
      where: { id: body.formId, churchId, isActive: true },
    });
    if (!form) throw new NotFoundException('Form not found');
    const report = await this.prisma.cellReport.create({
      data: {
        churchId,
        branchId,
        formId: body.formId,
        submittedByUserId: user.userId,
        payload: body.payload as Prisma.InputJsonValue,
      },
    });
    if (form.kind === 'INCIDENT') {
      const title = String(body.payload.title ?? 'Incident report');
      const description = String(body.payload.description ?? '');
      const severity = (body.payload.severity as CellIncidentSeverity) ?? 'MEDIUM';
      await this.prisma.cellIncident.create({
        data: {
          churchId,
          branchId,
          title,
          description: description || title,
          severity,
          reportedByUserId: user.userId,
        },
      });
    }
    return report;
  }

  async listReports(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellReport.findMany({
      where: { churchId, branchId },
      include: {
        form: { select: { id: true, name: true, kind: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });
  }

  private nonNegInt(value: unknown, field: string): number {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }
    return Math.floor(n);
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private formatWeekLabel(date: Date): string {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  async recordAttendance(
    user: AuthUser,
    churchId: string,
    branchId: string,
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
      meetingId?: string;
    },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);

    const maleCount = this.nonNegInt(body.maleCount, 'maleCount');
    const femaleCount = this.nonNegInt(body.femaleCount, 'femaleCount');
    const boysCount = this.nonNegInt(body.boysCount, 'boysCount');
    const girlsCount = this.nonNegInt(body.girlsCount, 'girlsCount');
    const testifiersCount = this.nonNegInt(body.testifiersCount, 'testifiersCount');
    const firstTimersCount = this.nonNegInt(body.firstTimersCount, 'firstTimersCount');

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

    return this.prisma.cellAttendance.create({
      data: {
        churchId,
        branchId,
        meetingId: body.meetingId || null,
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
        recordedByUserId: user.userId,
      },
    }).then(async (row) => {
      await this.notifyLeadershipOfAttendance(churchId, branchId, row, 'created');
      return row;
    });
  }

  async updateAttendance(
    user: AuthUser,
    churchId: string,
    branchId: string,
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
    await this.access.assertBranchAccess(user, churchId, branchId);
    const existing = await this.prisma.cellAttendance.findFirst({
      where: { id: attendanceId, churchId, branchId },
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
      body.presentCount != null
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

    const row = await this.prisma.cellAttendance.update({
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
        notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
      },
    });

    await this.notifyLeadershipOfAttendance(churchId, branchId, row, 'updated');
    return row;
  }

  private async notifyLeadershipOfAttendance(
    churchId: string,
    branchId: string,
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
    const branch = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
      select: { name: true },
    });
    const branchName = branch?.name ?? 'Branch/Cell';
    const meetingDate = row.meetingDate ?? row.weekStart;
    const dateLabel = meetingDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timestamp = new Date().toISOString();
    const title = `[Attendance Report] ${branchName} — ${dateLabel}`;
    const body = [
      `Tags: Branch/Cell Name · Date · Attendance Report · Timestamp`,
      ``,
      `Branch/Cell Name: ${branchName}`,
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
        channels: ['IN_APP', 'EMAIL'],
        targetUserId: staff.id,
        metadata: {
          tags: ['Branch/Cell Name', 'Date', 'Attendance Report', 'Timestamp'],
          branchId,
          branchName,
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

  async listAttendance(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellAttendance.findMany({
      where: { churchId, branchId },
      orderBy: { weekStart: 'desc' },
      take: 26,
    });
  }

  /** Last 4 weeks of demographic totals + growth for a single branch. */
  async getBranchAnalytics(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);

    const now = new Date();
    const windowStart = this.startOfWeek(new Date(now));
    windowStart.setDate(windowStart.getDate() - 21);

    const rows = await this.prisma.cellAttendance.findMany({
      where: {
        churchId,
        branchId,
        weekStart: { gte: windowStart },
      },
      orderBy: { weekStart: 'asc' },
      select: {
        weekStart: true,
        meetingDate: true,
        presentCount: true,
        maleCount: true,
        femaleCount: true,
        boysCount: true,
        girlsCount: true,
        testifiersCount: true,
        firstTimersCount: true,
      },
    });

    type Bucket = {
      weekStart: string;
      label: string;
      male: number;
      female: number;
      boys: number;
      girls: number;
      testifiers: number;
      firstTimers: number;
      total: number;
    };

    const byWeek = new Map<string, Bucket>();
    for (const row of rows) {
      const key = this.startOfWeek(row.weekStart).toISOString().slice(0, 10);
      const existing = byWeek.get(key) ?? {
        weekStart: key,
        label: this.formatWeekLabel(this.startOfWeek(row.weekStart)),
        male: 0,
        female: 0,
        boys: 0,
        girls: 0,
        testifiers: 0,
        firstTimers: 0,
        total: 0,
      };
      existing.male += row.maleCount;
      existing.female += row.femaleCount;
      existing.boys += row.boysCount;
      existing.girls += row.girlsCount;
      existing.testifiers += row.testifiersCount;
      existing.firstTimers += row.firstTimersCount;
      const demoSum = row.maleCount + row.femaleCount + row.boysCount + row.girlsCount;
      existing.total += demoSum > 0 ? demoSum : row.presentCount;
      byWeek.set(key, existing);
    }

    const weeks: Bucket[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const start = this.startOfWeek(d);
      const key = start.toISOString().slice(0, 10);
      weeks.push(
        byWeek.get(key) ?? {
          weekStart: key,
          label: this.formatWeekLabel(start),
          male: 0,
          female: 0,
          boys: 0,
          girls: 0,
          testifiers: 0,
          firstTimers: 0,
          total: 0,
        },
      );
    }

    const totals = weeks.reduce(
      (acc, w) => ({
        male: acc.male + w.male,
        female: acc.female + w.female,
        boys: acc.boys + w.boys,
        girls: acc.girls + w.girls,
        testifiers: acc.testifiers + w.testifiers,
        firstTimers: acc.firstTimers + w.firstTimers,
        total: acc.total + w.total,
      }),
      { male: 0, female: 0, boys: 0, girls: 0, testifiers: 0, firstTimers: 0, total: 0 },
    );

    const firstHalf = weeks.slice(0, 2).reduce((s, w) => s + w.total, 0);
    const secondHalf = weeks.slice(2, 4).reduce((s, w) => s + w.total, 0);
    const growthPercent =
      firstHalf === 0
        ? secondHalf > 0
          ? 100
          : 0
        : Math.round(((secondHalf - firstHalf) / firstHalf) * 1000) / 10;

    const demographicPie = [
      { name: 'Male', value: totals.male },
      { name: 'Female', value: totals.female },
      { name: 'Boys', value: totals.boys },
      { name: 'Girls', value: totals.girls },
    ].filter((d) => d.value > 0);

    return {
      periodWeeks: 4,
      windowStart: windowStart.toISOString(),
      weeks,
      totals,
      growthPercent,
      demographicPie,
      firstTimersTotal: totals.firstTimers,
      testifiersTotal: totals.testifiers,
    };
  }

  async listIncidents(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellIncident.findMany({
      where: { churchId, branchId },
      include: {
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateIncident(
    user: AuthUser,
    churchId: string,
    incidentId: string,
    body: { status?: CellIncidentStatus; severity?: CellIncidentSeverity },
  ) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const incident = await this.prisma.cellIncident.findFirst({
      where: { id: incidentId, churchId },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    if (ctx.role === 'cellLeader' && ctx.leaderBranchId !== incident.branchId) {
      throw new ForbiddenException('Cannot update incidents for other branches');
    }
    return this.prisma.cellIncident.update({
      where: { id: incidentId },
      data: { status: body.status, severity: body.severity },
    });
  }

  async listPrayers(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellPrayerRequest.findMany({
      where: { churchId, branchId },
      include: {
        member: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrayer(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: {
      title: string;
      body?: string;
      memberId?: string;
      isAnonymous?: boolean;
    },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellPrayerRequest.create({
      data: {
        churchId,
        branchId,
        title: body.title.trim(),
        body: body.body?.trim() || null,
        memberId: body.isAnonymous ? null : body.memberId || null,
        isAnonymous: body.isAnonymous ?? false,
        createdByUserId: user.userId,
      },
    });
  }

  async updatePrayer(
    user: AuthUser,
    churchId: string,
    prayerId: string,
    body: { status?: CellPrayerStatus },
  ) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const prayer = await this.prisma.cellPrayerRequest.findFirst({
      where: { id: prayerId, churchId },
    });
    if (!prayer) throw new NotFoundException('Prayer request not found');
    if (ctx.role === 'cellLeader' && ctx.leaderBranchId !== prayer.branchId) {
      throw new ForbiddenException('Cannot update prayers for other branches');
    }
    return this.prisma.cellPrayerRequest.update({
      where: { id: prayerId },
      data: { status: body.status },
    });
  }

  async listMessages(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellMessage.findMany({
      where: {
        churchId,
        branchId,
        OR: [{ fromUserId: user.userId }, { toUserId: user.userId }],
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async sendMessage(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: { toUserId: string; body: string },
  ) {
    const ctx = await this.access.assertBranchAccess(user, churchId, branchId);
    const branch = await this.getBranchOrThrow(churchId, branchId);
    const toUser = await this.prisma.user.findFirst({
      where: { id: body.toUserId, churchId },
      include: { roles: { include: { role: true } } },
    });
    if (!toUser) throw new NotFoundException('Recipient not found');

    const toIsLeadership = toUser.roles.some(
      (r) => r.role.name === 'ADMIN' || r.role.name === 'PASTOR',
    );
    const fromIsLeader = ctx.role === 'cellLeader' && branch.leaderUserId === user.userId;
    const fromIsLeadership = ctx.role === 'admin' || ctx.role === 'pastor';
    const toIsLeader = branch.leaderUserId === body.toUserId;

    const allowed =
      (fromIsLeader && toIsLeadership) ||
      (fromIsLeadership && toIsLeader);

    if (!allowed) {
      throw new BadRequestException(
        'Messages are only allowed between cell leaders and church admin/pastor',
      );
    }

    const message = await this.prisma.cellMessage.create({
      data: {
        churchId,
        branchId,
        fromUserId: user.userId,
        toUserId: body.toUserId,
        body: body.body.trim(),
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.notification.create({
      data: {
        churchId,
        userId: body.toUserId,
        title: 'Ministry/Cells message',
        body: body.body.trim().slice(0, 200),
        type: 'MINISTRY_CELL_MESSAGE',
        data: { branchId, messageId: message.id },
      },
    });

    return message;
  }

  async markMessageRead(user: AuthUser, churchId: string, messageId: string) {
    const msg = await this.prisma.cellMessage.findFirst({
      where: { id: messageId, churchId, toUserId: user.userId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.cellMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async listReminders(user: AuthUser, churchId: string, branchId?: string) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const where: Prisma.CellReminderWhereInput = { churchId };
    if (ctx.role === 'cellLeader' && ctx.leaderBranchId) {
      where.OR = [{ branchId: ctx.leaderBranchId }, { branchId: null, userId: user.userId }];
    } else if (branchId) {
      where.branchId = branchId;
    }
    return this.prisma.cellReminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
      take: 50,
    });
  }

  async createReminder(
    user: AuthUser,
    churchId: string,
    body: {
      branchId?: string;
      userId?: string;
      title: string;
      body?: string;
      remindAt: string;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    return this.prisma.cellReminder.create({
      data: {
        churchId,
        branchId: body.branchId || null,
        userId: body.userId || null,
        title: body.title.trim(),
        body: body.body?.trim() || null,
        remindAt: new Date(body.remindAt),
      },
    });
  }

  async getAnalytics(
    user: AuthUser,
    churchId: string,
    filters: {
      branchId?: string;
      leaderUserId?: string;
      location?: string;
      from?: string;
      to?: string;
    },
  ) {
    await this.access.assertLeadership(user, churchId);

    const from = filters.from ? new Date(filters.from) : new Date(Date.now() - 90 * 86400000);
    const to = filters.to ? new Date(filters.to) : new Date();

    const branchWhere: Prisma.CellBranchWhereInput = { churchId };
    if (filters.branchId) branchWhere.id = filters.branchId;
    if (filters.leaderUserId) branchWhere.leaderUserId = filters.leaderUserId;
    if (filters.location) branchWhere.location = { contains: filters.location, mode: 'insensitive' };

    const branches = await this.prisma.cellBranch.findMany({
      where: branchWhere,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
    });
    const branchIds = branches.map((b) => b.id);

    const [attendance, reports, incidents, prayers, messages] = await Promise.all([
      this.prisma.cellAttendance.findMany({
        where: { churchId, branchId: { in: branchIds }, weekStart: { gte: from, lte: to } },
        orderBy: { weekStart: 'asc' },
      }),
      this.prisma.cellReport.findMany({
        where: { churchId, branchId: { in: branchIds }, submittedAt: { gte: from, lte: to } },
      }),
      this.prisma.cellIncident.findMany({
        where: { churchId, branchId: { in: branchIds }, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.cellPrayerRequest.findMany({
        where: { churchId, branchId: { in: branchIds }, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.cellMessage.findMany({
        where: { churchId, branchId: { in: branchIds }, createdAt: { gte: from, lte: to } },
      }),
    ]);

    const weeksInRange = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (7 * 86400000)));

    const branchMetrics = branches.map((b) => {
      const bAttendance = attendance.filter((a) => a.branchId === b.id);
      const bReports = reports.filter((r) => r.branchId === b.id);
      const bIncidents = incidents.filter((i) => i.branchId === b.id);
      const bPrayers = prayers.filter((p) => p.branchId === b.id);
      const bMessages = messages.filter((m) => m.branchId === b.id);
      const avgAttendance =
        bAttendance.length > 0
          ? bAttendance.reduce((s, a) => s + a.presentCount, 0) / bAttendance.length
          : 0;
      const reportCompliance = Math.min(100, Math.round((bReports.length / weeksInRange) * 100));

      return {
        branchId: b.id,
        name: b.name,
        location: b.location,
        memberCount: b._count.members,
        leader: b.leader
          ? `${b.leader.firstName} ${b.leader.lastName}`.trim()
          : null,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        reportCount: bReports.length,
        reportCompliance,
        incidentCount: bIncidents.length,
        openIncidents: bIncidents.filter((i) => i.status === 'OPEN' || i.status === 'REVIEWING').length,
        prayerCount: bPrayers.length,
        messageCount: bMessages.length,
      };
    });

    return {
      from,
      to,
      totals: {
        branches: branches.length,
        members: branches.reduce((s, b) => s + b._count.members, 0),
        reports: reports.length,
        incidents: incidents.length,
        prayers: prayers.length,
        messages: messages.length,
      },
      attendanceTrend: attendance.map((a) => ({
        branchId: a.branchId,
        weekStart: a.weekStart,
        presentCount: a.presentCount,
      })),
      branchMetrics,
    };
  }

  async listAvailableMembers(user: AuthUser, churchId: string, branchId?: string) {
    await this.access.assertCanAccess(user, churchId);
    const assignedElsewhere = await this.prisma.cellBranchMember.findMany({
      where: branchId ? { churchId, NOT: { branchId } } : { churchId },
      select: { memberId: true },
    });
    const excludeIds = assignedElsewhere.map((a) => a.memberId);
    return this.prisma.member.findMany({
      where: {
        churchId,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });
  }

  async listLeaderCandidates(user: AuthUser, churchId: string) {
    await this.access.assertLeadership(user, churchId);
    const users = await this.prisma.user.findMany({
      where: { churchId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        member: { select: { id: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      memberId: u.member?.id ?? null,
    }));
  }

  async listLeadershipContacts(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const branch = await this.getBranchOrThrow(churchId, branchId);
    const leaders = await this.prisma.user.findMany({
      where: {
        churchId,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return {
      leaderUserId: branch.leaderUserId,
      leadershipContacts: leaders,
    };
  }

  private async getBranchOrThrow(churchId: string, branchId: string) {
    const branch = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  private async assertLeaderAvailable(
    churchId: string,
    leaderUserId: string,
    excludeBranchId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: leaderUserId, churchId, isActive: true },
    });
    if (!user) throw new BadRequestException('Leader user not found in this church');
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceScope, DepartmentCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  PHASE8_DEPARTMENT_CODES,
  PHASE8_EXTRA_UNITS,
  PHASE8_NAME_TO_CODE,
} from '../../../prisma/phase8-department-catalog';
import { SERVICE_UNIT_CATALOG } from '../../../prisma/service-unit-catalog';
import { ModuleAccessService, UserMemberContext } from '../access/module-access.service';
import { MembershipAttendanceService } from '../membership/membership-attendance.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import {
  escapeHtml,
  findOneAdminAndOnePastor,
} from '../notifications/report-digest.util';
import { isoWeekKey, weekStartUtc } from './service-units-department.util';
import {
  isDepartmentModuleEnabled,
  parseDepartmentModuleSettings,
} from '../../common/department-module-settings';

const DEPARTMENT_LABEL: Record<DepartmentCode, string> = {
  USHERING: 'Ushering',
  CHOIR: 'Choir',
  EVANGELISM: 'Evangelism',
  YOUTH: 'Youth',
  TEENS: 'Teens',
  CHILDREN: 'Children',
  PROTOCOL: 'Protocol',
  PRAYER: 'Prayer',
  MEDIA: 'Media',
  MEDICAL: 'Medical',
  OTHER: 'Department',
};

@Injectable()
export class ServiceUnitsDepartmentService {
  private readonly logger = new Logger(ServiceUnitsDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleAccess: ModuleAccessService,
    private readonly attendance: MembershipAttendanceService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly email: EmailAdapter,
  ) {}

  private async upsertCatalogUnit(
    churchId: string,
    data: {
      name: string;
      description: string;
      activities: string;
      departmentCode?: DepartmentCode;
    },
  ) {
    try {
      const existing = await this.prisma.serviceUnit.findFirst({
        where: { churchId, name: data.name },
      });
      if (existing) {
        await this.prisma.serviceUnit.update({
          where: { id: existing.id },
          data: {
            description: data.description,
            activities: data.activities,
            isActive: true,
            ...(data.departmentCode ? { departmentCode: data.departmentCode } : {}),
          },
        });
      } else {
        await this.prisma.serviceUnit.create({
          data: {
            churchId,
            name: data.name,
            description: data.description,
            activities: data.activities,
            departmentCode: data.departmentCode,
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `syncPhase8Units skipped "${data.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async syncPhase8Units(churchId: string) {
    for (const unit of SERVICE_UNIT_CATALOG) {
      const code = PHASE8_NAME_TO_CODE[unit.name];
      await this.upsertCatalogUnit(churchId, {
        name: unit.name,
        description: unit.description,
        activities: unit.activities,
        departmentCode: code,
      });
    }
    for (const extra of PHASE8_EXTRA_UNITS) {
      await this.upsertCatalogUnit(churchId, {
        name: extra.name,
        description: extra.description,
        activities: extra.activities,
        departmentCode: extra.departmentCode,
      });
    }
  }

  async listDepartments(churchId: string) {
    try {
      await this.syncPhase8Units(churchId);
    } catch (err) {
      this.logger.warn(
        `listDepartments sync: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const [church, units] = await Promise.all([
      this.prisma.church.findUnique({
        where: { id: churchId },
        select: { settings: true },
      }),
      this.prisma.serviceUnit.findMany({
      where: {
        churchId,
        isActive: true,
        departmentCode: { in: PHASE8_DEPARTMENT_CODES },
      },
      include: {
        leaders: {
          include: {
            member: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { members: true, meetings: true } },
      },
      orderBy: [{ departmentCode: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const config = parseDepartmentModuleSettings(church?.settings ?? {});
    return units.filter((unit) =>
      unit.departmentCode
        ? isDepartmentModuleEnabled(
            config,
            unit.departmentCode as Parameters<typeof isDepartmentModuleEnabled>[1],
          )
        : true,
    );
  }

  private async requireUnit(churchId: string, serviceUnitId: string) {
    const unit = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId, isActive: true },
    });
    if (!unit) throw new NotFoundException('Service unit not found');
    if (!unit.departmentCode || !PHASE8_DEPARTMENT_CODES.includes(unit.departmentCode)) {
      throw new BadRequestException('Unit is not a Phase 8 department');
    }
    return unit;
  }

  private async assertManage(userId: string, churchId: string, serviceUnitId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    if (!this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Unit admin or church staff required');
    }
    return ctx;
  }

  private async assertParticipate(userId: string, churchId: string, serviceUnitId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    const canManage = this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId);
    const isMember = ctx.unitMembershipIds.includes(serviceUnitId);
    if (!canManage && !isMember) {
      throw new ForbiddenException('Department membership required');
    }
    return ctx;
  }

  async getDashboard(churchId: string, serviceUnitId: string, weeks = 4) {
    const unit = await this.requireUnit(churchId, serviceUnitId);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - weeks * 7);

    const members = await this.prisma.serviceUnitMember.findMany({
      where: { serviceUnitId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const attendance = await this.prisma.attendanceRecord.findMany({
      where: {
        churchId,
        serviceUnitId,
        scope: AttendanceScope.DEPARTMENT,
        serviceDate: { gte: since },
      },
      orderBy: { serviceDate: 'desc' },
    });

    const sessionsByDate = new Map<string, { present: number; absent: number; total: number }>();
    for (const row of attendance) {
      const key = row.serviceDate.toISOString().slice(0, 10);
      const bucket = sessionsByDate.get(key) ?? { present: 0, absent: 0, total: 0 };
      bucket.total++;
      if (row.present) bucket.present++;
      else bucket.absent++;
      sessionsByDate.set(key, bucket);
    }

    const sessionDates = [...sessionsByDate.keys()].sort().reverse();
    const latestDate = sessionDates[0];
    const latestAbsent: typeof members = [];
    if (latestDate) {
      const dayStart = new Date(`${latestDate}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const latestRecords = attendance.filter(
        (r) => r.serviceDate >= dayStart && r.serviceDate < dayEnd,
      );
      const recorded = new Set(latestRecords.map((r) => r.memberId));
      const absentIds = new Set(
        latestRecords.filter((r) => !r.present).map((r) => r.memberId),
      );
      for (const m of members) {
        if (!recorded.has(m.memberId) || absentIds.has(m.memberId)) {
          latestAbsent.push(m);
        }
      }
    }

    const meetings = await this.prisma.serviceUnitMeeting.findMany({
      where: { serviceUnitId, startsAt: { gte: since } },
      select: { id: true, startsAt: true },
    });
    const sessionCount = Math.max(sessionDates.length, 1);

    const volunteerConsistency = members.map((m) => {
      const memberRecords = attendance.filter((r) => r.memberId === m.memberId);
      const presentCount = memberRecords.filter((r) => r.present).length;
      const expected = sessionDates.length || 1;
      const rate = Math.round((presentCount / expected) * 100);
      return {
        memberId: m.memberId,
        member: m.member,
        presentSessions: presentCount,
        totalSessions: expected,
        meetingsInPeriod: meetings.length,
        consistencyPercent: Math.min(100, rate),
        status:
          rate >= 80 ? 'consistent' : rate >= 50 ? 'moderate' : ('needs_attention' as const),
      };
    });

    const reports = await this.prisma.serviceUnitWeeklyReport.findMany({
      where: { serviceUnitId },
      orderBy: { weekStart: 'desc' },
      take: 6,
    });

    return {
      unit: {
        id: unit.id,
        name: unit.name,
        departmentCode: unit.departmentCode,
        departmentLabel: DEPARTMENT_LABEL[unit.departmentCode!],
      },
      memberCount: members.length,
      attendanceSessions: sessionDates.map((date) => ({
        serviceDate: date,
        ...sessionsByDate.get(date)!,
      })),
      latestAbsent: latestAbsent.map((m) => m.member),
      volunteerConsistency,
      weeklyReports: reports,
      periodWeeks: weeks,
    };
  }

  async recordBulkAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: {
      serviceDate: string;
      entries: Array<{ memberId: string; present: boolean; notes?: string }>;
    },
  ) {
    await this.assertParticipate(userId, churchId, serviceUnitId);
    await this.requireUnit(churchId, serviceUnitId);
    const memberIds = new Set(
      (
        await this.prisma.serviceUnitMember.findMany({
          where: { serviceUnitId },
          select: { memberId: true },
        })
      ).map((m) => m.memberId),
    );
    for (const e of data.entries) {
      if (!memberIds.has(e.memberId)) {
        throw new BadRequestException(`Member ${e.memberId} is not in this unit`);
      }
    }
    return this.attendance.recordBulk(
      churchId,
      {
        scope: AttendanceScope.DEPARTMENT,
        serviceDate: data.serviceDate,
        serviceUnitId,
        entries: data.entries,
      },
      userId,
    );
  }

  async notifyAbsentees(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    serviceDate?: string,
  ) {
    await this.assertManage(userId, churchId, serviceUnitId);
    return this.notifyAbsenteesInternal(churchId, serviceUnitId, serviceDate);
  }

  async notifyAbsenteesInternal(
    churchId: string,
    serviceUnitId: string,
    serviceDate?: string,
  ) {
    const unit = await this.requireUnit(churchId, serviceUnitId);
    const dashboard = await this.getDashboard(churchId, serviceUnitId, 2);
    const targetDate =
      serviceDate ??
      dashboard.attendanceSessions[0]?.serviceDate ??
      new Date().toISOString().slice(0, 10);

    const dayStart = new Date(`${targetDate}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        churchId,
        serviceUnitId,
        scope: AttendanceScope.DEPARTMENT,
        serviceDate: { gte: dayStart, lt: dayEnd },
      },
    });
    const members = await this.prisma.serviceUnitMember.findMany({
      where: { serviceUnitId },
      select: { memberId: true },
    });
    const recorded = new Set(records.map((r) => r.memberId));
    const absentIds = new Set<string>();
    for (const m of members) {
      const rec = records.find((r) => r.memberId === m.memberId);
      if (!rec || !rec.present) absentIds.add(m.memberId);
    }

    const label = DEPARTMENT_LABEL[unit.departmentCode!];
    let enqueued = 0;
    for (const memberId of absentIds) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_ABSENTEE',
        title: `${label} — we missed you`,
        body: `You were marked absent for ${label} on ${targetDate}. Reply to your unit leader if you need support.`,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetMemberId: memberId,
        metadata: { serviceDate: targetDate, departmentCode: unit.departmentCode },
      });
      enqueued++;
    }
    return { serviceDate: targetDate, notified: enqueued, memberIds: [...absentIds] };
  }

  async generateWeeklyReport(
    churchId: string,
    serviceUnitId: string,
    weekStartInput?: string,
    userId?: string,
    options?: { notifyInApp?: boolean },
  ) {
    if (userId) await this.assertManage(userId, churchId, serviceUnitId);
    const notifyInApp = options?.notifyInApp !== false;
    const unit = await this.requireUnit(churchId, serviceUnitId);
    const weekStart = weekStartInput
      ? weekStartUtc(new Date(weekStartInput))
      : weekStartUtc(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const dashboard = await this.getDashboard(churchId, serviceUnitId, 1);
    const weekAttendance = dashboard.attendanceSessions.filter((s) => {
      const d = new Date(`${s.serviceDate}T00:00:00.000Z`);
      return d >= weekStart && d < weekEnd;
    });

    const totalPresent = weekAttendance.reduce((n, s) => n + s.present, 0);
    const totalAbsent = weekAttendance.reduce((n, s) => n + s.absent, 0);
    const consistent = dashboard.volunteerConsistency.filter(
      (v) => v.status === 'consistent',
    ).length;

    const label = DEPARTMENT_LABEL[unit.departmentCode!];
    let body = [
      `${label} weekly report (${isoWeekKey(weekStart)})`,
      `Members: ${dashboard.memberCount}`,
      `Sessions: ${weekAttendance.length}`,
      `Present marks: ${totalPresent}`,
      `Absent marks: ${totalAbsent}`,
      `Consistent volunteers (≥80%): ${consistent}`,
    ].join('\n');

    const stats: Record<string, unknown> = {
      memberCount: dashboard.memberCount,
      sessions: weekAttendance.length,
      totalPresent,
      totalAbsent,
      consistentVolunteers: consistent,
      weekKey: isoWeekKey(weekStart),
    };

    if (unit.departmentCode === 'MEDICAL') {
      const [incidents, openFollowUp, teamServed, seriousCount] = await Promise.all([
        this.prisma.deptIncident.count({
          where: { serviceUnitId, occurredAt: { gte: weekStart, lt: weekEnd } },
        }),
        this.prisma.deptIncident.count({
          where: { serviceUnitId, followUpRequired: true, resolvedAt: null },
        }),
        this.prisma.deptMedicalTeamAttendance.count({
          where: { serviceUnitId, serviceDate: { gte: weekStart, lt: weekEnd } },
        }),
        this.prisma.deptIncident.count({
          where: {
            serviceUnitId,
            occurredAt: { gte: weekStart, lt: weekEnd },
            leadershipNotifiedAt: { not: null },
          },
        }),
      ]);
      body = [
        body,
        '',
        'Medical incident summary:',
        `Incidents this week: ${incidents}`,
        `Serious (leadership notified): ${seriousCount}`,
        `Open health follow-ups: ${openFollowUp}`,
        `Medical personnel on duty (log entries): ${teamServed}`,
      ].join('\n');
      stats.medicalIncidentsWeek = incidents;
      stats.medicalSeriousWeek = seriousCount;
      stats.medicalOpenFollowUps = openFollowUp;
      stats.medicalTeamAttendanceEntries = teamServed;
    }

    const report = await this.prisma.serviceUnitWeeklyReport.upsert({
      where: {
        serviceUnitId_weekStart: { serviceUnitId, weekStart },
      },
      create: {
        churchId,
        serviceUnitId,
        weekStart,
        body,
        stats: stats as Prisma.InputJsonValue,
      },
      update: { body, stats: stats as Prisma.InputJsonValue },
    });

    // Store + optional in-app — email goes via Monday / on-demand full digests (reports SMTP).
    if (notifyInApp) {
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
          title: `${label} — weekly report`,
          body,
          channels: ['IN_APP'],
          serviceUnitId,
          targetUserId: staff.id,
          metadata: { reportId: report.id, weekStart: weekStart.toISOString() },
        });
      }
    }

    return report;
  }

  /**
   * Full department digest: one table for all Phase 8 units → one Admin + one Pastor.
   * Sent via REPORTS SMTP (churchhub@…).
   */
  async sendFullDepartmentDigest(churchId: string, weekStartInput?: string) {
    await this.syncPhase8Units(churchId);
    const weekStart = weekStartInput
      ? weekStartUtc(new Date(weekStartInput))
      : weekStartUtc(new Date());
    const weekKey = isoWeekKey(weekStart);

    const units = await this.prisma.serviceUnit.findMany({
      where: {
        churchId,
        isActive: true,
        departmentCode: { in: PHASE8_DEPARTMENT_CODES },
      },
      select: { id: true, departmentCode: true, name: true },
      orderBy: { name: 'asc' },
    });

    const rows: Array<{
      label: string;
      memberCount: number;
      sessions: number;
      totalPresent: number;
      totalAbsent: number;
      consistentVolunteers: number;
    }> = [];

    for (const unit of units) {
      const report = await this.generateWeeklyReport(
        churchId,
        unit.id,
        weekStart.toISOString(),
        undefined,
        { notifyInApp: false },
      );
      const stats = (report.stats ?? {}) as Record<string, unknown>;
      const label =
        (unit.departmentCode && DEPARTMENT_LABEL[unit.departmentCode]) || unit.name;
      rows.push({
        label,
        memberCount: Number(stats.memberCount ?? 0),
        sessions: Number(stats.sessions ?? 0),
        totalPresent: Number(stats.totalPresent ?? 0),
        totalAbsent: Number(stats.totalAbsent ?? 0),
        consistentVolunteers: Number(stats.consistentVolunteers ?? 0),
      });
    }

    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Church';
    const subject = `${churchName} — Department weekly digest (${weekKey})`;

    const tableRows = rows
      .map(
        (r) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd">${escapeHtml(r.label)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.memberCount}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.sessions}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.totalPresent}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.totalAbsent}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.consistentVolunteers}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <p>Department weekly summary for <strong>${escapeHtml(churchName)}</strong> (week ${escapeHtml(weekKey)}).</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Department</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Members</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Sessions</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Present</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Absent</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Consistent (≥80%)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="6" style="padding:8px;border:1px solid #ddd">No department units</td></tr>`}
        </tbody>
      </table>
      <p style="color:#666;font-size:12px;margin-top:16px">Sent automatically Mondays at 10:00 Europe/London, or on demand from Church Hub.</p>
    `;

    const text = [
      `Department weekly summary for ${churchName} (week ${weekKey})`,
      '',
      'Department | Members | Sessions | Present | Absent | Consistent',
      ...rows.map(
        (r) =>
          `${r.label} | ${r.memberCount} | ${r.sessions} | ${r.totalPresent} | ${r.totalAbsent} | ${r.consistentVolunteers}`,
      ),
    ].join('\n');

    const recipients = await findOneAdminAndOnePastor(this.prisma, churchId);
    let emailed = 0;
    for (const recipient of recipients) {
      await this.email.send({
        to: recipient.email,
        subject,
        body: text,
        html,
        churchId,
        purpose: 'reports',
      });
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: recipient.id,
          title: subject,
          body: text.slice(0, 2000),
          type: 'DEPARTMENT_WEEKLY_REPORT',
          data: {
            digest: true,
            weekStart: weekStart.toISOString(),
            role: recipient.role,
          } as Prisma.InputJsonValue,
        },
      });
      emailed++;
    }

    if (rows.length > 0) {
      await this.prisma.serviceUnitWeeklyReport.updateMany({
        where: {
          churchId,
          weekStart,
          serviceUnitId: { in: units.map((u) => u.id) },
        },
        data: { emailedAt: new Date() },
      });
    }

    return {
      weekKey,
      departments: rows.length,
      recipients: recipients.map((r) => ({ role: r.role, email: r.email })),
      emailed,
    };
  }

  /** Scheduler: generate + email full digests for every active church. */
  async runDepartmentDigestsForAllChurches() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let digests = 0;
    for (const church of churches) {
      await this.sendFullDepartmentDigest(church.id);
      digests++;
    }
    return { churches: churches.length, digests };
  }

  async listWeeklyReports(churchId: string, serviceUnitId: string) {
    await this.requireUnit(churchId, serviceUnitId);
    return this.prisma.serviceUnitWeeklyReport.findMany({
      where: { churchId, serviceUnitId },
      orderBy: { weekStart: 'desc' },
      take: 24,
    });
  }

  /** Scheduler: generate reports for all Phase 8 units (no email fan-out). */
  async runWeeklyReportsForAllChurches() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let reports = 0;
    for (const church of churches) {
      await this.syncPhase8Units(church.id);
      const units = await this.prisma.serviceUnit.findMany({
        where: {
          churchId: church.id,
          isActive: true,
          departmentCode: { in: PHASE8_DEPARTMENT_CODES },
        },
        select: { id: true },
      });
      for (const unit of units) {
        await this.generateWeeklyReport(church.id, unit.id);
        reports++;
      }
    }
    return { churches: churches.length, reports };
  }

  async runAbsenteePassForAllChurches(serviceDate?: string) {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let notified = 0;
    for (const church of churches) {
      await this.syncPhase8Units(church.id);
      const units = await this.prisma.serviceUnit.findMany({
        where: {
          churchId: church.id,
          isActive: true,
          departmentCode: { in: PHASE8_DEPARTMENT_CODES },
        },
        select: { id: true },
      });
      for (const unit of units) {
        const result = await this.notifyAbsenteesInternal(
          church.id,
          unit.id,
          serviceDate,
        ).catch(() => null);
        if (result) notified += result.notified;
      }
    }
    return { notified };
  }

  private assertUsheringUnit(departmentCode: DepartmentCode | null) {
    if (departmentCode !== 'USHERING') {
      throw new BadRequestException('Weekly headcounts are only for the Ushering service unit');
    }
  }

  async listUsheringHeadcounts(churchId: string, serviceUnitId: string, weeks = 8) {
    const unit = await this.requireUnit(churchId, serviceUnitId);
    this.assertUsheringUnit(unit.departmentCode);
    const since = weekStartUtc(new Date());
    since.setUTCDate(since.getUTCDate() - weeks * 7);
    return this.prisma.usheringWeeklyHeadcount.findMany({
      where: { churchId, serviceUnitId, weekStart: { gte: since } },
      orderBy: { weekStart: 'desc' },
    });
  }

  async upsertUsheringHeadcount(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      weekStart?: string;
      male?: number;
      female?: number;
      babies?: number;
      children?: number;
      totalAttendees?: number;
    },
  ) {
    const unit = await this.requireUnit(churchId, serviceUnitId);
    this.assertUsheringUnit(unit.departmentCode);
    await this.assertManage(userId, churchId, serviceUnitId);

    const weekStart = body.weekStart
      ? weekStartUtc(new Date(body.weekStart))
      : weekStartUtc(new Date());
    const male = Math.max(0, Math.floor(body.male ?? 0));
    const female = Math.max(0, Math.floor(body.female ?? 0));
    const babies = Math.max(0, Math.floor(body.babies ?? 0));
    const children = Math.max(0, Math.floor(body.children ?? 0));
    const summed = male + female + babies + children;
    const totalAttendees =
      body.totalAttendees !== undefined
        ? Math.max(0, Math.floor(body.totalAttendees))
        : summed;

    return this.prisma.usheringWeeklyHeadcount.upsert({
      where: { serviceUnitId_weekStart: { serviceUnitId, weekStart } },
      create: {
        churchId,
        serviceUnitId,
        weekStart,
        male,
        female,
        babies,
        children,
        totalAttendees,
        recordedByUserId: userId,
      },
      update: {
        male,
        female,
        babies,
        children,
        totalAttendees,
        recordedByUserId: userId,
      },
    });
  }
}

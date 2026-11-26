import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceScope, DepartmentCode, Prisma, ServiceUnitWeeklyReport } from '@prisma/client';
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
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { trySendWhatsApp } from '../notifications/try-send-whatsapp';
import {
  escapeHtml,
  findOneAdminAndOnePastor,
} from '../notifications/report-digest.util';
import { brandPlainUpdate, loadChurchMailBrand, operationalEmailShell } from '../communications/operational-email';
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
    private readonly sms: SmsAdapter,
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
    return unit;
  }

  private unitDisplayName(unit: { name: string; departmentCode: DepartmentCode | null }) {
    if (unit.departmentCode && unit.departmentCode !== 'OTHER' && DEPARTMENT_LABEL[unit.departmentCode]) {
      return DEPARTMENT_LABEL[unit.departmentCode];
    }
    return unit.name;
  }

  private parseWeekStart(input?: string): Date {
    if (input == null || input === '') return weekStartUtc(new Date());
    if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      throw new BadRequestException('Choose a valid week');
    }
    const [year, month, day] = input.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException('Choose a valid week');
    }
    return weekStartUtc(parsed);
  }

  private clampWeeks(weeks: number): number {
    if (!Number.isFinite(weeks)) return 4;
    const whole = Math.trunc(weeks);
    if (whole < 1) return 1;
    if (whole > 8) return 8;
    return whole;
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

  async getDashboard(
    churchId: string,
    serviceUnitId: string,
    weeks = 4,
    userId?: string,
  ) {
    const unit = await this.requireUnit(churchId, serviceUnitId);
    let viewerCanManage = true;
    if (userId) {
      const ctx = await this.assertParticipate(userId, churchId, serviceUnitId);
      viewerCanManage = this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId);
    }
    weeks = this.clampWeeks(weeks);
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
        departmentLabel: this.unitDisplayName(unit),
      },
      memberCount: members.length,
      attendanceSessions: sessionDates.map((date) => ({
        serviceDate: date,
        ...sessionsByDate.get(date)!,
      })),
      latestAbsent: latestAbsent.map((m) => m.member),
      volunteerConsistency,
      weeklyReports: viewerCanManage ? reports : [],
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

    const label = this.unitDisplayName(unit);
    const brand = await loadChurchMailBrand(this.prisma, churchId);
    const title = `${label} — we missed you`;
    const body = `You were marked absent for ${label} on ${targetDate}. Reply to your unit leader if you need support.`;
    const emailHtml = brandPlainUpdate({
      churchName: brand.name,
      eyebrow: 'Department message',
      headline: 'We missed you',
      subhead: label,
      plain: body,
    });
    let enqueued = 0;
    for (const memberId of absentIds) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_ABSENTEE',
        title,
        body,
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        serviceUnitId,
        targetMemberId: memberId,
        metadata: { serviceDate: targetDate, departmentCode: unit.departmentCode, emailHtml },
      });
      enqueued++;
    }
    return { serviceDate: targetDate, notified: enqueued, memberIds: [...absentIds] };
  }

  async generateWeeklyReport(
    churchId: string,
    serviceUnitId: string,
    weekStartInput: string | undefined,
    userId: string | undefined,
    options: { preview: true; weekEnd?: string; notifyInApp?: boolean },
  ): Promise<{
    preview: true;
    body: string;
    stats: Record<string, unknown>;
    weekStart: Date;
    weekEnd: Date;
  }>;
  async generateWeeklyReport(
    churchId: string,
    serviceUnitId: string,
    weekStartInput?: string,
    userId?: string,
    options?: { notifyInApp?: boolean; preview?: boolean; weekEnd?: string },
  ): Promise<ServiceUnitWeeklyReport>;
  async generateWeeklyReport(
    churchId: string,
    serviceUnitId: string,
    weekStartInput?: string,
    userId?: string,
    options?: { notifyInApp?: boolean; preview?: boolean; weekEnd?: string },
  ) {
    const unit = await this.requireUnit(churchId, serviceUnitId);
    if (userId) await this.assertManage(userId, churchId, serviceUnitId);
    const notifyInApp = options?.notifyInApp !== false && options?.preview !== true;
    const weekStart = this.parseWeekStart(weekStartInput);
    const rangeStart = options?.weekEnd
      ? this.parseWeekStart(options.weekEnd)
      : weekStart;
    if (rangeStart.getTime() < weekStart.getTime()) {
      throw new BadRequestException('The end week must be the same week or a later week');
    }
    const weekEnd = new Date(rangeStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const spanDays = (weekEnd.getTime() - weekStart.getTime()) / 86_400_000;
    if (spanDays > 56) {
      throw new BadRequestException('Select a range of 8 weeks or less');
    }

    const [memberCount, attendance] = await Promise.all([
      this.prisma.serviceUnitMember.count({ where: { serviceUnitId } }),
      this.prisma.attendanceRecord.findMany({
        where: {
          churchId,
          serviceUnitId,
          scope: AttendanceScope.DEPARTMENT,
          serviceDate: { gte: weekStart, lt: weekEnd },
        },
        select: { memberId: true, present: true, serviceDate: true },
      }),
    ]);

    const sessionsByDate = new Map<string, { present: number; absent: number }>();
    for (const row of attendance) {
      const key = row.serviceDate.toISOString().slice(0, 10);
      const bucket = sessionsByDate.get(key) ?? { present: 0, absent: 0 };
      if (row.present) bucket.present++;
      else bucket.absent++;
      sessionsByDate.set(key, bucket);
    }
    const sessionDates = [...sessionsByDate.keys()];
    const totalPresent = [...sessionsByDate.values()].reduce((n, s) => n + s.present, 0);
    const totalAbsent = [...sessionsByDate.values()].reduce((n, s) => n + s.absent, 0);
    const presentByMember = new Map<string, number>();
    for (const row of attendance) {
      if (!row.present) continue;
      presentByMember.set(row.memberId, (presentByMember.get(row.memberId) ?? 0) + 1);
    }
    const expected = sessionDates.length || 1;
    const consistent = [...presentByMember.values()].filter(
      (presentSessions) => Math.round((presentSessions / expected) * 100) >= 80,
    ).length;

    const label = this.unitDisplayName(unit).replace(/[<>]/g, '');
    const rangeLabel =
      isoWeekKey(weekStart) === isoWeekKey(rangeStart)
        ? isoWeekKey(weekStart)
        : `${isoWeekKey(weekStart)} to ${isoWeekKey(rangeStart)}`;
    let body = [
      `${label} weekly report (${rangeLabel})`,
      `Members: ${memberCount}`,
      `Sessions: ${sessionDates.length}`,
      `Present marks: ${totalPresent}`,
      `Absent marks: ${totalAbsent}`,
      `Consistent volunteers (≥80%): ${consistent}`,
    ].join('\n');

    const stats: Record<string, unknown> = {
      memberCount,
      sessions: sessionDates.length,
      totalPresent,
      totalAbsent,
      consistentVolunteers: consistent,
      weekKey: isoWeekKey(weekStart),
      weekEndKey: isoWeekKey(rangeStart),
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

    if (options?.preview) {
      return {
        preview: true as const,
        body,
        stats,
        weekStart,
        weekEnd,
      };
    }

    const leadershipRecipients =
      notifyInApp && userId ? await findOneAdminAndOnePastor(this.prisma, churchId) : [];
    if (notifyInApp && userId && leadershipRecipients.length === 0) {
      throw new BadRequestException('No active church admin or pastor with an email address');
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

    if (notifyInApp && userId) {
      const brand = await loadChurchMailBrand(this.prisma, churchId);
      const emailHtml = brandPlainUpdate({
        churchName: brand.name,
        eyebrow: 'Weekly report',
        headline: `${label} weekly report`,
        subhead: rangeLabel,
        plain: body,
      });
      for (const staff of leadershipRecipients) {
        const metadata = {
          reportId: report.id,
          serviceUnitId,
          weekStart: weekStart.toISOString(),
          emailPurpose: 'reports' as const,
        };
        // Target the staff user only. Passing serviceUnitId would also
        // deliver the report to every member of the unit.
        await this.commQueue.enqueue(churchId, {
          kind: 'DEPARTMENT_WEEKLY_REPORT',
          title: `${label} — weekly report`,
          body,
          channels: ['IN_APP'],
          targetUserId: staff.id,
          metadata,
        });
        await this.commQueue.enqueue(churchId, {
          kind: 'DEPARTMENT_WEEKLY_REPORT',
          title: `${label} — weekly report`,
          body,
          channels: ['EMAIL'],
          targetUserId: staff.id,
          metadata: { ...metadata, emailHtml },
        });
      }
    } else if (notifyInApp) {
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
   * Sent via REPORTS SMTP (reports@…).
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
        this.unitDisplayName(unit);
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

    const html = operationalEmailShell({
      churchName,
      eyebrow: 'Weekly digest',
      headline: 'Department weekly digest',
      subhead: weekKey,
      bodyHtml: `
      <p style="margin:0 0 16px;">Department weekly summary for <strong>${escapeHtml(churchName)}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:13px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Department</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Members</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Sessions</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Present</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Absent</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:right">Consistent</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="6" style="padding:8px;border:1px solid #e2e8f0">No department units</td></tr>`}
        </tbody>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:16px">Sent automatically Mondays at 10:00 Europe/London, or on demand from Church Hub.</p>
    `,
    });

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
      await trySendWhatsApp(this.sms, this.logger, {
        to: recipient.phone,
        body: `${subject}\n\n${text}`,
        churchId,
        label: 'Department weekly report',
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

  async listWeeklyReports(churchId: string, serviceUnitId: string, userId?: string) {
    await this.requireUnit(churchId, serviceUnitId);
    if (userId) await this.assertManage(userId, churchId, serviceUnitId);
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

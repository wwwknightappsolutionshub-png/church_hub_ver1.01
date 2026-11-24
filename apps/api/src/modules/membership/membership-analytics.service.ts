import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MemberGender,
  MemberStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import {
  MembershipAnalyticsQuery,
  resolveAnalyticsRange,
  serializeAppliedFilters,
} from './membership-analytics-query';
import {
  ANALYTICS_AGE_BANDS,
  ageBandForDob,
  attendanceRate,
  buildMonthBucketsForRange,
  buildWeekBucketsEndingAt,
  deltaValue,
  dobRangeForAgeBand,
  priorEqualRange,
  retentionRate,
  SUNDAY_DEPARTMENT_CODES,
  type DateBucket,
} from './membership-analytics.util';
import {
  assignmentSlaCutoff,
  assignmentStaleWhereBranches,
  GRADUATED_FOLLOW_UP_STAGES,
} from '../follow-up/follow-up-assignment-sla';
import {
  sanitizeDigestRecipientEmails,
  validateDigestHourUtc,
  validateDigestWeekday,
} from './membership-analytics-digest.util';

const RETAINED_STATUSES: MemberStatus[] = ['NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'];
const COMPLETED_STAGE = 'JOINED_GROUP';
const SETTINGS_TARGETS_KEY = 'analyticsTargets';
const SETTINGS_DIGEST_KEY = 'analyticsDigest';

export interface AnalyticsTargets {
  retentionRate: number | null;
  attendanceRate: number | null;
  outreachCompletionRate: number | null;
  monthlyNewMembers: number | null;
}

const DEFAULT_TARGETS: AnalyticsTargets = {
  retentionRate: null,
  attendanceRate: null,
  outreachCompletionRate: null,
  monthlyNewMembers: null,
};

@Injectable()
export class MembershipAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async getDashboard(
    churchId: string,
    periodMonthsOrQuery: number | MembershipAnalyticsQuery = 6,
  ) {
    const query: MembershipAnalyticsQuery =
      typeof periodMonthsOrQuery === 'number'
        ? {
            months: Math.min(12, Math.max(3, periodMonthsOrQuery)),
            dateFrom: null,
            dateTo: null,
            compare: false,
            status: null,
            followUpStage: null,
            outreachStage: null,
            serviceUnitId: null,
            provinceId: null,
            branchId: null,
            serviceType: 'all',
            gender: null,
            ageBand: null,
            family: 'all',
          }
        : periodMonthsOrQuery;

    const range = resolveAnalyticsRange(query);
    const core = await this.buildCoreDashboard(churchId, query, range);

    let comparison: Awaited<ReturnType<MembershipAnalyticsService['buildComparison']>> | undefined;
    if (query.compare) {
      comparison = await this.buildComparison(churchId, query, range.start, range.end, core.summary);
    }

    const targets = await this.getTargets(churchId);
    const targetStatus = this.buildTargetStatus(targets, core);

    return {
      generatedAt: new Date().toISOString(),
      periodMonths: range.periodMonths,
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      appliedFilters: serializeAppliedFilters(query),
      ...core,
      comparison,
      targets,
      targetStatus,
    };
  }

  async getTargets(churchId: string): Promise<AnalyticsTargets> {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    const settings = (church?.settings as Record<string, unknown> | null) ?? {};
    const raw = (settings[SETTINGS_TARGETS_KEY] as Record<string, unknown> | undefined) ?? {};
    return {
      retentionRate: this.asNullableRate(raw.retentionRate),
      attendanceRate: this.asNullableRate(raw.attendanceRate),
      outreachCompletionRate: this.asNullableRate(raw.outreachCompletionRate),
      monthlyNewMembers:
        typeof raw.monthlyNewMembers === 'number' && Number.isFinite(raw.monthlyNewMembers)
          ? Math.max(0, Math.round(raw.monthlyNewMembers))
          : null,
    };
  }

  async updateTargets(churchId: string, body: Partial<AnalyticsTargets>): Promise<AnalyticsTargets> {
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');
    const current = await this.getTargets(churchId);
    const next: AnalyticsTargets = {
      retentionRate:
        body.retentionRate !== undefined ? this.asNullableRate(body.retentionRate) : current.retentionRate,
      attendanceRate:
        body.attendanceRate !== undefined
          ? this.asNullableRate(body.attendanceRate)
          : current.attendanceRate,
      outreachCompletionRate:
        body.outreachCompletionRate !== undefined
          ? this.asNullableRate(body.outreachCompletionRate)
          : current.outreachCompletionRate,
      monthlyNewMembers:
        body.monthlyNewMembers !== undefined
          ? body.monthlyNewMembers === null
            ? null
            : Math.max(0, Math.round(Number(body.monthlyNewMembers) || 0))
          : current.monthlyNewMembers,
    };
    const settings = { ...((church.settings as Record<string, unknown>) ?? {}) };
    settings[SETTINGS_TARGETS_KEY] = next;
    await this.prisma.church.update({
      where: { id: churchId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return next;
  }

  buildExportCsv(dashboard: Awaited<ReturnType<MembershipAnalyticsService['getDashboard']>>): string {
    const lines: string[] = [];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    lines.push('Section,Metric,Value');
    lines.push(`Summary,Total members,${dashboard.summary.totalMembers}`);
    lines.push(`Summary,Active / discipled,${dashboard.summary.activeMembers}`);
    lines.push(`Summary,Outreach contacts,${dashboard.summary.outreachContacts}`);
    lines.push(
      `Summary,Follow-up completion rate,${dashboard.summary.followUpCompletionRate}`,
    );
    lines.push(
      `Summary,Average attendance rate,${dashboard.summary.averageAttendanceRate}`,
    );
    if (dashboard.comparison) {
      lines.push(
        `Comparison,Prior total members,${dashboard.comparison.priorSummary.totalMembers}`,
      );
      lines.push(
        `Comparison,Delta total members,${dashboard.comparison.delta.totalMembers}`,
      );
    }
    for (const row of dashboard.growthTrends.memberGrowth) {
      lines.push(`Member growth,${esc(row.period)} total,${row.total}`);
      lines.push(`Member growth,${esc(row.period)} new,${row.newInPeriod}`);
    }
    for (const row of dashboard.growthTrends.newConvertGrowth) {
      lines.push(`Convert growth,${esc(row.period)} outreach,${row.outreachContacts}`);
      lines.push(`Convert growth,${esc(row.period)} members,${row.newMembers}`);
    }
    for (const row of dashboard.growthTrends.firstTimerRetention) {
      lines.push(`Retention,${esc(row.period)} rate,${row.retentionRate}`);
    }
    for (const row of dashboard.followUpByStage) {
      lines.push(`Pipeline,${esc(row.stage)},${row.count}`);
    }
    for (const row of dashboard.demographics.byGender) {
      lines.push(`Demographics gender,${esc(row.label)},${row.count}`);
    }
    for (const row of dashboard.demographics.byAgeBand) {
      lines.push(`Demographics age,${esc(row.label)},${row.count}`);
    }
    for (const t of dashboard.targetStatus) {
      lines.push(
        `Target,${esc(t.label)},actual=${t.actual};target=${t.target ?? 'n/a'};met=${t.met}`,
      );
    }
    return lines.join('\n');
  }

  private async buildCoreDashboard(
    churchId: string,
    query: MembershipAnalyticsQuery,
    range: ReturnType<typeof resolveAnalyticsRange>,
  ) {
    const memberWhere = this.memberWhere(churchId, query);
    const weeks = buildWeekBucketsEndingAt(range.end, 8);

    const [
      totalMembers,
      activeMembers,
      outreachContacts,
      followUpTotal,
      followUpCompleted,
      followUpByStage,
      memberGrowth,
      newConvertGrowth,
      firstTimerRetention,
      weeklyAttendance,
      departmentPerformance,
      followUpCompleteness,
      demographics,
      avgAttendance,
      establishmentOps,
      cellGrowth,
    ] = await Promise.all([
      this.prisma.member.count({ where: memberWhere }),
      this.prisma.member.count({
        where: { ...memberWhere, status: { in: ['ACTIVE_MEMBER', 'DISCIPLED'] } },
      }),
      this.prisma.outreachContact.count({
        where: this.outreachWhere(churchId, query, range.start, range.end),
      }),
      this.prisma.followUp.count({ where: this.followUpWhere(churchId, query) }),
      this.prisma.followUp.count({
        where: { ...this.followUpWhere(churchId, query), stage: COMPLETED_STAGE },
      }),
      this.prisma.followUp.groupBy({
        by: ['stage'],
        where: this.followUpWhere(churchId, query),
        _count: { id: true },
      }),
      this.buildMemberGrowth(memberWhere, range.months),
      this.buildNewConvertGrowth(churchId, query, memberWhere, range.months),
      this.buildFirstTimerRetention(memberWhere, range.months),
      this.buildWeeklyAttendance(churchId, query, weeks),
      this.buildDepartmentPerformance(churchId, query, range.start, range.end),
      this.buildFollowUpCompleteness(churchId, query, range.months),
      this.buildDemographics(memberWhere),
      this.buildAverageAttendance(churchId, query, range.start, range.end),
      this.buildEstablishmentOps(churchId),
      this.buildCellGrowth(churchId, query, range.start, range.end),
    ]);

    return {
      summary: {
        totalMembers,
        activeMembers,
        outreachContacts,
        followUpCompletionRate:
          followUpTotal > 0 ? Math.round((followUpCompleted / followUpTotal) * 1000) / 1000 : 0,
        averageAttendanceRate: avgAttendance,
      },
      growthTrends: {
        memberGrowth,
        newConvertGrowth,
        firstTimerRetention,
      },
      absenteeTrends: weeklyAttendance.map((w) => ({
        period: w.period,
        absent: w.absent,
        present: w.present,
        rate: w.absent + w.present > 0 ? w.absent / (w.absent + w.present) : 0,
      })),
      attendancePerformance: weeklyAttendance,
      departmentPerformance,
      followUpCompleteness,
      followUpByStage: followUpByStage.map((g) => ({
        stage: g.stage,
        count: g._count.id,
      })),
      demographics,
      establishmentOps,
      cellGrowth,
    };
  }

  private async buildEstablishmentOps(churchId: string) {
    const now = new Date();
    const slaCutoff = assignmentSlaCutoff(now);
    const base = { churchId, archivedAt: null };
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const [overdue, dueToday, archiveRequested, joinedGroupDay6] = await Promise.all([
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: [...GRADUATED_FOLLOW_UP_STAGES] },
          OR: [{ dueAt: { lt: now } }, ...assignmentStaleWhereBranches(slaCutoff)],
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: [...GRADUATED_FOLLOW_UP_STAGES] },
          dueAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.followUp.count({
        where: { ...base, archiveRequestedAt: { not: null } },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: 'JOINED_GROUP',
          joinedGroupDay6NotifiedAt: null,
          createdAt: { lte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { overdue, dueToday, archiveRequested, joinedGroupDay6 };
  }

  private async buildCellGrowth(
    churchId: string,
    query: MembershipAnalyticsQuery,
    start: Date,
    end: Date,
  ) {
    const branchWhere: Prisma.CellBranchWhereInput = { churchId };
    if (query.provinceId) branchWhere.provinceId = query.provinceId;
    if (query.branchId) branchWhere.id = query.branchId;

    const branches = await this.prisma.cellBranch.findMany({
      where: branchWhere,
      select: { id: true, _count: { select: { members: true } } },
    });
    const branchIds = branches.map((b) => b.id);
    if (branchIds.length === 0) {
      return { activeBranches: 0, membersInCells: 0, weeklyAttendance: [] };
    }

    const attendance = await this.prisma.cellAttendance.findMany({
      where: {
        churchId,
        branchId: { in: branchIds },
        weekStart: { gte: start, lte: end },
      },
      select: { weekStart: true, presentCount: true },
      orderBy: { weekStart: 'asc' },
    });

    const byWeek = new Map<string, number>();
    for (const row of attendance) {
      const key = row.weekStart.toISOString().slice(0, 10);
      byWeek.set(key, (byWeek.get(key) ?? 0) + row.presentCount);
    }

    return {
      activeBranches: branches.length,
      membersInCells: branches.reduce((s, b) => s + b._count.members, 0),
      weeklyAttendance: [...byWeek.entries()].map(([period, present]) => ({ period, present })),
    };
  }

  async getDigestSettings(churchId: string) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    const settings = (church?.settings as Record<string, unknown> | null) ?? {};
    const raw = (settings[SETTINGS_DIGEST_KEY] as Record<string, unknown> | undefined) ?? {};
    return {
      enabled: raw.enabled === true,
      recipientEmails: Array.isArray(raw.recipientEmails)
        ? raw.recipientEmails.filter((e): e is string => typeof e === 'string')
        : [],
      weekday: typeof raw.weekday === 'number' ? raw.weekday : 1,
      hourUtc: typeof raw.hourUtc === 'number' ? raw.hourUtc : 8,
    };
  }

  async updateDigestSettings(
    churchId: string,
    body: {
      enabled?: boolean;
      recipientEmails?: string[];
      weekday?: number;
      hourUtc?: number;
    },
    actorId: string,
  ) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');
    const settings = (church.settings as Record<string, unknown> | null) ?? {};
    const current = await this.getDigestSettings(churchId);
    const next = {
      ...current,
      ...(body.enabled !== undefined ? { enabled: body.enabled === true } : {}),
      ...(body.recipientEmails !== undefined
        ? { recipientEmails: sanitizeDigestRecipientEmails(body.recipientEmails) }
        : {}),
      ...(body.weekday !== undefined ? { weekday: validateDigestWeekday(body.weekday) } : {}),
      ...(body.hourUtc !== undefined ? { hourUtc: validateDigestHourUtc(body.hourUtc) } : {}),
    };
    if (next.enabled && next.recipientEmails.length === 0) {
      throw new BadRequestException('Add at least one recipient email before enabling the digest');
    }
    await this.prisma.church.update({
      where: { id: churchId },
      data: {
        settings: {
          ...settings,
          [SETTINGS_DIGEST_KEY]: next,
        } as Prisma.InputJsonValue,
      },
    });

    await this.audit.append({
      churchId,
      actorId,
      action: 'ANALYTICS_DIGEST_UPDATED',
      targetType: 'Church',
      targetId: churchId,
      metadata: {
        enabled: next.enabled,
        recipientCount: next.recipientEmails.length,
        weekday: next.weekday,
        hourUtc: next.hourUtc,
        fieldsChanged: {
          enabled: body.enabled !== undefined,
          recipientEmails: body.recipientEmails !== undefined,
          weekday: body.weekday !== undefined,
          hourUtc: body.hourUtc !== undefined,
        },
      },
    });

    return next;
  }

  private async buildComparison(
    churchId: string,
    query: MembershipAnalyticsQuery,
    start: Date,
    end: Date,
    current: {
      totalMembers: number;
      activeMembers: number;
      outreachContacts: number;
      followUpCompletionRate: number;
      averageAttendanceRate: number;
    },
  ) {
    const prior = priorEqualRange(start, end);
    const priorQuery: MembershipAnalyticsQuery = {
      ...query,
      compare: false,
      dateFrom: prior.start,
      dateTo: new Date(prior.end.getTime() - 1),
      months: query.months,
    };
    const priorRange = {
      start: prior.start,
      end: prior.end,
      periodMonths: buildMonthBucketsForRange(prior.start, new Date(prior.end.getTime() - 1)).length,
      months: buildMonthBucketsForRange(prior.start, new Date(prior.end.getTime() - 1)),
    };
    const priorCore = await this.buildCoreDashboard(churchId, priorQuery, priorRange);
    return {
      priorRange: { start: prior.start.toISOString(), end: prior.end.toISOString() },
      priorSummary: priorCore.summary,
      delta: {
        totalMembers: deltaValue(current.totalMembers, priorCore.summary.totalMembers),
        activeMembers: deltaValue(current.activeMembers, priorCore.summary.activeMembers),
        outreachContacts: deltaValue(current.outreachContacts, priorCore.summary.outreachContacts),
        followUpCompletionRate: deltaValue(
          current.followUpCompletionRate,
          priorCore.summary.followUpCompletionRate,
        ),
        averageAttendanceRate: deltaValue(
          current.averageAttendanceRate,
          priorCore.summary.averageAttendanceRate,
        ),
      },
    };
  }

  private memberWhere(churchId: string, query: MembershipAnalyticsQuery): Prisma.MemberWhereInput {
    const where: Prisma.MemberWhereInput = { churchId };
    if (query.status) where.status = query.status;
    if (query.gender) where.gender = query.gender;
    if (query.family === 'with_family') where.familyId = { not: null };
    if (query.family === 'no_family') where.familyId = null;
    if (query.ageBand) {
      const dob = dobRangeForAgeBand(query.ageBand);
      if (dob.unknownOnly) where.dateOfBirth = null;
      else
        where.dateOfBirth = {
          gte: dob.dobMin,
          lt: dob.dobMax,
        };
    }
    if (query.serviceUnitId) {
      where.serviceUnitMemberships = { some: { serviceUnitId: query.serviceUnitId } };
    }
    if (query.branchId) {
      where.cellBranchMembership = { is: { branchId: query.branchId } };
    } else if (query.provinceId) {
      where.cellBranchMembership = {
        is: { branch: { provinceId: query.provinceId } },
      };
    }
    return where;
  }

  private outreachWhere(
    churchId: string,
    query: MembershipAnalyticsQuery,
    start?: Date,
    end?: Date,
  ): Prisma.OutreachContactWhereInput {
    const where: Prisma.OutreachContactWhereInput = { churchId };
    if (query.outreachStage) where.convertStage = query.outreachStage;
    if (start && end) where.capturedAt = { gte: start, lt: end };
    return where;
  }

  private followUpWhere(churchId: string, query: MembershipAnalyticsQuery): Prisma.FollowUpWhereInput {
    const where: Prisma.FollowUpWhereInput = { churchId, archivedAt: null };
    if (query.followUpStage) where.stage = query.followUpStage;
    return where;
  }

  private async buildMemberGrowth(memberWhere: Prisma.MemberWhereInput, months: DateBucket[]) {
    const results = [];
    for (const bucket of months) {
      const [total, newInPeriod] = await Promise.all([
        this.prisma.member.count({
          where: { ...memberWhere, createdAt: { lt: bucket.end } },
        }),
        this.prisma.member.count({
          where: { ...memberWhere, createdAt: { gte: bucket.start, lt: bucket.end } },
        }),
      ]);
      results.push({ period: bucket.key, total, newInPeriod });
    }
    return results;
  }

  private async buildNewConvertGrowth(
    churchId: string,
    query: MembershipAnalyticsQuery,
    memberWhere: Prisma.MemberWhereInput,
    months: DateBucket[],
  ) {
    const results = [];
    for (const bucket of months) {
      const [outreachContacts, newMembers] = await Promise.all([
        this.prisma.outreachContact.count({
          where: this.outreachWhere(churchId, query, bucket.start, bucket.end),
        }),
        this.prisma.member.count({
          where: {
            ...memberWhere,
            createdAt: { gte: bucket.start, lt: bucket.end },
            status: { in: RETAINED_STATUSES },
          },
        }),
      ]);
      results.push({ period: bucket.key, outreachContacts, newMembers });
    }
    return results;
  }

  private async buildFirstTimerRetention(
    memberWhere: Prisma.MemberWhereInput,
    months: DateBucket[],
  ) {
    const results = [];
    for (const bucket of months) {
      const newVisitors = await this.prisma.member.count({
        where: { ...memberWhere, createdAt: { gte: bucket.start, lt: bucket.end } },
      });
      const retained = await this.prisma.member.count({
        where: {
          ...memberWhere,
          createdAt: { gte: bucket.start, lt: bucket.end },
          status: { in: RETAINED_STATUSES },
        },
      });
      results.push({
        period: bucket.key,
        newVisitors,
        retained,
        retentionRate: retentionRate(retained, newVisitors),
      });
    }
    return results;
  }

  private async buildWeeklyAttendance(
    churchId: string,
    query: MembershipAnalyticsQuery,
    weeks: DateBucket[],
  ) {
    if (query.serviceType === 'sunday' || query.serviceType === 'chop') {
      return this.buildWeeklyHeadcountAttendance(churchId, query.serviceType, weeks);
    }

    const memberFilter = this.memberWhere(churchId, query);
    const results = [];
    for (const bucket of weeks) {
      const records = await this.prisma.attendanceRecord.groupBy({
        by: ['present'],
        where: {
          churchId,
          scope: 'SERVICE',
          serviceDate: { gte: bucket.start, lt: bucket.end },
          ...(query.serviceUnitId || query.provinceId || query.branchId || query.status || query.gender || query.ageBand || query.family !== 'all'
            ? { member: memberFilter }
            : {}),
        },
        _count: { id: true },
      });
      const present = records.find((r) => r.present === true)?._count.id ?? 0;
      const absent = records.find((r) => r.present === false)?._count.id ?? 0;
      results.push({
        period: bucket.key,
        present,
        absent,
        rate: attendanceRate(present, absent),
      });
    }
    return results;
  }

  private async buildWeeklyHeadcountAttendance(
    churchId: string,
    serviceType: 'sunday' | 'chop',
    weeks: DateBucket[],
  ) {
    const sundaySet = new Set<string>(SUNDAY_DEPARTMENT_CODES);
    const units = await this.prisma.serviceUnit.findMany({
      where: { churchId, isActive: true },
      select: { id: true, departmentCode: true },
    });
    const unitIds = units
      .filter((u) => {
        const code = u.departmentCode ?? null;
        const isSunday = code != null && sundaySet.has(code);
        return serviceType === 'sunday' ? isSunday : !isSunday;
      })
      .map((u) => u.id);

    const results = [];
    for (const bucket of weeks) {
      if (unitIds.length === 0) {
        results.push({ period: bucket.key, present: 0, absent: 0, rate: 0 });
        continue;
      }
      const rows = await this.prisma.serviceUnitAttendance.findMany({
        where: {
          churchId,
          serviceUnitId: { in: unitIds },
          OR: [
            { weekStart: { gte: bucket.start, lt: bucket.end } },
            { meetingDate: { gte: bucket.start, lt: bucket.end } },
          ],
        },
        select: { presentCount: true },
      });
      const present = rows.reduce((s, r) => s + (r.presentCount ?? 0), 0);
      results.push({
        period: bucket.key,
        present,
        absent: 0,
        rate: present > 0 ? 1 : 0,
      });
    }
    return results;
  }

  private async buildAverageAttendance(
    churchId: string,
    query: MembershipAnalyticsQuery,
    start: Date,
    end: Date,
  ) {
    if (query.serviceType === 'sunday' || query.serviceType === 'chop') {
      const weeks = buildWeekBucketsEndingAt(end, 8).filter((w) => w.end > start);
      const series = await this.buildWeeklyHeadcountAttendance(churchId, query.serviceType, weeks);
      const present = series.reduce((s, r) => s + r.present, 0);
      return present > 0 ? 1 : 0;
    }
    const memberFilter = this.memberWhere(churchId, query);
    const recentAttendance = await this.prisma.attendanceRecord.findMany({
      where: {
        churchId,
        scope: 'SERVICE',
        serviceDate: { gte: start, lt: end },
        ...(query.serviceUnitId ||
        query.provinceId ||
        query.branchId ||
        query.status ||
        query.gender ||
        query.ageBand ||
        query.family !== 'all'
          ? { member: memberFilter }
          : {}),
      },
      select: { present: true },
    });
    const presentCount = recentAttendance.filter((r) => r.present).length;
    const absentCount = recentAttendance.filter((r) => !r.present).length;
    return attendanceRate(presentCount, absentCount);
  }

  private async buildDepartmentPerformance(
    churchId: string,
    query: MembershipAnalyticsQuery,
    start: Date,
    end: Date,
  ) {
    const units = await this.prisma.serviceUnit.findMany({
      where: {
        churchId,
        isActive: true,
        ...(query.serviceUnitId ? { id: query.serviceUnitId } : {}),
      },
      select: { id: true, name: true, departmentCode: true },
      orderBy: { name: 'asc' },
    });

    const sundaySet = new Set<string>(SUNDAY_DEPARTMENT_CODES);
    const filteredUnits = units.filter((u) => {
      if (query.serviceType === 'all') return true;
      const isSunday = u.departmentCode != null && sundaySet.has(u.departmentCode);
      return query.serviceType === 'sunday' ? isSunday : !isSunday;
    });

    const results = [];
    for (const unit of filteredUnits) {
      const records = await this.prisma.attendanceRecord.groupBy({
        by: ['present'],
        where: {
          churchId,
          scope: 'DEPARTMENT',
          serviceUnitId: unit.id,
          serviceDate: { gte: start, lt: end },
        },
        _count: { id: true },
      });
      const present = records.find((r) => r.present === true)?._count.id ?? 0;
      const absent = records.find((r) => r.present === false)?._count.id ?? 0;
      if (present + absent === 0) continue;
      results.push({
        serviceUnitId: unit.id,
        name: unit.name,
        present,
        absent,
        rate: attendanceRate(present, absent),
      });
    }
    return results.sort((a, b) => b.rate - a.rate);
  }

  private async buildFollowUpCompleteness(
    churchId: string,
    query: MembershipAnalyticsQuery,
    months: DateBucket[],
  ) {
    const results = [];
    for (const bucket of months) {
      const base = this.followUpWhere(churchId, query);
      const [created, completed] = await Promise.all([
        this.prisma.followUp.count({
          where: { ...base, createdAt: { gte: bucket.start, lt: bucket.end } },
        }),
        this.prisma.followUp.count({
          where: {
            ...base,
            stage: COMPLETED_STAGE,
            updatedAt: { gte: bucket.start, lt: bucket.end },
          },
        }),
      ]);
      results.push({
        period: bucket.key,
        created,
        completed,
        completionRate: retentionRate(completed, created),
      });
    }
    return results;
  }

  private async buildDemographics(memberWhere: Prisma.MemberWhereInput) {
    const members = await this.prisma.member.findMany({
      where: memberWhere,
      select: { gender: true, dateOfBirth: true, familyId: true },
    });
    const genderCounts = new Map<string, number>();
    const ageCounts = new Map<string, number>();
    let withFamily = 0;
    let noFamily = 0;
    for (const m of members) {
      const g = m.gender ?? MemberGender.UNKNOWN;
      genderCounts.set(g, (genderCounts.get(g) ?? 0) + 1);
      const band = ageBandForDob(m.dateOfBirth);
      ageCounts.set(band, (ageCounts.get(band) ?? 0) + 1);
      if (m.familyId) withFamily += 1;
      else noFamily += 1;
    }
    return {
      byGender: ['MALE', 'FEMALE', 'UNKNOWN'].map((key) => ({
        key,
        label: key === 'MALE' ? 'Male' : key === 'FEMALE' ? 'Female' : 'Unknown',
        count: genderCounts.get(key) ?? 0,
      })),
      byAgeBand: ANALYTICS_AGE_BANDS.map((b) => ({
        key: b.key,
        label: b.label,
        count: ageCounts.get(b.key) ?? 0,
      })),
      byFamily: [
        { key: 'with_family', label: 'With family', count: withFamily },
        { key: 'no_family', label: 'No family', count: noFamily },
      ],
    };
  }

  private buildTargetStatus(
    targets: AnalyticsTargets,
    core: {
      summary: {
        followUpCompletionRate: number;
        averageAttendanceRate: number;
      };
      growthTrends: {
        firstTimerRetention: Array<{ retentionRate: number }>;
        memberGrowth: Array<{ newInPeriod: number }>;
      };
    },
  ) {
    const retentionActual =
      core.growthTrends.firstTimerRetention.length > 0
        ? core.growthTrends.firstTimerRetention[
            core.growthTrends.firstTimerRetention.length - 1
          ]!.retentionRate
        : 0;
    const monthlyNew =
      core.growthTrends.memberGrowth.length > 0
        ? core.growthTrends.memberGrowth[core.growthTrends.memberGrowth.length - 1]!.newInPeriod
        : 0;

    const rows: Array<{
      key: keyof AnalyticsTargets;
      label: string;
      target: number | null;
      actual: number;
      met: boolean | null;
      unit: 'rate' | 'count';
    }> = [
      {
        key: 'retentionRate',
        label: 'First-timer retention',
        target: targets.retentionRate,
        actual: retentionActual,
        met: targets.retentionRate == null ? null : retentionActual >= targets.retentionRate,
        unit: 'rate',
      },
      {
        key: 'attendanceRate',
        label: 'Attendance rate',
        target: targets.attendanceRate,
        actual: core.summary.averageAttendanceRate,
        met:
          targets.attendanceRate == null
            ? null
            : core.summary.averageAttendanceRate >= targets.attendanceRate,
        unit: 'rate',
      },
      {
        key: 'outreachCompletionRate',
        label: 'Outreach completion',
        target: targets.outreachCompletionRate,
        actual: core.summary.followUpCompletionRate,
        met:
          targets.outreachCompletionRate == null
            ? null
            : core.summary.followUpCompletionRate >= targets.outreachCompletionRate,
        unit: 'rate',
      },
      {
        key: 'monthlyNewMembers',
        label: 'New members (latest month)',
        target: targets.monthlyNewMembers,
        actual: monthlyNew,
        met:
          targets.monthlyNewMembers == null ? null : monthlyNew >= targets.monthlyNewMembers,
        unit: 'count',
      },
    ];
    return rows;
  }

  private asNullableRate(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(n)) return null;
    return Math.min(1, Math.max(0, Math.round(n * 1000) / 1000));
  }
}

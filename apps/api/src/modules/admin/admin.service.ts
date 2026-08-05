import { Injectable } from '@nestjs/common';
import { DepartmentCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipService } from '../membership/membership.service';

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' });
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async getDashboardMetrics(churchId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      memberCount,
      membersByStatus,
      followUpByStage,
      outreachCount,
      youthGroupCount,
      businessCount,
      rideCount,
      sermonCount,
      membersAtStartOfMonth,
      membersAddedThisMonth,
      membersAddedPrevMonth,
      outreachThisMonth,
      outreachPrevMonth,
      completedFollowUps,
      totalFollowUps,
      pendingFollowUps,
      ridesCompletedToday,
      recentMembers,
      recentOutreach,
      membersBeforeWindow,
      outreachBeforeWindow,
    ] = await Promise.all([
      this.prisma.member.count({ where: { churchId } }),
      this.prisma.member.groupBy({ by: ['status'], where: { churchId }, _count: true }),
      this.prisma.followUp.groupBy({ by: ['stage'], where: { churchId }, _count: true }),
      this.prisma.outreachContact.count({ where: { churchId } }),
      this.prisma.youthGroup.count({ where: { churchId, isActive: true } }),
      this.prisma.businessProfile.count({ where: { churchId, verificationStatus: 'VERIFIED' } }),
      this.prisma.rideRequest.count({
        where: { churchId, status: { in: ['REQUESTED', 'SCHEDULED', 'IN_TRANSIT', 'PICKED_UP'] } },
      }),
      this.prisma.sermon.count({ where: { churchId } }),
      this.prisma.member.count({ where: { churchId, createdAt: { lt: startOfMonth } } }),
      this.prisma.member.count({ where: { churchId, createdAt: { gte: startOfMonth } } }),
      this.prisma.member.count({
        where: { churchId, createdAt: { gte: startOfPrevMonth, lt: startOfMonth } },
      }),
      this.prisma.outreachContact.count({ where: { churchId, createdAt: { gte: startOfMonth } } }),
      this.prisma.outreachContact.count({
        where: { churchId, createdAt: { gte: startOfPrevMonth, lt: startOfMonth } },
      }),
      this.prisma.followUp.count({ where: { churchId, stage: 'JOINED_GROUP' } }),
      this.prisma.followUp.count({ where: { churchId } }),
      this.prisma.followUp.count({
        where: { churchId, stage: { not: 'JOINED_GROUP' } },
      }),
      this.prisma.rideRequest.count({
        where: {
          churchId,
          status: 'DROPPED_OFF',
          droppedOffAt: { gte: startOfToday },
        },
      }),
      this.prisma.member.findMany({
        where: { churchId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      this.prisma.outreachContact.findMany({
        where: { churchId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      this.prisma.member.count({ where: { churchId, createdAt: { lt: sixMonthsAgo } } }),
      this.prisma.outreachContact.count({
        where: { churchId, createdAt: { lt: sixMonthsAgo } },
      }),
    ]);

    const monthBuckets: Array<{ key: string; month: string; membersAdded: number; outreachAdded: number }> =
      [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      monthBuckets.push({
        key: monthKey(d),
        month: monthLabel(d),
        membersAdded: 0,
        outreachAdded: 0,
      });
    }
    const bucketIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
    for (const row of recentMembers) {
      const idx = bucketIndex.get(monthKey(new Date(row.createdAt)));
      if (idx !== undefined) monthBuckets[idx].membersAdded += 1;
    }
    for (const row of recentOutreach) {
      const idx = bucketIndex.get(monthKey(new Date(row.createdAt)));
      if (idx !== undefined) monthBuckets[idx].outreachAdded += 1;
    }

    let membersRunning = membersBeforeWindow;
    let outreachRunning = outreachBeforeWindow;
    const growth = monthBuckets.map((b) => {
      membersRunning += b.membersAdded;
      outreachRunning += b.outreachAdded;
      return {
        month: b.month,
        members: membersRunning,
        outreach: outreachRunning,
      };
    });

    return {
      membership: {
        total: memberCount,
        byStatus: membersByStatus,
        changePct: pctChange(memberCount, membersAtStartOfMonth),
        addedThisMonth: membersAddedThisMonth,
        addedPrevMonth: membersAddedPrevMonth,
      },
      followUp: {
        byStage: followUpByStage,
        completionRate: totalFollowUps > 0 ? completedFollowUps / totalFollowUps : 0,
        pending: pendingFollowUps,
        completed: completedFollowUps,
      },
      evangelism: {
        totalContacts: outreachCount,
        thisMonth: outreachThisMonth,
        changePct: pctChange(outreachThisMonth, outreachPrevMonth),
      },
      youth: { activeGroups: youthGroupCount },
      business: { verifiedProfiles: businessCount },
      bus: {
        activeRides: rideCount,
        completedToday: ridesCompletedToday,
      },
      communications: { sermonCount },
      growth,
    };
  }

  /** Unified admin command center — aggregates cross-module operational KPIs. */
  async getUnifiedHub(churchId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      metrics,
      newMembersWeek,
      pendingSync,
      openConflicts,
      pendingNotifications,
      pendingFollowUps,
      activeAutomationRules,
      pendingHubPosts,
    ] = await Promise.all([
      this.getDashboardMetrics(churchId),
      this.prisma.member.count({ where: { churchId, createdAt: { gte: weekAgo } } }),
      this.prisma.syncQueueItem.count({
        where: { churchId, status: { in: ['PENDING', 'FAILED', 'CONFLICT'] } },
      }),
      this.prisma.syncConflict.count({ where: { churchId, status: 'OPEN' } }),
      this.prisma.communicationQueueItem.count({
        where: { churchId, status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      this.prisma.followUp.count({
        where: { churchId, stage: { not: 'JOINED_GROUP' } },
      }),
      this.prisma.followUpAutomationRule.count({
        where: { churchId, isActive: true },
      }),
      this.prisma.communityHubPost.count({
        where: { churchId, status: 'PENDING' },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      metrics,
      operations: {
        newMembersThisWeek: newMembersWeek,
        outreachSyncPending: pendingSync,
        outreachSyncConflicts: openConflicts,
        communicationsQueuePending: pendingNotifications,
        followUpsOpen: pendingFollowUps,
        automationRulesActive: activeAutomationRules,
        communityHubPendingModeration: pendingHubPosts,
      },
      modules: [
        { key: 'membership', label: 'Membership', path: '/dashboard/membership', status: 'ok' },
        { key: 'analytics', label: 'Analytics', path: '/dashboard/analytics', status: 'ok' },
        { key: 'automation', label: 'Automation', path: '/dashboard/automation', status: 'ok' },
        { key: 'follow-up', label: 'Follow-Up', path: '/dashboard/follow-up', status: 'ok' },
        { key: 'outreach', label: 'Outreach', path: '/dashboard/outreach', status: openConflicts > 0 ? 'attention' : 'ok' },
        { key: 'communications', label: 'Communications', path: '/dashboard/communications', status: pendingNotifications > 0 ? 'attention' : 'ok' },
        { key: 'staff', label: 'Church Staff', path: '/dashboard/staff', status: 'ok' },
      ],
    };
  }

  async getAttendancePerformance(churchId: string, weeks = 8) {
    const flow = await this.membership.getUsheringWeeklyAttendanceFlow(churchId, weeks);
    const chart = flow.weeks.map((w) => ({
      period: w.period,
      label: new Date(w.period).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      total: w.totalAttendees,
      male: w.male,
      female: w.female,
      babies: w.babies,
      children: w.children,
    }));
    const totals = chart.map((c) => c.total).filter((n) => n > 0);
    const avg =
      totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
    const latest = chart.length ? chart[chart.length - 1].total : 0;
    const previous = chart.length > 1 ? chart[chart.length - 2].total : 0;
    const changePct =
      previous > 0 ? Math.round(((latest - previous) / previous) * 100) : latest > 0 ? 100 : 0;

    const sundayCodes: DepartmentCode[] = [
      DepartmentCode.USHERING,
      DepartmentCode.PROTOCOL,
      DepartmentCode.YOUTH,
      DepartmentCode.TEENS,
      DepartmentCode.CHILDREN,
    ];
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const [unitAtt, usheringRows, chopRows] = await Promise.all([
      this.prisma.serviceUnitAttendance.findMany({
        where: {
          churchId,
          weekStart: { gte: since },
          serviceUnit: { departmentCode: { in: sundayCodes } },
        },
        include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        orderBy: { weekStart: 'asc' },
      }),
      this.prisma.usheringWeeklyHeadcount.findMany({
        where: { churchId, weekStart: { gte: since } },
        include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        orderBy: { weekStart: 'asc' },
      }),
      this.prisma.serviceUnitAttendance.findMany({
        where: {
          churchId,
          weekStart: { gte: since },
          OR: [
            { serviceUnit: { departmentCode: { notIn: sundayCodes } } },
            { serviceUnit: { departmentCode: null } },
          ],
        },
        include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        orderBy: { weekStart: 'asc' },
      }),
    ]);

    const byUnitMap = new Map<
      string,
      {
        serviceUnitId: string;
        serviceUnitName: string;
        departmentCode: string | null;
        weeks: Array<{ period: string; total: number; male: number; female: number; boys: number; girls: number }>;
      }
    >();

    const pushWeek = (
      unitId: string,
      unitName: string,
      code: string | null,
      period: string,
      total: number,
      male: number,
      female: number,
      boys: number,
      girls: number,
    ) => {
      let entry = byUnitMap.get(unitId);
      if (!entry) {
        entry = {
          serviceUnitId: unitId,
          serviceUnitName: unitName,
          departmentCode: code,
          weeks: [],
        };
        byUnitMap.set(unitId, entry);
      }
      entry.weeks.push({ period, total, male, female, boys, girls });
    };

    for (const row of usheringRows) {
      pushWeek(
        row.serviceUnitId,
        row.serviceUnit.name,
        row.serviceUnit.departmentCode ?? 'USHERING',
        row.weekStart.toISOString(),
        row.totalAttendees,
        row.male,
        row.female,
        row.babies,
        row.children,
      );
    }
    for (const row of unitAtt) {
      if (byUnitMap.has(row.serviceUnitId)) {
        const existing = byUnitMap.get(row.serviceUnitId)!;
        const period = (row.meetingDate ?? row.weekStart).toISOString().slice(0, 10);
        if (existing.weeks.some((w) => w.period.slice(0, 10) === period)) continue;
      }
      const demo = row.maleCount + row.femaleCount + row.boysCount + row.girlsCount;
      pushWeek(
        row.serviceUnitId,
        row.serviceUnit.name,
        row.serviceUnit.departmentCode,
        (row.meetingDate ?? row.weekStart).toISOString(),
        demo > 0 ? demo : row.presentCount,
        row.maleCount,
        row.femaleCount,
        row.boysCount,
        row.girlsCount,
      );
    }

    const chopByUnitMap = new Map<
      string,
      {
        serviceUnitId: string;
        serviceUnitName: string;
        departmentCode: string | null;
        weeks: Array<{
          period: string;
          total: number;
          male: number;
          female: number;
          boys: number;
          girls: number;
        }>;
      }
    >();

    for (const row of chopRows) {
      const unitId = row.serviceUnitId;
      let entry = chopByUnitMap.get(unitId);
      if (!entry) {
        entry = {
          serviceUnitId: unitId,
          serviceUnitName: row.serviceUnit.name,
          departmentCode: row.serviceUnit.departmentCode,
          weeks: [],
        };
        chopByUnitMap.set(unitId, entry);
      }
      const demo = row.maleCount + row.femaleCount + row.boysCount + row.girlsCount;
      entry.weeks.push({
        period: (row.meetingDate ?? row.weekStart).toISOString(),
        total: demo > 0 ? demo : row.presentCount,
        male: row.maleCount,
        female: row.femaleCount,
        boys: row.boysCount,
        girls: row.girlsCount,
      });
    }

    return {
      source: flow.source,
      serviceUnitId: flow.serviceUnitId,
      serviceUnitName: flow.serviceUnitName,
      weeks: chart,
      summary: { average: avg, latest, changePct },
      sundayMeetingByUnit: Array.from(byUnitMap.values()),
      chopAttendanceByUnit: Array.from(chopByUnitMap.values()),
    };
  }
}

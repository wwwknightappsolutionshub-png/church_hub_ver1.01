import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipService } from '../membership/membership.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async getDashboardMetrics(churchId: string) {
    const [
      memberCount,
      membersByStatus,
      followUpByStage,
      outreachCount,
      youthGroupCount,
      businessCount,
      rideCount,
      sermonCount,
    ] = await Promise.all([
      this.prisma.member.count({ where: { churchId } }),
      this.prisma.member.groupBy({ by: ['status'], where: { churchId }, _count: true }),
      this.prisma.followUp.groupBy({ by: ['stage'], where: { churchId }, _count: true }),
      this.prisma.outreachContact.count({ where: { churchId } }),
      this.prisma.youthGroup.count({ where: { churchId, isActive: true } }),
      this.prisma.businessProfile.count({ where: { churchId, verificationStatus: 'VERIFIED' } }),
      this.prisma.rideRequest.count({
        where: { churchId, status: { in: ['REQUESTED', 'SCHEDULED', 'IN_TRANSIT'] } },
      }),
      this.prisma.sermon.count({ where: { churchId } }),
    ]);

    const completedFollowUps = await this.prisma.followUp.count({
      where: { churchId, stage: 'JOINED_GROUP' },
    });
    const totalFollowUps = await this.prisma.followUp.count({ where: { churchId } });

    return {
      membership: { total: memberCount, byStatus: membersByStatus },
      followUp: {
        byStage: followUpByStage,
        completionRate: totalFollowUps > 0 ? completedFollowUps / totalFollowUps : 0,
      },
      evangelism: { totalContacts: outreachCount },
      youth: { activeGroups: youthGroupCount },
      business: { verifiedProfiles: businessCount },
      bus: { activeRides: rideCount },
      communications: { sermonCount },
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
    return {
      source: flow.source,
      serviceUnitId: flow.serviceUnitId,
      serviceUnitName: flow.serviceUnitName,
      weeks: chart,
      summary: { average: avg, latest, changePct },
    };
  }
}

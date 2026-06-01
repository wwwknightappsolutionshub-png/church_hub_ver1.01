import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  AutomationRunStatus,
  AutomationWorkflowKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { CommunicationsAutomationService } from '../communications/communications-automation.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { FollowUpAutomationService } from '../follow-up/follow-up-automation.service';
import { ServiceUnitsDepartmentService } from '../service-units/service-units-department.service';
import { AutomationSyncService } from './automation-sync.service';
import { MembershipAnalyticsService } from '../membership/membership-analytics.service';
import { MembershipAccessService } from '../membership/membership-access.service';

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export interface AutomationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  actionHref?: string;
}

@Injectable()
export class MembershipAutomationService {
  private readonly logger = new Logger(MembershipAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commAutomation: CommunicationsAutomationService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly followUpAutomation: FollowUpAutomationService,
    private readonly departments: ServiceUnitsDepartmentService,
    private readonly syncEngine: AutomationSyncService,
    private readonly analytics: MembershipAnalyticsService,
    private readonly membershipAccess: MembershipAccessService,
  ) {}

  async assertCanViewAutomation(userId: string, churchId: string) {
    if (await this.membershipAccess.canViewAutomation(userId, churchId)) return;
    throw new ForbiddenException(
      'Automation hub requires church admin, pastor, member admin, or leader access',
    );
  }

  private defaultSettings(churchId: string) {
    return {
      churchId,
      weeklyWorkflowsEnabled: true,
      absenteeTriggersEnabled: true,
      firstTimerTriggersEnabled: true,
      newConvertTriggersEnabled: true,
      followUpRemindersEnabled: true,
      pastoralAlertsEnabled: true,
      syncEngineEnabled: true,
      recommendationsEnabled: true,
      lastWeeklyRunAt: null as Date | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getSettings(churchId: string) {
    try {
      return await this.prisma.churchAutomationSettings.upsert({
        where: { churchId },
        create: { churchId },
        update: {},
      });
    } catch (err) {
      this.logger.warn(
        `churchAutomationSettings unavailable for ${churchId}: ${err instanceof Error ? err.message : err}`,
      );
      return this.defaultSettings(churchId);
    }
  }

  async updateSettings(
    churchId: string,
    data: Partial<{
      weeklyWorkflowsEnabled: boolean;
      absenteeTriggersEnabled: boolean;
      firstTimerTriggersEnabled: boolean;
      newConvertTriggersEnabled: boolean;
      followUpRemindersEnabled: boolean;
      pastoralAlertsEnabled: boolean;
      syncEngineEnabled: boolean;
      recommendationsEnabled: boolean;
    }>,
  ) {
    return this.prisma.churchAutomationSettings.upsert({
      where: { churchId },
      create: { churchId, ...data },
      update: data,
    });
  }

  async getStatus(churchId: string, userId?: string) {
    if (userId) await this.assertCanViewAutomation(userId, churchId);

    const [settings, sync, recentRuns, dueReminders, pendingFollowUps] = await Promise.all([
      this.getSettings(churchId),
      this.syncEngine.queueStats(churchId).catch(() => ({ pending: 0, failed: 0, synced: 0 })),
      this.prisma.automationRunLog
        .findMany({
          where: { churchId },
          orderBy: { startedAt: 'desc' },
          take: 12,
        })
        .catch(() => []),
      this.prisma.followUpReminder
        .count({
          where: {
            sentAt: null,
            remindAt: { lte: new Date() },
            followUp: { churchId },
          },
        })
        .catch(() => 0),
      this.prisma.followUp
        .count({
          where: {
            churchId,
            stage: { not: 'JOINED_GROUP' },
            dueAt: { lt: new Date() },
          },
        })
        .catch(() => 0),
    ]);

    return {
      settings,
      syncQueue: sync,
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        workflow: r.workflow,
        status: r.status,
        summary: r.summary,
        startedAt: r.startedAt.toISOString(),
      })),
      followUp: { dueReminders, overdueCount: pendingFollowUps },
    };
  }

  async listRunLogs(
    churchId: string,
    workflow?: AutomationWorkflowKind,
    userId?: string,
  ) {
    if (userId) await this.assertCanViewAutomation(userId, churchId);
    return this.prisma.automationRunLog.findMany({
      where: { churchId, ...(workflow ? { workflow } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  private async logRun(
    churchId: string,
    workflow: AutomationWorkflowKind,
    status: AutomationRunStatus,
    summary: string,
    stats: Record<string, unknown> = {},
    error?: string,
  ) {
    return this.prisma.automationRunLog.create({
      data: {
        churchId,
        workflow,
        status,
        summary,
        stats: stats as Prisma.InputJsonValue,
        error,
        finishedAt: new Date(),
      },
    });
  }

  async runWorkflow(
    churchId: string,
    workflow: AutomationWorkflowKind,
  ): Promise<Record<string, unknown>> {
    const settings = await this.getSettings(churchId);

    try {
      switch (workflow) {
        case 'WEEKLY_WORKFLOW':
          if (!settings.weeklyWorkflowsEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'Weekly workflows disabled');
            return { skipped: true };
          }
          return this.runWeeklyWorkflow(churchId);
        case 'ABSENTEE_TRIGGER':
          if (!settings.absenteeTriggersEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'Absentee triggers disabled');
            return { skipped: true };
          }
          return this.runAbsenteeTrigger(churchId);
        case 'FIRST_TIMER_TRIGGER':
          if (!settings.firstTimerTriggersEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'First-timer triggers disabled');
            return { skipped: true };
          }
          return this.runFirstTimerTriggers(churchId);
        case 'NEW_CONVERT_TRIGGER':
          if (!settings.newConvertTriggersEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'New convert triggers disabled');
            return { skipped: true };
          }
          return this.runNewConvertTriggers(churchId);
        case 'FOLLOW_UP_REMINDER':
          if (!settings.followUpRemindersEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'Follow-up reminders disabled');
            return { skipped: true };
          }
          return this.runFollowUpReminderPass(churchId);
        case 'PASTORAL_ALERT':
          if (!settings.pastoralAlertsEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'Pastoral alerts disabled');
            return { skipped: true };
          }
          return this.runPastoralAlerts(churchId);
        case 'SYNC_ENGINE':
          if (!settings.syncEngineEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'Sync engine disabled');
            return { skipped: true };
          }
          return this.runSyncEngine(churchId);
        case 'RECOMMENDATION':
          if (!settings.recommendationsEnabled) {
            await this.logRun(churchId, workflow, 'SKIPPED', 'Recommendations disabled');
            return { skipped: true };
          }
          return this.runRecommendations(churchId);
        default:
          throw new Error(`Unknown workflow: ${workflow}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Workflow failed';
      await this.logRun(churchId, workflow, 'FAILED', msg, {}, msg);
      throw err;
    }
  }

  async runWeeklyWorkflow(churchId: string) {
    const absentee = await this.runAbsenteeTrigger(churchId);
    const reminders = await this.commAutomation.runServiceReminders(churchId);
    const firstTimer = await this.runFirstTimerTriggers(churchId);
    const newConvert = await this.runNewConvertTriggers(churchId);
    const pastoral = await this.runPastoralAlerts(churchId);
    const recs = await this.runRecommendations(churchId);
    const followUp = await this.runFollowUpReminderPass(churchId);

    let departmentReports = 0;
    if (new Date().getUTCDay() === 1) {
      const units = await this.prisma.serviceUnit.findMany({
        where: { churchId, isActive: true, departmentCode: { not: null } },
        select: { id: true },
      });
      for (const u of units) {
        await this.departments.generateWeeklyReport(churchId, u.id);
        departmentReports++;
      }
    }

    await this.prisma.churchAutomationSettings.update({
      where: { churchId },
      data: { lastWeeklyRunAt: new Date() },
    });

    const stats = {
      absentee,
      reminders,
      firstTimer,
      newConvert,
      pastoral,
      recommendations: recs,
      followUp,
      departmentReports,
    };
    await this.logRun(
      churchId,
      'WEEKLY_WORKFLOW',
      'SUCCESS',
      'Weekly membership automations completed',
      stats,
    );
    return stats;
  }

  async runAbsenteeTrigger(churchId: string) {
    const result = await this.commAutomation.runAbsenteeFollowUp(churchId);
    await this.logRun(
      churchId,
      'ABSENTEE_TRIGGER',
      'SUCCESS',
      `Absentee follow-up: ${result.enqueued} queued`,
      result,
    );
    return result;
  }

  async runFirstTimerTriggers(churchId: string) {
    const since = addDays(startOfUtcDay(new Date()), -14);
    const visitors = await this.prisma.member.findMany({
      where: { churchId, status: 'VISITOR' },
      select: { id: true, firstName: true, lastName: true, userId: true, email: true },
    });

    let enqueued = 0;
    for (const member of visitors) {
      const attended = await this.prisma.attendanceRecord.findFirst({
        where: {
          churchId,
          memberId: member.id,
          scope: 'SERVICE',
          present: true,
          serviceDate: { gte: since },
        },
      });
      if (!attended) continue;

      const dup = await this.prisma.communicationQueueItem.findFirst({
        where: {
          churchId,
          kind: 'FIRST_TIMER_WELCOME',
          targetMemberId: member.id,
          createdAt: { gte: since },
        },
      });
      if (dup) continue;

      const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
      await this.commQueue.enqueue(churchId, {
        kind: 'FIRST_TIMER_WELCOME',
        title: 'Welcome — glad you joined us',
        body: `Hi ${name}, thank you for worshipping with us! A leader will connect with you about next steps and membership class.`,
        channels: ['IN_APP', 'EMAIL'],
        targetMemberId: member.id,
        targetUserId: member.userId ?? undefined,
      });
      enqueued++;
    }

    await this.logRun(
      churchId,
      'FIRST_TIMER_TRIGGER',
      'SUCCESS',
      `First-timer welcome: ${enqueued} queued`,
      { enqueued },
    );
    return { enqueued };
  }

  async runNewConvertTriggers(churchId: string) {
    const since = addDays(startOfUtcDay(new Date()), -30);
    let enqueued = 0;

    const newMembers = await this.prisma.member.findMany({
      where: {
        churchId,
        status: 'NEW_MEMBER',
        createdAt: { gte: since },
      },
      select: { id: true, firstName: true, lastName: true, userId: true },
    });

    for (const member of newMembers) {
      const enrolled = await this.prisma.classEnrollment.findFirst({
        where: { memberId: member.id, churchId },
      });
      if (enrolled) continue;

      const dup = await this.prisma.communicationQueueItem.findFirst({
        where: {
          churchId,
          kind: 'NEW_CONVERT_WELCOME',
          targetMemberId: member.id,
          createdAt: { gte: since },
        },
      });
      if (dup) continue;

      const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
      await this.commQueue.enqueue(churchId, {
        kind: 'NEW_CONVERT_WELCOME',
        title: 'Next step — membership class',
        body: `Hi ${name}, congratulations on your decision! Enroll in our foundation class (101) to grow in faith with us.`,
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        targetMemberId: member.id,
        targetUserId: member.userId ?? undefined,
      });
      enqueued++;
    }

    const recentConverts = await this.prisma.outreachContact.findMany({
      where: {
        churchId,
        memberId: { not: null },
        convertedAt: { gte: since },
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    for (const contact of recentConverts) {
      if (!contact.member) continue;
      const dup = await this.prisma.communicationQueueItem.findFirst({
        where: {
          churchId,
          kind: 'NEW_CONVERT_WELCOME',
          targetMemberId: contact.member.id,
          createdAt: { gte: since },
        },
      });
      if (dup) continue;

      const name = [contact.member.firstName, contact.member.lastName].filter(Boolean).join(' ');
      await this.commQueue.enqueue(churchId, {
        kind: 'NEW_CONVERT_WELCOME',
        title: 'Welcome to the family',
        body: `Hi ${name}, we are celebrating your new life in Christ! Join our next membership class and stay connected.`,
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        targetMemberId: contact.member.id,
        targetUserId: contact.member.userId ?? undefined,
        metadata: { outreachContactId: contact.id },
      });
      enqueued++;
    }

    await this.logRun(
      churchId,
      'NEW_CONVERT_TRIGGER',
      'SUCCESS',
      `New convert nurture: ${enqueued} queued`,
      { enqueued },
    );
    return { enqueued };
  }

  async runFollowUpReminderPass(churchId: string) {
    await this.followUpAutomation.processOverdueRules();
    const dueCount = await this.prisma.followUpReminder.count({
      where: {
        sentAt: null,
        remindAt: { lte: new Date() },
        followUp: { churchId },
      },
    });
    await this.logRun(
      churchId,
      'FOLLOW_UP_REMINDER',
      'SUCCESS',
      `Follow-up pass complete; ${dueCount} due reminder(s)`,
      { dueReminders: dueCount },
    );
    return { dueReminders: dueCount };
  }

  async runPastoralAlerts(churchId: string) {
    const staff = await this.staffUserIds(churchId);
    let alerts = 0;
    const staleCases = await this.prisma.counselingCase.findMany({
      where: {
        churchId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        updatedAt: { lt: addDays(new Date(), -14) },
      },
      take: 20,
    });

    for (const c of staleCases) {
      for (const userId of staff) {
        await this.commQueue.enqueue(churchId, {
          kind: 'PASTORAL_ALERT',
          title: `Pastoral alert: ${c.title}`,
          body: `Counseling case "${c.title}" has had no update in 14+ days. Please review.`,
          channels: ['IN_APP', 'EMAIL'],
          targetUserId: userId,
          metadata: { caseId: c.id, alertType: 'STALE_COUNSELING' },
        });
        alerts++;
      }
    }

    const openPrayer = await this.prisma.carePrayerRequest.findMany({
      where: {
        churchId,
        status: 'OPEN',
        createdAt: { lt: addDays(new Date(), -7) },
      },
      take: 20,
    });

    for (const p of openPrayer) {
      for (const userId of staff) {
        await this.commQueue.enqueue(churchId, {
          kind: 'PASTORAL_ALERT',
          title: 'Open prayer request',
          body: `Prayer request "${p.title}" has been open for 7+ days.`,
          channels: ['IN_APP'],
          targetUserId: userId,
          metadata: { prayerId: p.id, alertType: 'OPEN_PRAYER' },
        });
        alerts++;
      }
    }

    await this.logRun(
      churchId,
      'PASTORAL_ALERT',
      alerts ? 'SUCCESS' : 'SUCCESS',
      `Pastoral alerts: ${alerts} notification(s)`,
      { alerts, staleCases: staleCases.length, openPrayer: openPrayer.length },
    );
    return { alerts };
  }

  async runSyncEngine(churchId?: string) {
    const result = await this.syncEngine.processPending(churchId);
    if (churchId) {
      await this.logRun(
        churchId,
        'SYNC_ENGINE',
        result.failed ? 'PARTIAL' : 'SUCCESS',
        `Sync: ${result.synced} ok, ${result.failed} failed`,
        result,
      );
    }
    return result;
  }

  async buildRecommendations(
    churchId: string,
    userId?: string,
  ): Promise<AutomationRecommendation[]> {
    if (userId) await this.assertCanViewAutomation(userId, churchId);

    const recs: AutomationRecommendation[] = [];
    let dash: Awaited<ReturnType<MembershipAnalyticsService['getDashboard']>> | null = null;
    try {
      dash = await this.analytics.getDashboard(churchId, 3);
    } catch (err) {
      this.logger.warn(
        `Recommendations analytics skipped for ${churchId}: ${err instanceof Error ? err.message : err}`,
      );
    }
    if (!dash) {
      const sync = await this.syncEngine.queueStats(churchId).catch(() => ({
        pending: 0,
        failed: 0,
        synced: 0,
      }));
      if (sync.pending + sync.failed > 0) {
        recs.push({
          id: 'sync-backlog',
          priority: sync.failed > 0 ? 'high' : 'medium',
          title: 'Offline sync backlog',
          detail: `${sync.pending} pending and ${sync.failed} failed items in the sync queue.`,
          actionHref: '/dashboard/outreach',
        });
      }
      return recs;
    }

    const latestAbsentee = dash.absenteeTrends.at(-1);
    if (latestAbsentee && latestAbsentee.absent > latestAbsentee.present * 0.2) {
      recs.push({
        id: 'absentee-spike',
        priority: 'high',
        title: 'Absentee trend rising',
        detail: `Latest period shows ${latestAbsentee.absent} absent vs ${latestAbsentee.present} present. Run absentee follow-up automation.`,
        actionHref: '/dashboard/automation',
      });
    }

    const retention = dash.growthTrends.firstTimerRetention.at(-1);
    if (retention && retention.retentionRate < 0.5) {
      recs.push({
        id: 'retention-low',
        priority: 'high',
        title: 'First-timer retention below 50%',
        detail: `Only ${retention.retained} of ${retention.newVisitors} first-timers retained. Strengthen welcome workflow.`,
        actionHref: '/dashboard/analytics',
      });
    }

    const followUp = dash.followUpCompleteness.at(-1);
    if (followUp && followUp.completionRate < 0.7) {
      recs.push({
        id: 'follow-up-gap',
        priority: 'medium',
        title: 'Follow-up completeness low',
        detail: `${followUp.completed} of ${followUp.created} follow-ups completed (${Math.round(followUp.completionRate * 100)}%).`,
        actionHref: '/dashboard/follow-up',
      });
    }

    const sync = await this.syncEngine.queueStats(churchId);
    if (sync.pending + sync.failed > 0) {
      recs.push({
        id: 'sync-backlog',
        priority: sync.failed > 0 ? 'high' : 'medium',
        title: 'Offline sync backlog',
        detail: `${sync.pending} pending and ${sync.failed} failed items in the sync queue.`,
        actionHref: '/dashboard/outreach',
      });
    }

    return recs;
  }

  async runRecommendations(churchId: string) {
    const recs = await this.buildRecommendations(churchId);
    const staff = await this.staffUserIds(churchId);
    let delivered = 0;

    if (recs.length && staff.length) {
      const body = recs.map((r) => `• [${r.priority}] ${r.title}: ${r.detail}`).join('\n');
      for (const userId of staff) {
        await this.commQueue.enqueue(churchId, {
          kind: 'AUTOMATION_RECOMMENDATION',
          title: 'Membership automation insights',
          body,
          channels: ['IN_APP', 'EMAIL'],
          targetUserId: userId,
          metadata: { recommendationIds: recs.map((r) => r.id) },
        });
        delivered++;
      }
    }

    await this.logRun(
      churchId,
      'RECOMMENDATION',
      'SUCCESS',
      `${recs.length} recommendation(s); ${delivered} staff notified`,
      { count: recs.length, delivered },
    );
    return { recommendations: recs, delivered };
  }

  async previewPastoralAlerts(churchId: string) {
    const staleCounselingCases = await this.prisma.counselingCase.count({
      where: {
        churchId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        updatedAt: { lt: addDays(new Date(), -14) },
      },
    });
    const openPrayerRequests = await this.prisma.carePrayerRequest.count({
      where: {
        churchId,
        status: 'OPEN',
        createdAt: { lt: addDays(new Date(), -7) },
      },
    });
    return { staleCounselingCases, openPrayerRequests };
  }

  private async staffUserIds(churchId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async runAllChurchesDaily() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const summary = {
      churches: churches.length,
      absentee: 0,
      firstTimer: 0,
      newConvert: 0,
      pastoral: 0,
      sync: { processed: 0, synced: 0, failed: 0 },
    };

    for (const c of churches) {
      try {
        summary.absentee += (await this.runAbsenteeTrigger(c.id)).enqueued ?? 0;
        summary.firstTimer += (await this.runFirstTimerTriggers(c.id)).enqueued ?? 0;
        summary.newConvert += (await this.runNewConvertTriggers(c.id)).enqueued ?? 0;
        summary.pastoral += (await this.runPastoralAlerts(c.id)).alerts ?? 0;
        await this.runFollowUpReminderPass(c.id);
      } catch (err) {
        this.logger.warn(
          `Daily automation church ${c.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const sync = await this.runSyncEngine();
    summary.sync = sync;
    return summary;
  }

  async runAllChurchesWeekly() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    for (const c of churches) {
      try {
        await this.runWeeklyWorkflow(c.id);
      } catch (err) {
        this.logger.warn(
          `Weekly automation church ${c.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { churches: churches.length };
  }
}

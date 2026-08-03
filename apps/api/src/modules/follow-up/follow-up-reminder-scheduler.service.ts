import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';
import { FollowUpAutomationService } from './follow-up-automation.service';
import { FollowUpTeamNotifyService } from './follow-up-team-notify.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const JOINED_GROUP_DAY6_MS = 6 * MS_PER_DAY;
const JOINED_GROUP_MAX_MS = 7 * MS_PER_DAY;

/** Fail-safe: deliver due reminders even if BullMQ/redis timers were missed. */
@Injectable()
export class FollowUpReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowUpReminderSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
    private readonly automation: FollowUpAutomationService,
    private readonly teamNotify: FollowUpTeamNotifyService,
  ) {}

  onModuleInit() {
    if (process.env.FOLLOW_UP_SCHEDULER_ENABLED === 'false') {
      this.logger.warn('Follow-up reminder scheduler disabled');
      return;
    }
    this.timer = setInterval(() => {
      void this.tick().catch((err) => this.logger.error('Follow-up scheduler tick failed', err));
    }, 60_000);
    this.logger.log('Follow-up reminder scheduler started (60s interval)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    const due = await this.prisma.followUpReminder.findMany({
      where: {
        sentAt: null,
        remindAt: { lte: new Date() },
        followUp: { archivedAt: null },
      },
      include: {
        followUp: {
          select: {
            id: true,
            churchId: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            assignedToId: true,
            archivedAt: true,
          },
        },
      },
      take: 25,
    });

    for (const row of due) {
      const fu = row.followUp;
      if (fu.archivedAt) {
        await this.prisma.followUpReminder.update({
          where: { id: row.id },
          data: { sentAt: new Date() },
        });
        continue;
      }
      try {
        await this.delivery.deliverFollowUpReminder({
          churchId: fu.churchId,
          followUpId: fu.id,
          reminderId: row.id,
          subject: `Follow-up: ${fu.contactName}`,
          body: row.message ?? `Follow-up reminder for ${fu.contactName}`,
          contactEmail: row.channel === 'IN_APP' ? null : fu.contactEmail,
          contactPhone: row.channel === 'IN_APP' ? null : fu.contactPhone,
          assignedToId: fu.assignedToId,
          notifyLeaders: true,
        });
      } catch (err) {
        this.logger.warn(`Reminder ${row.id} delivery failed: ${err}`);
      }
    }

    await this.automation.processOverdueRules();
    await this.processJoinedGroupRetention();
  }

  /**
   * Joined Group retention: day-6 leader notify (convert to Members), day-7 auto-archive.
   * Clock starts at `completedAt` (set when entering JOINED_GROUP).
   */
  async processJoinedGroupRetention() {
    const now = Date.now();
    const day6Cutoff = new Date(now - JOINED_GROUP_DAY6_MS);
    const day7Cutoff = new Date(now - JOINED_GROUP_MAX_MS);

    // Legacy rows: start the Joined Group clock from when the row was last updated.
    const missingClock = await this.prisma.followUp.findMany({
      where: {
        stage: 'JOINED_GROUP',
        archivedAt: null,
        completedAt: null,
      },
      select: { id: true, updatedAt: true, createdAt: true },
      take: 50,
    });
    for (const row of missingClock) {
      await this.prisma.followUp.update({
        where: { id: row.id },
        data: { completedAt: row.updatedAt ?? row.createdAt },
      });
    }

    const day6Candidates = await this.prisma.followUp.findMany({
      where: {
        stage: 'JOINED_GROUP',
        archivedAt: null,
        joinedGroupDay6NotifiedAt: null,
        completedAt: { lte: day6Cutoff, not: null },
      },
      select: {
        id: true,
        churchId: true,
        contactName: true,
        memberId: true,
      },
      take: 40,
    });

    for (const row of day6Candidates) {
      try {
        await this.teamNotify.notifyTeamOnJoinedGroupDay6({
          churchId: row.churchId,
          followUpId: row.id,
          contactName: row.contactName,
          hasMemberLink: !!row.memberId,
        });
        await this.prisma.followUp.update({
          where: { id: row.id },
          data: { joinedGroupDay6NotifiedAt: new Date() },
        });
      } catch (err) {
        this.logger.warn(`Joined Group day-6 notify failed for ${row.id}: ${err}`);
      }
    }

    const expired = await this.prisma.followUp.findMany({
      where: {
        stage: 'JOINED_GROUP',
        archivedAt: null,
        completedAt: { lte: day7Cutoff, not: null },
      },
      select: { id: true, churchId: true, memberId: true, contactName: true },
      take: 40,
    });

    for (const row of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.followUp.update({
            where: { id: row.id },
            data: {
              archivedAt: new Date(),
              archivedById: null,
              archiveReason:
                'Joined Group retention ended (7 days). Convert qualified contacts to Members before day 7.',
              archiveRequestedAt: null,
              archiveRequestedById: null,
              archiveRequestReason: null,
              dueAt: null,
            },
          });
          await tx.followUpReminder.updateMany({
            where: { followUpId: row.id, sentAt: null },
            data: { sentAt: new Date() },
          });
        });
        this.logger.log(
          `Auto-archived Joined Group lead ${row.id} (${row.contactName}) after 7 days`,
        );
      } catch (err) {
        this.logger.warn(`Joined Group day-7 archive failed for ${row.id}: ${err}`);
      }
    }
  }
}

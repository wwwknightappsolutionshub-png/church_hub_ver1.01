import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';
import { FollowUpAutomationService } from './follow-up-automation.service';

/** Fail-safe: deliver due reminders even if BullMQ/redis timers were missed. */
@Injectable()
export class FollowUpReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowUpReminderSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
    private readonly automation: FollowUpAutomationService,
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
      where: { sentAt: null, remindAt: { lte: new Date() } },
      include: {
        followUp: {
          select: {
            id: true,
            churchId: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            assignedToId: true,
          },
        },
      },
      take: 25,
    });

    for (const row of due) {
      const fu = row.followUp;
      try {
        await this.delivery.deliverFollowUpReminder({
          churchId: fu.churchId,
          followUpId: fu.id,
          reminderId: row.id,
          subject: `Follow-up: ${fu.contactName}`,
          body: row.message ?? `Follow-up reminder for ${fu.contactName}`,
          contactEmail: fu.contactEmail,
          contactPhone: fu.contactPhone,
          assignedToId: fu.assignedToId,
        });
      } catch (err) {
        this.logger.warn(`Reminder ${row.id} delivery failed: ${err}`);
      }
    }

    await this.automation.processOverdueRules();
  }
}

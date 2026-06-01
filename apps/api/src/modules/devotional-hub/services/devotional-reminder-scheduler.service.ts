import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DevotionalActionPointsService } from './devotional-action-points.service';
import { DevotionalRemindersService } from './devotional-reminders.service';

/** Processes due devotional reminders every 60 seconds. */
@Injectable()
export class DevotionalReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DevotionalReminderSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly reminders: DevotionalRemindersService,
    private readonly actionPoints: DevotionalActionPointsService,
  ) {}

  onModuleInit() {
    const enabled = process.env.DEVOTIONAL_REMINDER_SCHEDULER !== 'false';
    if (!enabled) {
      this.logger.warn('Devotional reminder scheduler disabled');
      return;
    }
    this.timer = setInterval(() => {
      void Promise.all([
        this.reminders.processDueReminders(),
        this.actionPoints.processDueReminders(),
      ]).catch((err) => {
        this.logger.error('Reminder tick failed', err);
      });
    }, 60_000);
    void Promise.all([
      this.reminders.processDueReminders(),
      this.actionPoints.processDueReminders(),
    ]).catch(() => undefined);
    this.logger.log('Devotional reminder scheduler started (60s interval)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

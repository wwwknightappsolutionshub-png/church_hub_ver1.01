import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DevotionalMeetupsService } from './devotional-meetups.service';

@Injectable()
export class DevotionalMeetupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DevotionalMeetupSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly meetups: DevotionalMeetupsService) {}

  onModuleInit() {
    const enabled = process.env.DEVOTIONAL_MEETUP_SCHEDULER !== 'false';
    if (!enabled) {
      this.logger.warn('Devotional meetup scheduler disabled');
      return;
    }
    this.timer = setInterval(() => {
      void this.meetups.processScheduledTasks().catch((err) => {
        this.logger.error('Meetup scheduler tick failed', err);
      });
    }, 60_000);
    void this.meetups.processScheduledTasks().catch(() => undefined);
    this.logger.log('Devotional meetup scheduler started (60s interval)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

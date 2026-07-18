import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServiceUnitsService } from './service-units.service';

/** Sunday 3 PM+ reminders when service-unit attendance is still missing. */
@Injectable()
export class ServiceUnitsAttendanceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceUnitsAttendanceScheduler.name);
  private timer?: NodeJS.Timeout;
  private lastRunKey?: string;

  constructor(private readonly serviceUnits: ServiceUnitsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((err) =>
        this.logger.warn(
          `Sunday attendance reminder tick failed: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }, 15 * 60 * 1000);
    void this.tick();
    this.logger.log('Service unit attendance reminder scheduler started (every 15m)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const now = new Date();
    // Deduplicate within the same UTC hour so restarts don't spam.
    const key = now.toISOString().slice(0, 13);
    if (this.lastRunKey === key) return;
    this.lastRunKey = key;

    const result = await this.serviceUnits.runSundayAttendanceReminders(now);
    if (result.reminded > 0) {
      this.logger.log(
        `Sunday attendance reminders: ${result.reminded} notification(s) across ${result.churches} church(es)`,
      );
    }
  }
}

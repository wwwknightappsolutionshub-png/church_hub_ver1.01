import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServiceUnitsDepartmentService } from './service-units-department.service';
import { isLondonMondayDigestWindow } from '../notifications/report-digest.util';

/** Phase 8 — Monday 10:00 Europe/London full department digests. */
@Injectable()
export class ServiceUnitsDepartmentScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceUnitsDepartmentScheduler.name);
  private weeklyTimer?: NodeJS.Timeout;
  private lastDigestKey?: string;

  constructor(private readonly departments: ServiceUnitsDepartmentService) {}

  onModuleInit() {
    this.weeklyTimer = setInterval(() => {
      void this.tickWeekly().catch((err) =>
        this.logger.warn(`Weekly digest tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 15 * 60 * 1000);
    void this.tickWeekly();
    this.logger.log(
      'Department digest scheduler started (Mon 10:00 Europe/London, check every 15m)',
    );
  }

  onModuleDestroy() {
    if (this.weeklyTimer) clearInterval(this.weeklyTimer);
  }

  private async tickWeekly() {
    const { due, dateKey } = isLondonMondayDigestWindow();
    if (!due) return;
    if (this.lastDigestKey === dateKey) return;
    this.lastDigestKey = dateKey;
    const result = await this.departments.runDepartmentDigestsForAllChurches();
    this.logger.log(
      `Phase 8 department digests: ${result.digests} churches (week of ${dateKey} Europe/London)`,
    );
  }
}

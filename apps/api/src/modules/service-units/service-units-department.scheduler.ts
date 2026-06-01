import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServiceUnitsDepartmentService } from './service-units-department.service';

/** Phase 8 — weekly department reports (Mondays) + optional absentee sweep. */
@Injectable()
export class ServiceUnitsDepartmentScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceUnitsDepartmentScheduler.name);
  private weeklyTimer?: NodeJS.Timeout;
  private lastWeeklyKey?: string;

  constructor(private readonly departments: ServiceUnitsDepartmentService) {}

  onModuleInit() {
    this.weeklyTimer = setInterval(() => {
      void this.tickWeekly().catch((err) =>
        this.logger.warn(`Weekly report tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 60 * 60 * 1000);
    void this.tickWeekly();
    this.logger.log('Department scheduler started (weekly check hourly)');
  }

  onModuleDestroy() {
    if (this.weeklyTimer) clearInterval(this.weeklyTimer);
  }

  private async tickWeekly() {
    const now = new Date();
    if (now.getUTCDay() !== 1) return;
    const key = now.toISOString().slice(0, 10);
    if (this.lastWeeklyKey === key) return;
    this.lastWeeklyKey = key;
    const result = await this.departments.runWeeklyReportsForAllChurches();
    this.logger.log(`Phase 8 weekly reports: ${result.reports} units across ${result.churches} churches`);
  }
}

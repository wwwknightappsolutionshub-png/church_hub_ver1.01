import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServiceUnitsDepartmentService } from './service-units-department.service';
/** Phase 8 — department digests. Default Monday 10:00 Europe/London, per church. */
@Injectable()
export class ServiceUnitsDepartmentScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceUnitsDepartmentScheduler.name);
  private weeklyTimer?: NodeJS.Timeout;

  constructor(private readonly departments: ServiceUnitsDepartmentService) {}

  onModuleInit() {
    this.weeklyTimer = setInterval(() => {
      void this.tickWeekly().catch((err) =>
        this.logger.warn(`Weekly digest tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 15 * 60 * 1000);
    void this.tickWeekly();
    this.logger.log(
      'Department digest scheduler started (per church, default Mon 10:00 Europe/London, check every 15m)',
    );
  }

  onModuleDestroy() {
    if (this.weeklyTimer) clearInterval(this.weeklyTimer);
  }

  private async tickWeekly() {
    const result = await this.departments.runDueDepartmentDigests();
    if (result.digests > 0) {
      this.logger.log(`Phase 8 department digests: ${result.digests} churches`);
    }
  }
}

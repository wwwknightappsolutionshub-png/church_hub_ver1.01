import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MembershipAutomationService } from './membership-automation.service';

/** Phase 9 — fail-safe automation orchestrator (sync 60s, daily 6h, weekly Monday). */
@Injectable()
export class MembershipAutomationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MembershipAutomationScheduler.name);
  private syncTimer?: NodeJS.Timeout;
  private dailyTimer?: NodeJS.Timeout;
  private lastWeeklyKey?: string;

  constructor(private readonly automation: MembershipAutomationService) {}

  onModuleInit() {
    if (process.env.MEMBERSHIP_AUTOMATION_ENABLED === 'false') {
      this.logger.warn('Membership automation scheduler disabled');
      return;
    }

    this.syncTimer = setInterval(() => {
      void this.automation.runSyncEngine().catch((err) =>
        this.logger.warn(`Sync tick: ${err instanceof Error ? err.message : err}`),
      );
    }, 60_000);

    this.dailyTimer = setInterval(() => {
      void this.automation.runAllChurchesDaily().catch((err) =>
        this.logger.warn(`Daily automation: ${err instanceof Error ? err.message : err}`),
      );
      void this.tickWeekly();
    }, 6 * 60 * 60 * 1000);

    void this.automation.runSyncEngine();
    this.logger.log('Membership automation scheduler started (sync 60s, daily/weekly 6h)');
  }

  onModuleDestroy() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.dailyTimer) clearInterval(this.dailyTimer);
  }

  private async tickWeekly() {
    if (new Date().getUTCDay() !== 1) return;
    const key = new Date().toISOString().slice(0, 10);
    if (this.lastWeeklyKey === key) return;
    this.lastWeeklyKey = key;
    const result = await this.automation.runAllChurchesWeekly();
    this.logger.log(`Weekly workflows: ${result.churches} churches`);
  }
}

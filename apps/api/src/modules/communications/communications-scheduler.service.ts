import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommunicationsQueueService } from './communications-queue.service';
import { CommunicationsAutomationService } from './communications-automation.service';

@Injectable()
export class CommunicationsSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunicationsSchedulerService.name);
  private queueTimer?: NodeJS.Timeout;
  private dailyTimer?: NodeJS.Timeout;

  constructor(
    private readonly queue: CommunicationsQueueService,
    private readonly automation: CommunicationsAutomationService,
  ) {}

  onModuleInit() {
    this.queueTimer = setInterval(() => {
      void this.queue.processDueItems().catch((err) =>
        this.logger.warn(`Queue tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 60_000);

    this.dailyTimer = setInterval(() => {
      void this.automation.runAllChurchesAutomations().catch((err) =>
        this.logger.warn(`Automation tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 6 * 60 * 60 * 1000);

    void this.queue.processDueItems();
    this.logger.log('Communications scheduler started (queue 60s, automations 6h)');
  }

  onModuleDestroy() {
    if (this.queueTimer) clearInterval(this.queueTimer);
    if (this.dailyTimer) clearInterval(this.dailyTimer);
  }
}

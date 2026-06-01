import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PlatformMarketingDripService } from './platform-marketing-drip.service';

@Injectable()
export class PlatformMarketingDripSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformMarketingDripSchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly drips: PlatformMarketingDripService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.drips.processDueItems().catch((err) =>
        this.logger.warn(`Drip tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 60_000);
    void this.drips.processDueItems();
    this.logger.log('Platform marketing drip scheduler started (60s interval)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

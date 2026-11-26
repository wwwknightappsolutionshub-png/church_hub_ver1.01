import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MinistryCellsService } from './ministry-cells.service';
/** Cell/Ministry digests. Default Saturday 21:00 Europe/London, per church. */
@Injectable()
export class MinistryCellsDigestScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MinistryCellsDigestScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly cells: MinistryCellsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((err) =>
        this.logger.warn(`Cell digest tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 15 * 60 * 1000);
    void this.tick();
    this.logger.log(
      'Cell digest scheduler started (per church, default Sat 21:00 Europe/London, check every 15m)',
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const result = await this.cells.runDueCellDigests();
    if (result.digests > 0) {
      this.logger.log(`Cell/Ministry digests: ${result.digests} churches`);
    }
  }
}

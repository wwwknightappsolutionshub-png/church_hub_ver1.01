import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MinistryCellsService } from './ministry-cells.service';
import { isLondonSaturdayCellDigestWindow } from '../notifications/report-digest.util';

/** Cell/Ministry — Saturday 21:00 Europe/London full province digests. */
@Injectable()
export class MinistryCellsDigestScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MinistryCellsDigestScheduler.name);
  private timer?: NodeJS.Timeout;
  private lastDigestKey?: string;

  constructor(private readonly cells: MinistryCellsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((err) =>
        this.logger.warn(`Cell digest tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 15 * 60 * 1000);
    void this.tick();
    this.logger.log(
      'Cell digest scheduler started (Sat 21:00 Europe/London, check every 15m)',
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const { due, dateKey } = isLondonSaturdayCellDigestWindow();
    if (!due) return;
    if (this.lastDigestKey === dateKey) return;
    this.lastDigestKey = dateKey;
    const result = await this.cells.runCellDigestsForAllChurches();
    this.logger.log(
      `Cell/Ministry digests: ${result.digests} churches (week of ${dateKey} Europe/London)`,
    );
  }
}

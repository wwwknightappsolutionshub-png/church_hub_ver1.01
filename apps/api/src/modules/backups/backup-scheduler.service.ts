import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BackupsService } from './backups.service';

@Injectable()
export class BackupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly backups: BackupsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.backups.processDueSchedules().catch((err) =>
        this.logger.warn(`Backup schedule tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 60_000);
    void this.backups.processDueSchedules();
    this.logger.log('Backup scheduler started (60s interval)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

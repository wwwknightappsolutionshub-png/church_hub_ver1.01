import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RtpService } from './rtp.service';

/** Reminds ADMIN/PASTOR every 15 minutes until an RTP is marked Received. */
@Injectable()
export class RtpSlaScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RtpSlaScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly rtp: RtpService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((err) =>
        this.logger.warn(`RTP SLA tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 5 * 60 * 1000);
    void this.tick();
    this.logger.log('RTP SLA scheduler started (every 5m)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const result = await this.rtp.runSlaReminders();
    if (result.reminded > 0) {
      this.logger.log(`RTP SLA reminders: ${result.reminded} for ${result.due} request(s)`);
    }
  }
}

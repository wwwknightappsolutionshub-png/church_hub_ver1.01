import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { CommunicationsModule } from '../communications/communications.module';
import { RtpController } from './rtp.controller';
import { RtpService } from './rtp.service';
import { RtpSlaScheduler } from './rtp-sla.scheduler';

@Module({
  imports: [AccessModule, CommunicationsModule],
  controllers: [RtpController],
  providers: [RtpService, RtpSlaScheduler],
  exports: [RtpService],
})
export class RtpModule {}

import { Module } from '@nestjs/common';
import { MarketingInboundController } from './marketing-inbound.controller';
import { MarketingInboundService } from './marketing-inbound.service';

@Module({
  controllers: [MarketingInboundController],
  providers: [MarketingInboundService],
  exports: [MarketingInboundService],
})
export class MarketingInboundModule {}

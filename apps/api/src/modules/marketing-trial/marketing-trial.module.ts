import { Module } from '@nestjs/common';
import { MarketingTrialController } from './marketing-trial.controller';
import { MarketingTrialService } from './marketing-trial.service';

@Module({
  controllers: [MarketingTrialController],
  providers: [MarketingTrialService],
})
export class MarketingTrialModule {}

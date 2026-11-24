import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketingTrialController } from './marketing-trial.controller';
import { MarketingTrialService } from './marketing-trial.service';

@Module({
  imports: [AuthModule],
  controllers: [MarketingTrialController],
  providers: [MarketingTrialService],
})
export class MarketingTrialModule {}

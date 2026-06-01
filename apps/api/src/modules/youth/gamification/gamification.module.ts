import { Module } from '@nestjs/common';
import { YouthGamificationService } from './gamification.service';

@Module({
  providers: [YouthGamificationService],
  exports: [YouthGamificationService],
})
export class YouthGamificationModule {}

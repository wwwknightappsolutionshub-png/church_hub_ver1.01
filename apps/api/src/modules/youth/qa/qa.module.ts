import { Module } from '@nestjs/common';
import { YouthCommonModule } from '../common/youth-common.module';
import { YouthGamificationModule } from '../gamification/gamification.module';
import { YouthQaService } from './qa.service';

@Module({
  imports: [YouthCommonModule, YouthGamificationModule],
  providers: [YouthQaService],
  exports: [YouthQaService],
})
export class YouthQaModule {}

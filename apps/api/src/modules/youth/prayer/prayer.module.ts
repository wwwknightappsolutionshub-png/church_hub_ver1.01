import { Module } from '@nestjs/common';
import { RealtimeModule } from '../../realtime/realtime.module';
import { YouthCommonModule } from '../common/youth-common.module';
import { YouthGamificationModule } from '../gamification/gamification.module';
import { YouthPrayerService } from './prayer.service';

@Module({
  imports: [RealtimeModule, YouthCommonModule, YouthGamificationModule],
  providers: [YouthPrayerService],
  exports: [YouthPrayerService],
})
export class YouthPrayerModule {}

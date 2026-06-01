import { Module } from '@nestjs/common';
import { YouthCommonModule } from '../common/youth-common.module';
import { YouthGamificationModule } from '../gamification/gamification.module';
import { YouthFeedService } from './feed.service';

@Module({
  imports: [YouthCommonModule, YouthGamificationModule],
  providers: [YouthFeedService],
  exports: [YouthFeedService],
})
export class YouthFeedModule {}
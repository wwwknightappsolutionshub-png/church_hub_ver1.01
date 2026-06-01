import { Module } from '@nestjs/common';
import { YouthController } from './youth.controller';
import { YouthService } from './youth.service';
import { YouthCommonModule } from './common/youth-common.module';
import { YouthFeedModule } from './feed/feed.module';
import { YouthFeedController } from './feed/feed.controller';
import { YouthChatModule } from './chat/chat.module';
import { YouthChatController } from './chat/chat.controller';
import { YouthEventsModule } from './events/events.module';
import { YouthEventsController } from './events/events.controller';
import { YouthClipsModule } from './clips/clips.module';
import { YouthGamificationModule } from './gamification/gamification.module';
import { YouthGamificationController } from './gamification/gamification.controller';
import { YouthQaModule } from './qa/qa.module';
import { YouthQaController } from './qa/qa.controller';
import { YouthPrayerModule } from './prayer/prayer.module';
import { YouthPrayerController } from './prayer/prayer.controller';

/**
 * Youth Community Module (Phase 1 foundation).
 * Legacy monolith: YouthService + YouthController remain active until Phase 2 split.
 */
@Module({
  imports: [
    YouthCommonModule, // @Global — YouthAccessService for all youth feature modules
    YouthFeedModule,
    YouthChatModule,
    YouthEventsModule,
    YouthClipsModule,
    YouthGamificationModule,
    YouthQaModule,
    YouthPrayerModule,
  ],
  controllers: [
    YouthController,
    YouthFeedController,
    YouthChatController,
    YouthEventsController,
    YouthGamificationController,
    YouthQaController,
    YouthPrayerController,
  ],
  providers: [YouthService],
  exports: [
    YouthService,
    YouthFeedModule,
    YouthChatModule,
    YouthEventsModule,
    YouthClipsModule,
    YouthGamificationModule,
    YouthQaModule,
    YouthPrayerModule,
  ],
})
export class YouthModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DevotionalHubController } from './devotional-hub.controller';
import { DevotionalHubAccessService } from './devotional-hub-access.service';
import { DevotionalPlansService } from './services/devotional-plans.service';
import { DevotionalProgressService } from './services/devotional-progress.service';
import { DevotionalJournalsService } from './services/devotional-journals.service';
import { DevotionalGroupsService } from './services/devotional-groups.service';
import { DevotionalPrayerListsService } from './services/devotional-prayer-lists.service';
import { DevotionalRemindersService } from './services/devotional-reminders.service';
import { DevotionalReminderSchedulerService } from './services/devotional-reminder-scheduler.service';
import { DevotionalAiService } from './services/devotional-ai.service';
import { DevotionalPdfService } from './services/devotional-pdf.service';
import { DevotionalMeetupsService } from './services/devotional-meetups.service';
import { DevotionalMeetupSchedulerService } from './services/devotional-meetup-scheduler.service';
import { DevotionalDiscussionsService } from './services/devotional-discussions.service';
import { DevotionalActionPointsService } from './services/devotional-action-points.service';
import { DevotionalWeeklyReviewService } from './services/devotional-weekly-review.service';
import { DevotionalChallengesService } from './services/devotional-challenges.service';
import { DevotionalVoiceService } from './services/devotional-voice.service';
import { DevotionalAiThrottleGuard } from './guards/devotional-ai-throttle.guard';

@Module({
  imports: [PrismaModule],
  controllers: [DevotionalHubController],
  providers: [
    DevotionalAiThrottleGuard,
    DevotionalAiService,
    DevotionalHubAccessService,
    DevotionalPlansService,
    DevotionalProgressService,
    DevotionalJournalsService,
    DevotionalGroupsService,
    DevotionalPrayerListsService,
    DevotionalRemindersService,
    DevotionalReminderSchedulerService,
    DevotionalPdfService,
    DevotionalMeetupsService,
    DevotionalMeetupSchedulerService,
    DevotionalDiscussionsService,
    DevotionalActionPointsService,
    DevotionalWeeklyReviewService,
    DevotionalChallengesService,
    DevotionalVoiceService,
  ],
  exports: [DevotionalPlansService, DevotionalHubAccessService, DevotionalAiService],
})
export class DevotionalHubModule {}

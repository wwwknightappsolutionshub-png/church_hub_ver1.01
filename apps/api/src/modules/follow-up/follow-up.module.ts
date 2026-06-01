import { Module } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { FollowUpController } from './follow-up.controller';
import { FollowUpTeamNotifyService } from './follow-up-team-notify.service';
import { FollowUpAutomationService } from './follow-up-automation.service';
import { FollowUpReminderSchedulerService } from './follow-up-reminder-scheduler.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  controllers: [FollowUpController],
  providers: [
    FollowUpService,
    FollowUpTeamNotifyService,
    FollowUpAutomationService,
    FollowUpReminderSchedulerService,
    EmailAdapter,
  ],
  exports: [FollowUpService, FollowUpTeamNotifyService, FollowUpAutomationService],
})
export class FollowUpModule {}

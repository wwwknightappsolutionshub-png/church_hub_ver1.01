import { Module } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { FollowUpController } from './follow-up.controller';
import { FollowUpTeamNotifyService } from './follow-up-team-notify.service';
import { FollowUpAutomationService } from './follow-up-automation.service';
import { FollowUpReminderSchedulerService } from './follow-up-reminder-scheduler.service';
import { PipelineResolveService } from './pipeline-resolve.service';
import { PipelineDefinitionService } from './pipeline-definition.service';
import { PipelineMergeService } from './pipeline-merge.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  controllers: [FollowUpController],
  providers: [
    FollowUpService,
    FollowUpTeamNotifyService,
    FollowUpAutomationService,
    FollowUpReminderSchedulerService,
    PipelineResolveService,
    PipelineDefinitionService,
    PipelineMergeService,
    EmailAdapter,
  ],
  exports: [
    FollowUpService,
    FollowUpTeamNotifyService,
    FollowUpAutomationService,
    PipelineResolveService,
    PipelineDefinitionService,
    PipelineMergeService,
  ],
})
export class FollowUpModule {}

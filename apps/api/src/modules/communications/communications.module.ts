import { Module, forwardRef } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsQueueService } from './communications-queue.service';
import { CommunicationsConversationsService } from './communications-conversations.service';
import { CommunicationsAutomationService } from './communications-automation.service';
import { CommunicationsSchedulerService } from './communications-scheduler.service';
import { CelebrationEmailTemplatesService } from './celebration-email-templates.service';
import { MembershipModule } from '../membership/membership.module';
import { DevotionalHubModule } from '../devotional-hub/devotional-hub.module';
import { DepartmentsModule } from '../departments/departments.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  imports: [DevotionalHubModule, MembershipModule, forwardRef(() => DepartmentsModule)],
  controllers: [CommunicationsController],
  providers: [
    CommunicationsService,
    CommunicationsQueueService,
    CommunicationsConversationsService,
    CommunicationsAutomationService,
    CommunicationsSchedulerService,
    CelebrationEmailTemplatesService,
    EmailAdapter,
  ],
  exports: [
    CommunicationsService,
    CommunicationsQueueService,
    CommunicationsConversationsService,
    CommunicationsAutomationService,
    CelebrationEmailTemplatesService,
  ],
})
export class CommunicationsModule {}

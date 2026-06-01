import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsQueueService } from './communications-queue.service';
import { CommunicationsConversationsService } from './communications-conversations.service';
import { CommunicationsAutomationService } from './communications-automation.service';
import { CommunicationsSchedulerService } from './communications-scheduler.service';
import { DevotionalHubModule } from '../devotional-hub/devotional-hub.module';

@Module({
  imports: [DevotionalHubModule],
  controllers: [CommunicationsController],
  providers: [
    CommunicationsService,
    CommunicationsQueueService,
    CommunicationsConversationsService,
    CommunicationsAutomationService,
    CommunicationsSchedulerService,
  ],
  exports: [
    CommunicationsService,
    CommunicationsQueueService,
    CommunicationsConversationsService,
    CommunicationsAutomationService,
  ],
})
export class CommunicationsModule {}

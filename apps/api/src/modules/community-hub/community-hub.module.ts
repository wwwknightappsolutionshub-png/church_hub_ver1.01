import { Module } from '@nestjs/common';
import { CommunityHubController } from './community-hub.controller';
import { CommunityHubService } from './community-hub.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  controllers: [CommunityHubController],
  providers: [CommunityHubService, EmailAdapter],
})
export class CommunityHubModule {}

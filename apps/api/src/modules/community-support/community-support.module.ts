import { Module } from '@nestjs/common';
import { CommunitySupportController } from './community-support.controller';
import { CommunitySupportService } from './community-support.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  controllers: [CommunitySupportController],
  providers: [CommunitySupportService, EmailAdapter],
  exports: [CommunitySupportService],
})
export class CommunitySupportModule {}

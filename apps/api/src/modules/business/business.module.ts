import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { CommunitySupportModule } from '../community-support/community-support.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  imports: [CommunitySupportModule],
  controllers: [BusinessController],
  providers: [BusinessService, EmailAdapter],
  exports: [BusinessService],
})
export class BusinessModule {}

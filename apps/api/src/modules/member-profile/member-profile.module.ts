import { Module } from '@nestjs/common';
import { MemberProfileController } from './member-profile.controller';
import { MemberProfileService } from './member-profile.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  controllers: [MemberProfileController],
  providers: [MemberProfileService, EmailAdapter],
  exports: [MemberProfileService],
})
export class MemberProfileModule {}

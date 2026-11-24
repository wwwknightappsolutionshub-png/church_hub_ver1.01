import { Module } from '@nestjs/common';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { MemberPrivacyService } from './member-privacy.service';
import { MemberPrivacyController } from './member-privacy.controller';
import { PlatformMemberPrivacyController } from './platform-member-privacy.controller';

@Module({
  imports: [SecurityAuditModule],
  controllers: [MemberPrivacyController, PlatformMemberPrivacyController],
  providers: [MemberPrivacyService],
  exports: [MemberPrivacyService],
})
export class MemberPrivacyModule {}

import { Global, Module } from '@nestjs/common';
import { SecurityAuditService } from './security-audit.service';
import { AuthzDenialService } from './authz-denial.service';
import { AuditLogsController } from './audit-logs.controller';
import { PlatformAuditLogsController } from './platform-audit-logs.controller';

@Global()
@Module({
  controllers: [AuditLogsController, PlatformAuditLogsController],
  providers: [SecurityAuditService, AuthzDenialService],
  exports: [SecurityAuditService, AuthzDenialService],
})
export class SecurityAuditModule {}

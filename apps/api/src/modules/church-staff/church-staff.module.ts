import { Module } from '@nestjs/common';
import { ChurchStaffController } from './church-staff.controller';
import { ChurchStaffService } from './church-staff.service';
import { AutomationModule } from '../automation/automation.module';
import { AuthModule } from '../auth/auth.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Module({
  imports: [AutomationModule, AuthModule],
  controllers: [ChurchStaffController],
  providers: [ChurchStaffService, EmailAdapter],
  exports: [ChurchStaffService],
})
export class ChurchStaffModule {}

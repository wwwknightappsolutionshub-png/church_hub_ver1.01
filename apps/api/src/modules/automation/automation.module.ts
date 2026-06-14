import { Module } from '@nestjs/common';
import { MembershipAutomationController } from './membership-automation.controller';
import { MembershipAutomationService } from './membership-automation.service';
import { MembershipAutomationScheduler } from './membership-automation.scheduler';
import { AutomationSyncService } from './automation-sync.service';
import { AutomationEmailTemplatesController } from './automation-email-templates.controller';
import { AutomationEmailTemplatesService } from './automation-email-templates.service';
import { CommunicationsModule } from '../communications/communications.module';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { MembershipModule } from '../membership/membership.module';
import { OutreachModule } from '../outreach/outreach.module';
import { ServiceUnitsModule } from '../service-units/service-units.module';

@Module({
  imports: [
    CommunicationsModule,
    FollowUpModule,
    MembershipModule,
    OutreachModule,
    ServiceUnitsModule,
  ],
  controllers: [MembershipAutomationController, AutomationEmailTemplatesController],
  providers: [
    MembershipAutomationService,
    MembershipAutomationScheduler,
    AutomationSyncService,
    AutomationEmailTemplatesService,
  ],
  exports: [MembershipAutomationService, AutomationSyncService, AutomationEmailTemplatesService],
})
export class AutomationModule {}

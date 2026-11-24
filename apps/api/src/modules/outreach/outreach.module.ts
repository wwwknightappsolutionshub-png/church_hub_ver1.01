import { Module, forwardRef } from '@nestjs/common';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { BusModule } from '../bus/bus.module';
import { MembershipModule } from '../membership/membership.module';
import { AutomationModule } from '../automation/automation.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { OutreachService } from './outreach.service';
import { OutreachPipelineService } from './outreach-pipeline.service';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';
import { OutreachImportService } from './outreach-import.service';
import { OutreachCampaignService } from './outreach-campaign.service';
import { OutreachDedupeService } from './outreach-dedupe.service';
import { OutreachIntelligenceService } from './outreach-intelligence.service';
import { OutreachController } from './outreach.controller';
import { OutreachImportController } from './outreach-import.controller';

@Module({
  imports: [
    FollowUpModule,
    BusModule,
    MembershipModule,
    SecurityAuditModule,
    forwardRef(() => AutomationModule),
  ],
  controllers: [OutreachController, OutreachImportController],
  providers: [
    OutreachService,
    OutreachPipelineService,
    OutreachSyncConflictService,
    OutreachImportService,
    OutreachCampaignService,
    OutreachDedupeService,
    OutreachIntelligenceService,
  ],
  exports: [
    OutreachService,
    OutreachPipelineService,
    OutreachSyncConflictService,
    OutreachIntelligenceService,
  ],
})
export class OutreachModule {}

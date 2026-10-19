import { Module, forwardRef } from '@nestjs/common';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { BusModule } from '../bus/bus.module';
import { MembershipModule } from '../membership/membership.module';
import { AutomationModule } from '../automation/automation.module';
import { OutreachService } from './outreach.service';
import { OutreachPipelineService } from './outreach-pipeline.service';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';
import { OutreachImportService } from './outreach-import.service';
import { OutreachController } from './outreach.controller';
import { OutreachImportController } from './outreach-import.controller';

@Module({
  imports: [
    FollowUpModule,
    BusModule,
    MembershipModule,
    forwardRef(() => AutomationModule),
  ],
  controllers: [OutreachController, OutreachImportController],
  providers: [
    OutreachService,
    OutreachPipelineService,
    OutreachSyncConflictService,
    OutreachImportService,
  ],
  exports: [OutreachService, OutreachPipelineService, OutreachSyncConflictService],
})
export class OutreachModule {}

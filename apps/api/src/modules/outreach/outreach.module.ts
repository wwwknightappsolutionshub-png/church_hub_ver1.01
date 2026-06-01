import { Module } from '@nestjs/common';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { BusModule } from '../bus/bus.module';
import { MembershipModule } from '../membership/membership.module';
import { OutreachService } from './outreach.service';
import { OutreachPipelineService } from './outreach-pipeline.service';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';
import { OutreachController } from './outreach.controller';

@Module({
  imports: [FollowUpModule, BusModule, MembershipModule],
  controllers: [OutreachController],
  providers: [OutreachService, OutreachPipelineService, OutreachSyncConflictService],
  exports: [OutreachService, OutreachPipelineService, OutreachSyncConflictService],
})
export class OutreachModule {}

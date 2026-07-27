import { Module } from '@nestjs/common';
import { MinistryCellsController } from './ministry-cells.controller';
import { MinistryCellsService } from './ministry-cells.service';
import { MinistryCellsAccessService } from './ministry-cells-access.service';
import { MinistryCellsDigestScheduler } from './ministry-cells-digest.scheduler';
import { MembershipModule } from '../membership/membership.module';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [MembershipModule, CommunicationsModule],
  controllers: [MinistryCellsController],
  providers: [
    MinistryCellsService,
    MinistryCellsAccessService,
    MinistryCellsDigestScheduler,
  ],
  exports: [MinistryCellsService, MinistryCellsAccessService],
})
export class MinistryCellsModule {}

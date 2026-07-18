import { Module } from '@nestjs/common';
import { MinistryCellsController } from './ministry-cells.controller';
import { MinistryCellsService } from './ministry-cells.service';
import { MinistryCellsAccessService } from './ministry-cells-access.service';
import { MembershipModule } from '../membership/membership.module';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [MembershipModule, CommunicationsModule],
  controllers: [MinistryCellsController],
  providers: [MinistryCellsService, MinistryCellsAccessService],
  exports: [MinistryCellsService, MinistryCellsAccessService],
})
export class MinistryCellsModule {}

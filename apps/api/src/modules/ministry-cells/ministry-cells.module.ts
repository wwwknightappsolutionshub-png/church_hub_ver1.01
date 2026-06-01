import { Module } from '@nestjs/common';
import { MinistryCellsController } from './ministry-cells.controller';
import { MinistryCellsService } from './ministry-cells.service';
import { MinistryCellsAccessService } from './ministry-cells-access.service';

@Module({
  controllers: [MinistryCellsController],
  providers: [MinistryCellsService, MinistryCellsAccessService],
  exports: [MinistryCellsService, MinistryCellsAccessService],
})
export class MinistryCellsModule {}

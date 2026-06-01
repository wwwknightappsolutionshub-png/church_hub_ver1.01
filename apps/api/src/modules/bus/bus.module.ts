import { Module } from '@nestjs/common';
import { BusService } from './bus.service';
import { BusController } from './bus.controller';
import { BusAccessService } from './bus-access.service';
import { BusDriverGuard } from './bus-driver.guard';
import { RealtimeModule } from '../realtime/realtime.module';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [RealtimeModule, AccessModule],
  controllers: [BusController],
  providers: [BusService, BusAccessService, BusDriverGuard],
  exports: [BusService, BusAccessService],
})
export class BusModule {}

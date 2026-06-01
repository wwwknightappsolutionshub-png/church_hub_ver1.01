import { Module } from '@nestjs/common';
import { YouthGamificationModule } from '../gamification/gamification.module';
import { YouthEventsService } from './events.service';

@Module({
  imports: [YouthGamificationModule],
  providers: [YouthEventsService],
  exports: [YouthEventsService],
})
export class YouthEventsModule {}

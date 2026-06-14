import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { ChurchCalendarController } from './church-calendar.controller';
import { ChurchCalendarService } from './church-calendar.service';

@Module({
  imports: [MembershipModule],
  controllers: [ChurchCalendarController],
  providers: [ChurchCalendarService],
  exports: [ChurchCalendarService],
})
export class ChurchCalendarModule {}

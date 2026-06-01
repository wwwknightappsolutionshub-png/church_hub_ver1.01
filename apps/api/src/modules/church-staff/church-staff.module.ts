import { Module } from '@nestjs/common';
import { ChurchStaffController } from './church-staff.controller';
import { ChurchStaffService } from './church-staff.service';

@Module({
  controllers: [ChurchStaffController],
  providers: [ChurchStaffService],
  exports: [ChurchStaffService],
})
export class ChurchStaffModule {}

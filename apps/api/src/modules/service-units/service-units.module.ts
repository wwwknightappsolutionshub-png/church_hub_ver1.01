import { Module } from '@nestjs/common';
import { ServiceUnitsController } from './service-units.controller';
import { ServiceUnitsDepartmentController } from './service-units-department.controller';
import { ServiceUnitsService } from './service-units.service';
import { ServiceUnitsDepartmentService } from './service-units-department.service';
import { ServiceUnitsDepartmentScheduler } from './service-units-department.scheduler';
import { ServiceUnitsAttendanceScheduler } from './service-units-attendance.scheduler';
import { RealtimeModule } from '../realtime/realtime.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { MembershipModule } from '../membership/membership.module';
import { CommunicationsModule } from '../communications/communications.module';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [RealtimeModule, MembershipModule, CommunicationsModule, AccessModule],
  controllers: [ServiceUnitsDepartmentController, ServiceUnitsController],
  providers: [
    ServiceUnitsService,
    ServiceUnitsDepartmentService,
    ServiceUnitsDepartmentScheduler,
    ServiceUnitsAttendanceScheduler,
    EmailAdapter,
  ],
  exports: [ServiceUnitsService, ServiceUnitsDepartmentService],
})
export class ServiceUnitsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { CommunicationsModule } from '../communications/communications.module';
import { PastoralCareModule } from '../pastoral-care/pastoral-care.module';
import { ServiceUnitsModule } from '../service-units/service-units.module';
import { UploadsModule } from '../uploads/uploads.module';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentModulesController } from './department-modules.controller';
import { DepartmentModulesService } from './department-modules.service';
import { ChildrenDepartmentService } from './children-department.service';
import { ChoirDepartmentService } from './choir-department.service';
import { PrayerDepartmentService } from './prayer-department.service';
import { MedicalDepartmentService } from './medical-department.service';

@Module({
  imports: [
    AccessModule,
    CommunicationsModule,
    PastoralCareModule,
    UploadsModule,
    forwardRef(() => ServiceUnitsModule),
  ],
  controllers: [DepartmentModulesController],
  providers: [
    DepartmentAccessService,
    DepartmentModulesService,
    MedicalDepartmentService,
    ChildrenDepartmentService,
    ChoirDepartmentService,
    PrayerDepartmentService,
  ],
  exports: [
    DepartmentAccessService,
    DepartmentModulesService,
    MedicalDepartmentService,
    ChildrenDepartmentService,
    ChoirDepartmentService,
    PrayerDepartmentService,
  ],
})
export class DepartmentsModule {}

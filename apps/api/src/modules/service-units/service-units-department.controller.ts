import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceUnitsDepartmentService } from './service-units-department.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';

@ApiTags('service-units')
@ApiBearerAuth()
@ModuleGate('serviceUnitHub')
@Controller('service-units/departments')
export class ServiceUnitsDepartmentController {
  constructor(private readonly departments: ServiceUnitsDepartmentService) {}

  @Get()
  @ApiOperation({ summary: 'List Phase 8 department units (ushering, choir, youth, etc.)' })
  list(@ChurchId() churchId: string) {
    return this.departments.listDepartments(churchId);
  }

  @Post('digests/weekly')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary:
      'Send full department digest email (all departments, one table) to one Admin + one Pastor',
  })
  sendFullDigest(
    @ChurchId() churchId: string,
    @Body() body?: { weekStart?: string },
  ) {
    return this.departments.sendFullDepartmentDigest(churchId, body?.weekStart);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Department attendance dashboard + volunteer consistency' })
  dashboard(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Query('weeks') weeks?: string,
  ) {
    return this.departments.getDashboard(churchId, id, weeks ? Number(weeks) : 4);
  }

  @Post(':id/attendance/bulk')
  @ApiOperation({ summary: 'Record department roll call (DEPARTMENT scope)' })
  recordAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      serviceDate: string;
      entries: Array<{ memberId: string; present: boolean; notes?: string }>;
    },
  ) {
    return this.departments.recordBulkAttendance(user.userId, churchId, id, body);
  }

  @Post(':id/notify-absentees')
  @ApiOperation({ summary: 'Notify absent members (email + in-app)' })
  notifyAbsentees(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body?: { serviceDate?: string },
  ) {
    return this.departments.notifyAbsentees(user.userId, churchId, id, body?.serviceDate);
  }

  @Get(':id/weekly-reports')
  @ApiOperation({ summary: 'List generated weekly reports' })
  listReports(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.departments.listWeeklyReports(churchId, id);
  }

  @Post(':id/weekly-reports/generate')
  @ApiOperation({ summary: 'Generate weekly report (stored + in-app; email via full digest)' })
  generateReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body?: { weekStart?: string },
  ) {
    return this.departments.generateWeeklyReport(churchId, id, body?.weekStart, user.userId);
  }

  @Get(':id/ushering-headcounts')
  @ApiOperation({ summary: 'List weekly sanctuary headcounts (Ushering unit)' })
  listUsheringHeadcounts(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Query('weeks') weeks?: string,
  ) {
    return this.departments.listUsheringHeadcounts(
      churchId,
      id,
      weeks ? Number(weeks) : 8,
    );
  }

  @Post(':id/ushering-headcounts')
  @ApiOperation({ summary: 'Record weekly sanctuary headcount (Ushering unit admin)' })
  upsertUsheringHeadcount(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      weekStart?: string;
      male?: number;
      female?: number;
      babies?: number;
      children?: number;
      totalAttendees?: number;
    },
  ) {
    return this.departments.upsertUsheringHeadcount(user.userId, churchId, id, body);
  }
}

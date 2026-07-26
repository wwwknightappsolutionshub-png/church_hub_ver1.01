import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CellFormKind,
  CellIncidentSeverity,
  CellIncidentStatus,
  CellPrayerStatus,
} from '@prisma/client';
import {
  CreateCellBranchSchema,
  CreateCellProvinceSchema,
  MapBranchProvinceSchema,
  UpdateCellBranchSchema,
  UpdateCellProvinceSchema,
  type CreateCellBranchInput,
  type CreateCellProvinceInput,
  type MapBranchProvinceInput,
  type UpdateCellBranchInput,
  type UpdateCellProvinceInput,
} from '@church-hub/shared-types';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { MinistryCellsService } from './ministry-cells.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';

@ApiTags('ministry-cells')
@ApiBearerAuth()
@Controller('ministry-cells')
export class MinistryCellsController {
  constructor(private readonly service: MinistryCellsService) {}

  @Get('context')
  @ApiOperation({ summary: 'Current user Ministry/Cells role and permissions' })
  getContext(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.getContext(user, churchId);
  }

  @Get('branches')
  listBranches(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.listBranches(user, churchId);
  }

  @Post('branches')
  @Roles('ADMIN', 'PASTOR')
  createBranch(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(CreateCellBranchSchema) body: CreateCellBranchInput,
  ) {
    return this.service.createBranch(user, churchId, body);
  }

  @Get('branches/:id')
  getBranch(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.getBranchDetail(user, churchId, id);
  }

  @Patch('branches/:id')
  @Roles('ADMIN', 'PASTOR')
  updateBranch(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(UpdateCellBranchSchema) body: UpdateCellBranchInput,
  ) {
    return this.service.updateBranch(user, churchId, id, body);
  }

  @Post('branches/:id/map-province')
  @Roles('ADMIN', 'PASTOR')
  mapBranchProvince(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(MapBranchProvinceSchema) body: MapBranchProvinceInput,
  ) {
    return this.service.mapBranchToProvince(user, churchId, id, body.provinceId);
  }

  @Get('provinces')
  listProvinces(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.listProvinces(user, churchId);
  }

  @Post('provinces')
  @Roles('ADMIN', 'PASTOR')
  createProvince(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(CreateCellProvinceSchema) body: CreateCellProvinceInput,
  ) {
    return this.service.createProvince(user, churchId, body);
  }

  @Patch('provinces/:id')
  @Roles('ADMIN', 'PASTOR')
  updateProvince(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(UpdateCellProvinceSchema) body: UpdateCellProvinceInput,
  ) {
    return this.service.updateProvince(user, churchId, id, body);
  }

  @Delete('provinces/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteProvince(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteProvince(user, churchId, id);
  }

  @Get('provincial-leader-candidates')
  @Roles('ADMIN', 'PASTOR')
  provincialLeaderCandidates(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('excludeProvinceId') excludeProvinceId?: string,
  ) {
    return this.service.listProvincialLeaderCandidates(
      user,
      churchId,
      excludeProvinceId,
    );
  }

  @Get('provinces/:id/attendance-report')
  provinceAttendanceReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getProvinceAttendanceReport(user, churchId, id, {
      from,
      to,
    });
  }

  @Delete('branches/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteBranch(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteBranch(user, churchId, id);
  }

  @Post('branches/:id/members')
  addMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { memberId: string },
  ) {
    return this.service.addMember(user, churchId, id, body.memberId);
  }

  @Post('branches/:id/members/create')
  createMemberAndAdd(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createMemberAndAdd(user, churchId, id, body);
  }

  @Get('registry-catalog')
  registryCatalog(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.getRegistryCatalog(user, churchId);
  }

  @Delete('branches/:branchId/members/:memberId')
  removeMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('branchId') branchId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(user, churchId, branchId, memberId);
  }

  @Get('forms')
  listForms(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.listForms(user, churchId);
  }

  @Post('forms')
  @Roles('ADMIN', 'PASTOR')
  upsertForm(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      id?: string;
      kind: CellFormKind;
      name: string;
      description?: string;
      fields?: unknown;
      isActive?: boolean;
    },
  ) {
    return this.service.upsertForm(user, churchId, body);
  }

  @Post('forms/seed-defaults')
  @Roles('ADMIN', 'PASTOR')
  seedForms(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.seedDefaultForms(user, churchId);
  }

  @Get('teaching')
  listTeaching(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.listTeaching(user, churchId);
  }

  @Post('teaching')
  @Roles('ADMIN', 'PASTOR')
  upsertTeaching(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      id?: string;
      title: string;
      description?: string;
      fileUrl?: string;
      content?: string;
      sortOrder?: number;
    },
  ) {
    return this.service.upsertTeaching(user, churchId, body);
  }

  @Delete('teaching/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteTeaching(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteTeaching(user, churchId, id);
  }

  @Post('branches/:id/reports')
  submitReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { formId: string; payload: Record<string, unknown> },
  ) {
    return this.service.submitReport(user, churchId, id, body);
  }

  @Get('branches/:id/reports')
  listReports(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listReports(user, churchId, id);
  }

  @Post('branches/:id/attendance')
  recordAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      weekStart?: string;
      meetingDate?: string;
      presentCount?: number;
      absentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      testifiersCount?: number;
      firstTimersCount?: number;
      notes?: string;
      meetingId?: string;
    },
  ) {
    return this.service.recordAttendance(user, churchId, id, body);
  }

  @Get('branches/:id/attendance')
  listAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listAttendance(user, churchId, id);
  }

  @Patch('branches/:id/attendance/:attendanceId')
  updateAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('attendanceId') attendanceId: string,
    @Body()
    body: {
      weekStart?: string;
      meetingDate?: string;
      presentCount?: number;
      absentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      testifiersCount?: number;
      firstTimersCount?: number;
      notes?: string;
    },
  ) {
    return this.service.updateAttendance(user, churchId, id, attendanceId, body);
  }

  @Get('branches/:id/analytics')
  branchAnalytics(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.getBranchAnalytics(user, churchId, id);
  }

  @Get('branches/:id/incidents')
  listIncidents(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listIncidents(user, churchId, id);
  }

  @Patch('incidents/:id')
  updateIncident(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status?: CellIncidentStatus; severity?: CellIncidentSeverity },
  ) {
    return this.service.updateIncident(user, churchId, id, body);
  }

  @Get('branches/:id/prayers')
  listPrayers(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listPrayers(user, churchId, id);
  }

  @Post('branches/:id/prayers')
  createPrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: { title: string; body?: string; memberId?: string; isAnonymous?: boolean },
  ) {
    return this.service.createPrayer(user, churchId, id, body);
  }

  @Patch('prayers/:id')
  updatePrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status?: CellPrayerStatus },
  ) {
    return this.service.updatePrayer(user, churchId, id, body);
  }

  @Get('branches/:id/messages')
  listMessages(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listMessages(user, churchId, id);
  }

  @Post('branches/:id/messages')
  sendMessage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { toUserId: string; body: string },
  ) {
    return this.service.sendMessage(user, churchId, id, body);
  }

  @Patch('messages/:id/read')
  markRead(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.markMessageRead(user, churchId, id);
  }

  @Get('branches/:id/contacts')
  listContacts(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listLeadershipContacts(user, churchId, id);
  }

  @Get('reminders')
  listReminders(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.listReminders(user, churchId, branchId);
  }

  @Post('reminders')
  @Roles('ADMIN', 'PASTOR')
  createReminder(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      branchId?: string;
      userId?: string;
      title: string;
      body?: string;
      remindAt: string;
    },
  ) {
    return this.service.createReminder(user, churchId, body);
  }

  @Get('leader-candidates')
  @Roles('ADMIN', 'PASTOR')
  listLeaderCandidates(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.listLeaderCandidates(user, churchId);
  }

  @Get('available-members')
  listAvailableMembers(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.listAvailableMembers(user, churchId, branchId);
  }

  @Get('analytics')
  @Roles('ADMIN', 'PASTOR', 'PROVINCIAL_LEADER')
  analytics(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('leaderUserId') leaderUserId?: string,
    @Query('location') location?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getAnalytics(user, churchId, {
      branchId,
      leaderUserId,
      location,
      from,
      to,
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { ServiceUnitsService } from './service-units.service';
import { ServiceUnitsDepartmentService } from './service-units-department.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';
import { ModuleAccessService } from '../access/module-access.service';
import { AssignServiceUnitMemberDto, UpdateServiceUnitMemberDto } from './dto/assign-service-unit-member.dto';
import { AddServiceUnitLeaderDto } from './dto/service-unit-leader.dto';
import {
  CreateServiceUnitDto,
  CreateServiceUnitWithSetupDto,
  UpdateServiceUnitDto,
} from './dto/create-service-unit.dto';

@ApiTags('service-units')
@ApiBearerAuth()
@ModuleGate('serviceUnitHub')
@Controller('service-units')
export class ServiceUnitsController {
  constructor(
    private readonly serviceUnits: ServiceUnitsService,
    private readonly departmentUnits: ServiceUnitsDepartmentService,
    private readonly moduleAccess: ModuleAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all service units' })
  list(@ChurchId() churchId: string, @Query('q') q?: string) {
    return this.serviceUnits.listUnits(churchId, q);
  }

  /** Static segment before :id — avoids GET service-units/departments matching :id. */
  @Get('departments')
  @ApiOperation({ summary: 'List Phase 8 department units (ushering, choir, youth, etc.)' })
  async listDepartments(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const flags = await this.moduleAccess.getAccessFlags(user.userId, churchId);
    if (!flags.canAccessDepartmentTools) {
      throw new ForbiddenException(
        'Department tools are available to church admin, pastor, and department admin only.',
      );
    }
    return this.departmentUnits.listDepartments(churchId);
  }

  @Get('suggest')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Autosuggest active service unit names' })
  suggest(
    @ChurchId() churchId: string,
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Number.parseInt(limit, 10) : 12;
    return this.serviceUnits.suggestUnits(
      churchId,
      typeof q === 'string' ? q.slice(0, 100) : '',
      Number.isFinite(take) ? take : 12,
    );
  }

  @Get('registry-catalog')
  @ApiOperation({ summary: 'Membership registry catalog for unit congregant create forms' })
  registryCatalog(@ChurchId() churchId: string) {
    return this.serviceUnits.getRegistryCatalog(churchId);
  }

  @Get('member-import-template.csv')
  @ApiOperation({
    summary: 'Download CSV template for importing unit members (Excel-compatible)',
  })
  downloadMemberImportTemplate(@Res() res: Response) {
    const csv = this.serviceUnits.getMemberImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="service-unit-members-import-template.csv"',
    );
    res.send(csv);
  }

  @Post('members/import/preview')
  @Roles('ADMIN', 'PASTOR')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Parse unit-member CSV or .xlsx for create-unit wizard staging (no DB writes)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async previewMemberImport(@UploadedFile() file: Express.Multer.File) {
    return this.serviceUnits.previewMemberImportCsv({
      buffer: file?.buffer,
      originalname: file?.originalname,
    });
  }

  @Get(':id/access')
  @ApiOperation({ summary: 'Check current user access to a service unit' })
  checkAccess(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.checkUnitAccess(user.userId, churchId, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List service unit members with roles' })
  listMembers(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.listUnitMembers(user.userId, churchId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service unit details (members only)' })
  getOne(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.getUnitForUser(user.userId, churchId, id);
  }

  @Post()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Create a service unit (church staff only)' })
  create(@ChurchId() churchId: string, @Body() body: CreateServiceUnitDto) {
    return this.serviceUnits.createUnit(churchId, body);
  }

  @Post('with-setup')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary:
      'Create a service unit with optional members and one unit admin (church staff only)',
  })
  createWithSetup(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateServiceUnitWithSetupDto,
  ) {
    return this.serviceUnits.createUnitWithSetup(user.userId, churchId, body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Update a service unit (church staff or unit admin of this unit)' })
  update(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateServiceUnitDto,
  ) {
    return this.serviceUnits.updateUnit(user.userId, churchId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PASTOR')
  remove(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.serviceUnits.deleteUnit(churchId, id);
  }

  @Get(':id/email-template')
  getEmailTemplate(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.getEmailTemplate(user.userId, churchId, id);
  }

  @Patch(':id/email-template')
  upsertEmailTemplate(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { subject: string; body: string },
  ) {
    return this.serviceUnits.upsertEmailTemplate(user.userId, churchId, id, body);
  }

  @Post(':id/join-requests')
  @ApiOperation({ summary: 'Request membership in a service unit' })
  submitJoinRequest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      motivation?: string;
      memberId?: string;
    },
  ) {
    return this.serviceUnits.submitJoinRequest(user.userId, churchId, id, body);
  }

  @Get(':id/join-requests')
  @ApiOperation({ summary: 'List pending join requests (unit admin)' })
  listJoinRequests(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.serviceUnits.listJoinRequests(user.userId, churchId, id, status);
  }

  @Patch(':id/join-requests/:requestId')
  @ApiOperation({ summary: 'Approve or reject a join request' })
  reviewJoinRequest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() body: { approve: boolean },
  ) {
    return this.serviceUnits.reviewJoinRequest(user.userId, churchId, id, requestId, body.approve);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add or create a member on this service unit' })
  addMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AssignServiceUnitMemberDto,
  ) {
    return this.serviceUnits.addMember(user.userId, churchId, id, body);
  }

  @Post(':id/members/import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Import unit members from CSV (Excel Save As CSV). Church staff or unit admin.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  importMembers(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.serviceUnits.importMembersFromCsv(user.userId, churchId, id, {
      buffer: file?.buffer,
      originalname: file?.originalname,
    });
  }

  @Post(':id/members/create')
  @ApiOperation({ summary: 'Create congregant via global form and add to this service unit' })
  createMemberAndAdd(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.createMemberAndAdd(user.userId, churchId, id, body);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'List demographic weekly attendance for this service unit' })
  listAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.listAttendance(user.userId, churchId, id);
  }

  @Post(':id/attendance')
  @ApiOperation({ summary: 'Record demographic weekly attendance for this service unit' })
  recordAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.recordAttendance(
      user.userId,
      churchId,
      id,
      body as Parameters<ServiceUnitsService['recordAttendance']>[3],
    );
  }

  @Patch(':id/attendance/:attendanceId')
  @ApiOperation({ summary: 'Update a demographic attendance record' })
  updateAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('attendanceId') attendanceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.updateAttendance(
      user.userId,
      churchId,
      id,
      attendanceId,
      body as Parameters<ServiceUnitsService['updateAttendance']>[4],
    );
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update a unit member profile or role' })
  updateUnitMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateServiceUnitMemberDto,
  ) {
    return this.serviceUnits.updateUnitMember(user.userId, churchId, id, memberId, body);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from this service unit' })
  removeMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.serviceUnits.removeMember(user.userId, churchId, id, memberId);
  }

  @Post(':id/leaders')
  @ApiOperation({
    summary: 'Add or update a unit leader (church staff or unit admin of this unit)',
  })
  addLeader(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AddServiceUnitLeaderDto,
  ) {
    return this.serviceUnits.addLeader(user.userId, churchId, id, body);
  }

  /** AuthZ via requireUnitManager — unit admins may lack User role LEADER. */
  @Delete(':id/leaders/:leaderId')
  @ApiOperation({
    summary: 'Remove a unit leader (church staff or unit admin of this unit)',
  })
  removeLeader(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('leaderId') leaderId: string,
  ) {
    return this.serviceUnits.removeLeader(user.userId, churchId, id, leaderId);
  }

  @Get(':id/meetings')
  listMeetings(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.listMeetings(user.userId, churchId, id);
  }

  @Post(':id/meetings')
  createMeeting(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.createMeeting(
      user.userId,
      churchId,
      id,
      body as Parameters<ServiceUnitsService['createMeeting']>[3],
    );
  }

  @Patch(':id/meetings/:meetingId')
  updateMeeting(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.updateMeeting(user.userId, churchId, id, meetingId, body);
  }

  @Delete(':id/meetings/:meetingId')
  deleteMeeting(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string,
  ) {
    return this.serviceUnits.deleteMeeting(user.userId, churchId, id, meetingId);
  }

  @Get(':id/meeting-summaries')
  listMeetingSummaries(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.listMeetingSummaries(user.userId, churchId, id);
  }

  @Post(':id/meeting-summaries')
  createMeetingSummary(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      title: string;
      body: string;
      meetingDate?: string;
      meetingId?: string;
      authorId?: string;
    },
  ) {
    return this.serviceUnits.createMeetingSummary(user.userId, churchId, id, body);
  }

  @Patch(':id/meeting-summaries/:summaryId')
  updateMeetingSummary(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('summaryId') summaryId: string,
    @Body() body: Partial<{ title: string; body: string; meetingDate: string | null }>,
  ) {
    return this.serviceUnits.updateMeetingSummary(user.userId, churchId, id, summaryId, body);
  }

  @Delete(':id/meeting-summaries/:summaryId')
  deleteMeetingSummary(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('summaryId') summaryId: string,
  ) {
    return this.serviceUnits.deleteMeetingSummary(user.userId, churchId, id, summaryId);
  }

  @Get(':id/posts')
  listPosts(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.serviceUnits.listPosts(user.userId, churchId, id);
  }

  @Post(':id/posts')
  createPost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { title?: string; body: string },
  ) {
    return this.serviceUnits.createPost(user.userId, churchId, id, body);
  }

  @Patch(':id/posts/:postId')
  updatePost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Body() body: { title?: string; body?: string; isPinned?: boolean; isLocked?: boolean },
  ) {
    return this.serviceUnits.updatePost(user.userId, churchId, id, postId, body);
  }

  @Delete(':id/posts/:postId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  deletePost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.serviceUnits.deletePost(user.userId, churchId, id, postId);
  }

  @Post(':id/posts/:postId/replies')
  createReply(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Body() body: { body: string },
  ) {
    return this.serviceUnits.createReply(user.userId, churchId, id, postId, body);
  }

  @Delete(':id/replies/:replyId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  deleteReply(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('replyId') replyId: string,
  ) {
    return this.serviceUnits.deleteReply(user.userId, churchId, id, replyId);
  }

  @Get(':id/presence')
  getPresence(@Param('id') id: string) {
    return this.serviceUnits.getOnlineMembers(id);
  }

  @Post(':id/presence/heartbeat')
  heartbeat(@Param('id') id: string, @Body() body: { memberId: string }) {
    return this.serviceUnits.heartbeatPresence(id, body.memberId);
  }
}

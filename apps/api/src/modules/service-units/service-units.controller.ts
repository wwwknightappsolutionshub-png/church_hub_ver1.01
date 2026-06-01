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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ServiceUnitsService } from './service-units.service';
import { ServiceUnitsDepartmentService } from './service-units-department.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';
import { ModuleAccessService } from '../access/module-access.service';
import { AssignServiceUnitMemberDto, UpdateServiceUnitMemberDto } from './dto/assign-service-unit-member.dto';

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
  list(@ChurchId() churchId: string) {
    return this.serviceUnits.listUnits(churchId);
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
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Create a service unit' })
  create(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.serviceUnits.createUnit(churchId, body as Parameters<ServiceUnitsService['createUnit']>[1]);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  update(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.serviceUnits.updateUnit(churchId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PASTOR')
  remove(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.serviceUnits.deleteUnit(churchId, id);
  }

  @Get(':id/email-template')
  getEmailTemplate(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.serviceUnits.getEmailTemplate(churchId, id);
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
  @ApiOperation({ summary: 'Add or update a unit leader (unit admin)' })
  addLeader(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      memberId: string;
      role?: string;
      isModerator?: boolean;
      isUnitAdmin?: boolean;
    },
  ) {
    return this.serviceUnits.addLeader(user.userId, churchId, id, body);
  }

  @Delete(':id/leaders/:leaderId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  removeLeader(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('leaderId') leaderId: string,
  ) {
    return this.serviceUnits.removeLeader(churchId, id, leaderId);
  }

  @Get(':id/meetings')
  listMeetings(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.serviceUnits.listMeetings(churchId, id);
  }

  @Post(':id/meetings')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  createMeeting(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.createMeeting(churchId, id, body as Parameters<ServiceUnitsService['createMeeting']>[2]);
  }

  @Patch(':id/meetings/:meetingId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  updateMeeting(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serviceUnits.updateMeeting(churchId, id, meetingId, body);
  }

  @Delete(':id/meetings/:meetingId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  deleteMeeting(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string,
  ) {
    return this.serviceUnits.deleteMeeting(churchId, id, meetingId);
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
      authorId: string;
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
  listPosts(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.serviceUnits.listPosts(churchId, id);
  }

  @Post(':id/posts')
  createPost(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { authorId: string; title?: string; body: string },
  ) {
    return this.serviceUnits.createPost(churchId, id, body);
  }

  @Patch(':id/posts/:postId')
  updatePost(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Body() body: { title?: string; body?: string; isPinned?: boolean; isLocked?: boolean; moderatorMemberId?: string },
  ) {
    const { moderatorMemberId, ...data } = body;
    return this.serviceUnits.updatePost(churchId, id, postId, data, moderatorMemberId);
  }

  @Delete(':id/posts/:postId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  deletePost(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.serviceUnits.deletePost(churchId, id, postId);
  }

  @Post(':id/posts/:postId/replies')
  createReply(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Body() body: { authorId: string; body: string },
  ) {
    return this.serviceUnits.createReply(churchId, id, postId, body);
  }

  @Delete(':id/replies/:replyId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  deleteReply(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Param('replyId') replyId: string,
  ) {
    return this.serviceUnits.deleteReply(churchId, id, replyId);
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

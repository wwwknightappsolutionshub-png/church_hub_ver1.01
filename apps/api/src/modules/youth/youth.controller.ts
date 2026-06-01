import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HelpRequestStatus, YouthResourceCategory } from '@prisma/client';
import { YouthService } from './youth.service';
import { YouthChatService } from './chat/chat.service';
import { YouthEventsService } from './events/events.service';
import { YouthGamificationService } from './gamification/gamification.service';
import { YouthAccessService } from './common/youth-access.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles, ModuleGate } from '../auth/decorators';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import {
  youthEventBodySchema,
  youthGroupBodySchema,
  youthHelpSubmitSchema,
  youthMemberIdSchema,
  youthMessageSchema,
  youthModerateSchema,
  youthPointsSchema,
  youthResourceBodySchema,
  youthRsvpSchema,
} from './youth.schemas';
import type { z } from 'zod';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@Controller('youth')
export class YouthController {
  constructor(
    private readonly youthService: YouthService,
    private readonly chatService: YouthChatService,
    private readonly eventsService: YouthEventsService,
    private readonly gamificationService: YouthGamificationService,
    private readonly youthAccess: YouthAccessService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Youth access context (roles, safe mode, permissions)' })
  getContext(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.youthAccess.getContext(churchId, user.userId);
  }

  @Get('stats')
  getStats(@ChurchId() churchId: string) {
    return this.youthService.getStats(churchId);
  }

  @Get('members')
  listYouthMembers(@ChurchId() churchId: string) {
    return this.youthService.listMembersForYouth(churchId);
  }

  // Groups
  @Get('groups')
  listGroups(@ChurchId() churchId: string) {
    return this.youthService.listGroups(churchId);
  }

  @Get('groups/:id')
  getGroup(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.youthService.getGroup(churchId, id);
  }

  @Post('groups')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  createGroup(
    @ChurchId() churchId: string,
    @ZodBody(youthGroupBodySchema) body: z.infer<typeof youthGroupBodySchema>,
  ) {
    return this.youthService.createGroup(churchId, body as Parameters<YouthService['createGroup']>[1]);
  }

  @Post('groups/:groupId/members')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  addMember(
    @ChurchId() churchId: string,
    @Param('groupId') groupId: string,
    @ZodBody(youthMemberIdSchema) body: z.infer<typeof youthMemberIdSchema>,
  ) {
    return this.youthService.addGroupMember(churchId, groupId, body.memberId);
  }

  @Patch('groups/:groupId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  updateGroup(
    @ChurchId() churchId: string,
    @Param('groupId') groupId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.youthService.updateGroup(
      churchId,
      groupId,
      body as Parameters<YouthService['updateGroup']>[2],
    );
  }

  @Delete('groups/:groupId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  deleteGroup(@ChurchId() churchId: string, @Param('groupId') groupId: string) {
    return this.youthService.deleteGroup(churchId, groupId);
  }

  @Delete('groups/:groupId/members/:memberId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  removeGroupMember(
    @ChurchId() churchId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.youthService.removeGroupMember(churchId, groupId, memberId);
  }

  @Post('groups/:groupId/channel')
  ensureChannel(@ChurchId() churchId: string, @Param('groupId') groupId: string) {
    return this.chatService.ensureGroupChannel(churchId, groupId);
  }

  // Events (legacy paths — delegate to YouthEventsService)
  @Get('events')
  listEvents(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.eventsService.listEvents(churchId, {
      upcomingOnly: upcoming === 'true',
      userId: user.userId,
    });
  }

  @Post('events')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  createEvent(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.eventsService.createEvent(
      churchId,
      body as Parameters<YouthEventsService['createEvent']>[1],
    );
  }

  @Post('events/:eventId/rsvp')
  rsvp(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() body: { memberId?: string; status?: string; visibility?: string },
  ) {
    if (body.memberId) {
      return this.eventsService.rsvp(
        churchId,
        eventId,
        body.memberId,
        body.status,
        body.visibility,
      );
    }
    return this.eventsService.rsvpAsUser(
      churchId,
      user.userId,
      eventId,
      body.status,
      body.visibility,
    );
  }

  @Post('events/:eventId/check-in')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  checkIn(
    @ChurchId() churchId: string,
    @Param('eventId') eventId: string,
    @Body() body: { memberId: string },
  ) {
    return this.eventsService.checkInAttendance(churchId, eventId, body.memberId);
  }

  // Chat (legacy paths — delegate to YouthChatService)
  @Get('channels')
  listChannels(@ChurchId() churchId: string, @Query('youthGroupId') youthGroupId?: string) {
    return this.chatService.listChannels(churchId, youthGroupId);
  }

  @Get('channels/:channelId/messages')
  listMessages(
    @ChurchId() churchId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthUser,
    @Query('moderator') moderator?: string,
  ) {
    return this.chatService.listMessages(
      churchId,
      user.userId,
      channelId,
      moderator === 'true',
    );
  }

  @Post('channels/:channelId/messages')
  postMessage(
    @ChurchId() churchId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { content: string; attachmentUrl?: string; replyToId?: string },
  ) {
    return this.chatService.postMessage(churchId, channelId, user.userId, body);
  }

  @Patch('messages/:messageId/moderate')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  moderateMessage(
    @ChurchId() churchId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { isHidden: boolean; flagReason?: string },
  ) {
    return this.chatService.moderateMessage(churchId, messageId, user.userId, body);
  }

  @Get('messages/flagged')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  listFlagged(@ChurchId() churchId: string) {
    return this.chatService.listFlaggedMessages(churchId);
  }

  // Resources
  @Get('resources')
  listResources(
    @ChurchId() churchId: string,
    @Query('category') category?: YouthResourceCategory,
    @Query('youthGroupId') youthGroupId?: string,
  ) {
    return this.youthService.listResources(churchId, category, youthGroupId);
  }

  @Post('resources')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  createResource(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.youthService.createResource(churchId, body as Parameters<YouthService['createResource']>[1]);
  }

  @Patch('resources/:resourceId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  updateResource(
    @ChurchId() churchId: string,
    @Param('resourceId') resourceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.youthService.updateResource(
      churchId,
      resourceId,
      body as Parameters<YouthService['updateResource']>[2],
    );
  }

  @Delete('resources/:resourceId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  deleteResource(@ChurchId() churchId: string, @Param('resourceId') resourceId: string) {
    return this.youthService.deleteResource(churchId, resourceId);
  }

  @Get('hub-admins')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'List users and Youth Hub admin assignments' })
  listHubAdmins(@ChurchId() churchId: string) {
    return this.youthService.listHubAdmins(churchId);
  }

  @Patch('hub-admins/:userId')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Grant or revoke Youth Hub admin (YOUTH_ADMIN role)' })
  setHubAdmin(
    @ChurchId() churchId: string,
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.youthService.setYouthAdmin(churchId, userId, body.enabled === true);
  }

  // Help Zone
  @Get('help')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  listHelp(
    @ChurchId() churchId: string,
    @Query('status') status?: HelpRequestStatus,
  ) {
    return this.youthService.listHelpRequests(churchId, status);
  }

  @Post('help')
  submitHelp(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.youthService.submitHelpRequest(churchId, body as Parameters<YouthService['submitHelpRequest']>[1]);
  }

  @Patch('help/:id/assign')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  assignHelp(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
  ) {
    return this.youthService.assignHelpRequest(churchId, id, body.assignedToId);
  }

  @Post('help/:id/respond')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  respondHelp(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { body: string; isInternal?: boolean },
  ) {
    return this.youthService.respondToHelp(churchId, id, user.userId, body.body, body.isInternal);
  }

  @Post('help/:id/resolve')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  resolveHelp(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.youthService.resolveHelpRequest(churchId, id);
  }

  // Gamification (legacy paths)
  @Get('leaderboard')
  leaderboard(@ChurchId() churchId: string) {
    return this.gamificationService.getLeaderboard(churchId);
  }

  @Get('badges')
  listBadges() {
    return this.gamificationService.listBadges();
  }

  @Post('gamification/:memberId/points')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  awardPoints(
    @ChurchId() churchId: string,
    @Param('memberId') memberId: string,
    @Body() body: { points: number },
  ) {
    return this.gamificationService.awardPoints(memberId, body.points, churchId);
  }

  @Post('gamification/:memberId/badges/:badgeId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  awardBadge(@Param('memberId') memberId: string, @Param('badgeId') badgeId: string) {
    return this.gamificationService.issueBadge(memberId, badgeId);
  }

  // Parents
  @Get('parents')
  listParents(@ChurchId() churchId: string) {
    return this.youthService.listParentLinks(churchId);
  }

  @Post('parents/link')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  linkParent(
    @ChurchId() churchId: string,
    @Body() body: { parentId: string; childId: string; relation?: string },
  ) {
    return this.youthService.linkParent(churchId, body.parentId, body.childId, body.relation);
  }
}

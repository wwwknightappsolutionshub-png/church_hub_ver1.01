import {

  Body,

  Controller,

  Delete,

  Get,

  Param,

  Patch,

  Post,

  Put,

  Query,
  UseGuards,

} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  DevotionalAiArtifactType,
  DevotionalPlanTone,
  DevotionalReminderChannel,
} from '@prisma/client';

import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';

import { Roles } from '../auth/decorators';

import { CreateDevotionalPlanDto } from './dto/create-plan.dto';

import { UpdateDevotionalPlanDayDto } from './dto/update-plan-day.dto';

import { UpsertDevotionalPlanDraftDto } from './dto/upsert-plan-draft.dto';
import {
  SnoozeReminderDto,
  UpsertPlanRemindersDto,
  UpsertReminderPreferencesDto,
} from './dto/reminder-settings.dto';
import {
  CreateDevotionalGroupDto,
  InviteToGroupDto,
  RegenerateInviteLinkDto,
  UpdateDevotionalGroupDto,
} from './dto/create-group.dto';
import {
  AskScriptureAiDto,
  PdfSimplifyDto,
  PrayerPointsAiDto,
  StudyOutlineAiDto,
} from './dto/ai-tools.dto';
import {
  CreateJournalCommentDto,
  CreateJournalDto,
  JournalReactionDto,
  UpdateJournalDto,
} from './dto/journal.dto';
import {
  CreateMeetupDto,
  MeetupPostEventDto,
  MeetupReminderOffsetsDto,
  MeetupRsvpDto,
  UpdateMeetupDto,
} from './dto/meetup.dto';
import { CreateActionPointDto, UpdateActionPointDto } from './dto/action-points.dto';
import { CreateChallengeDto, RecordChallengeProgressDto } from './dto/challenge.dto';
import {
  CreatePrayerListDto,
  PrayerBoosterDto,
  PrayerListItemDto,
  UpdatePrayerItemDto,
  UpdatePrayerListDto,
} from './dto/prayer-list.dto';
import { DevotionalActionPointsService } from './services/devotional-action-points.service';
import { DevotionalWeeklyReviewService } from './services/devotional-weekly-review.service';
import { DevotionalChallengesService } from './services/devotional-challenges.service';

import { DevotionalHubAccessService } from './devotional-hub-access.service';

import { DevotionalPlansService } from './services/devotional-plans.service';

import { DevotionalProgressService } from './services/devotional-progress.service';

import { DevotionalJournalsService } from './services/devotional-journals.service';

import { DevotionalGroupsService } from './services/devotional-groups.service';

import { DevotionalPrayerListsService } from './services/devotional-prayer-lists.service';

import { DevotionalRemindersService } from './services/devotional-reminders.service';

import { DevotionalAiService } from './services/devotional-ai.service';

import { DevotionalPdfService } from './services/devotional-pdf.service';

import { DevotionalMeetupsService } from './services/devotional-meetups.service';

import { DevotionalDiscussionsService } from './services/devotional-discussions.service';
import { DevotionalAiThrottleGuard } from './guards/devotional-ai-throttle.guard';
import { AllowMemberOwnedDelete } from '../auth/destructive.decorators';



@ApiTags('devotional-hub')

@ApiBearerAuth()

@AllowMemberOwnedDelete()

@Controller('devotional-hub')

export class DevotionalHubController {

  constructor(

    private readonly access: DevotionalHubAccessService,

    private readonly plans: DevotionalPlansService,

    private readonly progress: DevotionalProgressService,

    private readonly journals: DevotionalJournalsService,

    private readonly groups: DevotionalGroupsService,

    private readonly prayerLists: DevotionalPrayerListsService,

    private readonly reminders: DevotionalRemindersService,

    private readonly ai: DevotionalAiService,

    private readonly pdf: DevotionalPdfService,

    private readonly meetups: DevotionalMeetupsService,

    private readonly discussions: DevotionalDiscussionsService,

    private readonly actionPoints: DevotionalActionPointsService,

    private readonly weeklyReview: DevotionalWeeklyReviewService,

    private readonly challenges: DevotionalChallengesService,

  ) {}



  @Get('context')

  @ApiOperation({ summary: 'Devotional Hub access context for current user' })

  getContext(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {

    return this.access.getContext(churchId, user.userId);

  }



  @Get('plans')

  listPlans(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Query('page') page?: string,

    @Query('limit') limit?: string,

    @Query('activeOnly') activeOnly?: string,

    @Query('includeDrafts') includeDrafts?: string,

    @Query('mineOnly') mineOnly?: string,

  ) {

    return this.plans.list(churchId, {

      page: page ? parseInt(page, 10) : 1,

      limit: limit ? parseInt(limit, 10) : undefined,

      activeOnly: activeOnly !== 'false',

      userId: user.userId,

      includeDrafts: includeDrafts === 'true',

      mineOnly: mineOnly === 'true',

    });

  }



  @Get('plans/:planId')

  async getPlan(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

  ) {

    const ctx = await this.access.getContext(churchId, user.userId);

    return this.plans.getOne(churchId, planId, user.userId, ctx.isLeader);

  }



  @Get('plans/:planId/today')

  getToday(@ChurchId() churchId: string, @Param('planId') planId: string) {

    return this.plans.getToday(churchId, planId);

  }



  @Post('plans/drafts')

  @ApiOperation({ summary: 'Create or update a devotional plan draft' })

  saveDraft(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body() body: UpsertDevotionalPlanDraftDto,

  ) {

    return this.plans.upsertDraft(churchId, user.userId, body);

  }



  @Post('plans/:planId/publish')

  @ApiOperation({ summary: 'Publish a draft plan to the church' })

  async publishPlan(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

  ) {

    const ctx = await this.access.getContext(churchId, user.userId);

    return this.plans.publish(churchId, planId, user.userId, ctx.isLeader);

  }



  @Post('plans/:planId/regenerate-outline')

  @ApiOperation({ summary: 'Regenerate AI study outline (saves previous version)' })

  async regenerateOutline(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

    @Body() body: { tone?: DevotionalPlanTone },

  ) {

    const ctx = await this.access.getContext(churchId, user.userId);

    return this.plans.regenerateOutline(

      churchId,

      planId,

      user.userId,

      ctx.isLeader,

      body.tone,

    );

  }



  @Post('plans/:planId/versions/:versionId/restore')

  @ApiOperation({ summary: 'Restore outline from a saved version' })

  async restoreVersion(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

    @Param('versionId') versionId: string,

  ) {

    const ctx = await this.access.getContext(churchId, user.userId);

    return this.plans.restoreOutlineVersion(

      churchId,

      planId,

      versionId,

      user.userId,

      ctx.isLeader,

    );

  }



  @Patch('plans/:planId/days/:dayId')

  @ApiOperation({ summary: 'Edit a single day section' })

  async updateDay(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

    @Param('dayId') dayId: string,

    @Body() body: UpdateDevotionalPlanDayDto,

  ) {

    const ctx = await this.access.getContext(churchId, user.userId);

    return this.plans.updateDay(

      churchId,

      planId,

      dayId,

      user.userId,

      ctx.isLeader,

      body,

    );

  }



  @Post('plans')

  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')

  createPlan(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body() body: CreateDevotionalPlanDto,

  ) {

    return this.plans.create(churchId, user.userId, body);

  }



  @Patch('plans/:planId')

  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')

  updatePlan(

    @ChurchId() churchId: string,

    @Param('planId') planId: string,

    @Body() body: { title?: string; description?: string; isActive?: boolean; endDate?: string },

  ) {

    return this.plans.update(churchId, planId, body);

  }



  @Get('weekly-review')
  @ApiOperation({ summary: 'Weekly review — completed, skipped, suggestions' })
  getWeeklyReview(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('weekKey') weekKey?: string,
  ) {
    return this.weeklyReview.getWeeklyReview(churchId, user.userId, weekKey);
  }

  @Get('action-points')
  listActionPoints(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('weekKey') weekKey?: string,
    @Query('status') status?: string,
  ) {
    return this.actionPoints.listMine(churchId, user.userId, weekKey, status);
  }

  @Post('action-points')
  createActionPoint(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateActionPointDto,
  ) {
    return this.actionPoints.create(churchId, user.userId, body);
  }

  @Patch('action-points/:id')
  updateActionPoint(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateActionPointDto,
  ) {
    return this.actionPoints.update(churchId, user.userId, id, body);
  }

  @Post('action-points/:id/complete')
  completeActionPoint(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.actionPoints.complete(churchId, user.userId, id);
  }

  @Post('action-points/:id/skip')
  skipActionPoint(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.actionPoints.skip(churchId, user.userId, id);
  }

  @Delete('action-points/:id')
  deleteActionPoint(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.actionPoints.remove(churchId, user.userId, id);
  }

  @Get('challenges')
  listChallenges(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('groupId') groupId?: string,
  ) {
    return this.challenges.listForMember(churchId, user.userId, groupId);
  }

  @Get('challenges/weekly-progress')
  challengeWeeklyProgress(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('weekKey') weekKey?: string,
  ) {
    return this.challenges.weeklyProgress(churchId, user.userId, weekKey);
  }

  @Get('challenges/badges')
  challengeBadges(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challenges.myBadges(churchId, user.userId);
  }

  @Post('challenges')
  createChallenge(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateChallengeDto,
  ) {
    return this.challenges.create(churchId, user.userId, body);
  }

  @Get('challenges/:challengeId')
  getChallenge(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challenges.getDetail(churchId, user.userId, challengeId);
  }

  @Post('challenges/:challengeId/join')
  joinChallenge(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challenges.join(churchId, user.userId, challengeId);
  }

  @Post('challenges/:challengeId/progress')
  recordChallengeProgress(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Body() body: RecordChallengeProgressDto,
  ) {
    return this.challenges.recordProgress(churchId, user.userId, challengeId, body);
  }

  @Get('challenges/:challengeId/leaderboard')
  challengeLeaderboard(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challenges.leaderboard(churchId, challengeId, user.userId);
  }

  @Post('plans/:planId/complete')

  markComplete(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

    @Body() body: { dayNumber: number; dayId?: string },

  ) {

    return this.progress.markDayComplete(

      churchId,

      user.userId,

      planId,

      body.dayNumber,

      body.dayId,

    );

  }



  @Get('progress/:planId')

  getProgress(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

  ) {

    return this.progress.getMyProgress(churchId, user.userId, planId);

  }



  @Get('journals/recap-prompts')
  @ApiOperation({ summary: 'Daily recap prompts for journal entries' })
  journalRecapPrompts() {
    return this.journals.recapPrompts();
  }

  @Get('journals/reaction-emojis')
  journalReactionEmojis() {
    return this.journals.reactionEmojis();
  }

  @Get('journals/share/:token')
  @ApiOperation({ summary: 'View a shared journal entry (church members)' })
  getSharedJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('token') token: string,
  ) {
    return this.journals.getByShareToken(churchId, user.userId, token);
  }

  @Get('journals/group/:groupId')
  @ApiOperation({ summary: 'Team journals for a devotional group' })
  listGroupJournals(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journals.listGroup(
      churchId,
      user.userId,
      groupId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('journals')
  @ApiOperation({ summary: 'Private journal entries for current member' })
  listJournals(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journals.listPrivate(
      churchId,
      user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('journals/:entryId/export')
  exportJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
    @Query('format') format?: 'markdown' | 'text',
  ) {
    return this.journals.exportEntry(churchId, user.userId, entryId, format ?? 'markdown');
  }

  @Get('journals/:entryId')
  getJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
  ) {
    return this.journals.getOne(churchId, user.userId, entryId);
  }

  @Post('journals')
  createJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateJournalDto,
  ) {
    return this.journals.create(churchId, user.userId, body);
  }

  @Patch('journals/:entryId')
  updateJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
    @Body() body: UpdateJournalDto,
  ) {
    return this.journals.update(churchId, user.userId, entryId, body);
  }

  @Delete('journals/:entryId')
  deleteJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
  ) {
    return this.journals.remove(churchId, user.userId, entryId);
  }

  @Post('journals/:entryId/comments')
  addJournalComment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
    @Body() body: CreateJournalCommentDto,
  ) {
    return this.journals.addComment(churchId, user.userId, entryId, body);
  }

  @Delete('journals/comments/:commentId')
  deleteJournalComment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
  ) {
    return this.journals.removeComment(churchId, user.userId, commentId);
  }

  @Post('journals/:entryId/reactions')
  toggleJournalReaction(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
    @Body() body: JournalReactionDto,
  ) {
    return this.journals.toggleReaction(churchId, user.userId, entryId, body.emoji);
  }

  @Post('journals/:entryId/pin')
  pinJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
  ) {
    return this.journals.setPinned(churchId, user.userId, entryId, true);
  }

  @Delete('journals/:entryId/pin')
  unpinJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
  ) {
    return this.journals.setPinned(churchId, user.userId, entryId, false);
  }

  @Post('journals/:entryId/share')
  shareJournal(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
  ) {
    return this.journals.createShareLink(churchId, user.userId, entryId);
  }



  @Get('groups')

  @ApiOperation({ summary: 'My groups, discoverable groups, pending invites' })

  listGroups(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {

    return this.groups.listForUser(churchId, user.userId);

  }



  @Post('groups')

  @ApiOperation({ summary: 'Any member can create a devotional group' })

  createGroup(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body() body: CreateDevotionalGroupDto,

  ) {

    return this.groups.create(churchId, user.userId, body);

  }



  @Post('groups/join/:token')

  joinGroupByLink(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('token') token: string,

  ) {

    return this.groups.joinViaGroupLink(churchId, user.userId, token);

  }



  @Post('groups/invites/:inviteId/accept')

  acceptGroupInvite(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('inviteId') inviteId: string,

  ) {

    return this.groups.acceptInvite(churchId, user.userId, inviteId);

  }



  @Post('groups/invites/:inviteId/decline')

  declineGroupInvite(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('inviteId') inviteId: string,

  ) {

    return this.groups.declineInvite(churchId, user.userId, inviteId);

  }



  @Get('groups/:groupId')

  getGroup(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

  ) {

    return this.groups.getOne(churchId, groupId, user.userId);

  }



  @Get('groups/:groupId/timeline')

  async getGroupTimeline(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

  ) {

    const detail = await this.groups.getOne(churchId, groupId, user.userId);

    return { items: detail.timeline };

  }



  @Patch('groups/:groupId')

  updateGroup(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

    @Body() body: UpdateDevotionalGroupDto,

  ) {

    return this.groups.update(churchId, groupId, user.userId, body);

  }



  @Post('groups/:groupId/invite-link')

  regenerateInviteLink(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

    @Body() body: RegenerateInviteLinkDto,

  ) {

    return this.groups.regenerateInviteLink(

      churchId,

      groupId,

      user.userId,

      body.expiresInDays,

    );

  }



  @Post('groups/:groupId/invites')

  sendGroupInvite(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

    @Body() body: InviteToGroupDto,

  ) {

    return this.groups.sendInvite(churchId, groupId, user.userId, body);

  }



  @Post('groups/:groupId/join')

  requestJoinGroup(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

  ) {

    return this.groups.requestJoin(churchId, groupId, user.userId);

  }



  @Post('groups/:groupId/leave')

  leaveGroup(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

  ) {

    return this.groups.leaveGroup(churchId, groupId, user.userId);

  }



  @Post('groups/:groupId/members/:memberId/approve')

  approveGroupMember(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

    @Param('memberId') memberId: string,

  ) {

    return this.groups.approveMember(churchId, groupId, user.userId, memberId);

  }



  @Post('groups/:groupId/members/:memberId/decline')

  declineGroupMember(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

    @Param('memberId') memberId: string,

  ) {

    return this.groups.declineMember(churchId, groupId, user.userId, memberId);

  }



  @Patch('groups/:groupId/members/:memberId/role')

  setGroupMemberRole(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('groupId') groupId: string,

    @Param('memberId') memberId: string,

    @Body() body: { role: 'CO_ADMIN' | 'MEMBER' },

  ) {

    return this.groups.setMemberRole(churchId, groupId, user.userId, memberId, body.role);

  }



  @Get('prayer-lists/digest')
  @ApiOperation({ summary: 'Weekly prayer digest' })
  prayerWeeklyDigest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('weekKey') weekKey?: string,
  ) {
    return this.prayerLists.weeklyDigest(churchId, user.userId, weekKey);
  }

  @Get('prayer-lists/streak')
  getPrayerStreak(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.prayerLists.getStreak(churchId, user.userId);
  }

  @Post('prayer-lists/streak/pray-today')
  @ApiOperation({ summary: 'Mark “I prayed today” for streak' })
  recordPrayedToday(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.prayerLists.recordPrayedToday(churchId, user.userId);
  }

  @Get('prayer-lists/group/:groupId')
  listGroupPrayerLists(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
  ) {
    return this.prayerLists.listForGroup(churchId, user.userId, groupId);
  }

  @Get('prayer-lists')
  listPrayerLists(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.prayerLists.listMine(churchId, user.userId);
  }

  @Get('prayer-lists/:listId')
  getPrayerList(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('listId') listId: string,
  ) {
    return this.prayerLists.getOne(churchId, user.userId, listId);
  }

  @Post('prayer-lists')
  createPrayerList(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePrayerListDto,
  ) {
    return this.prayerLists.create(churchId, user.userId, body);
  }

  @Patch('prayer-lists/:listId')
  updatePrayerList(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('listId') listId: string,
    @Body() body: UpdatePrayerListDto,
  ) {
    return this.prayerLists.updateList(churchId, user.userId, listId, body);
  }

  @Delete('prayer-lists/:listId')
  deletePrayerList(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('listId') listId: string,
  ) {
    return this.prayerLists.deleteList(churchId, user.userId, listId);
  }

  @Post('prayer-lists/:listId/items')
  addPrayerItem(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('listId') listId: string,
    @Body() body: PrayerListItemDto,
  ) {
    return this.prayerLists.addItem(churchId, user.userId, listId, body.body, body.dayId);
  }

  @Patch('prayer-lists/items/:itemId')
  updatePrayerItem(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
    @Body() body: UpdatePrayerItemDto,
  ) {
    return this.prayerLists.updateItem(churchId, user.userId, itemId, body);
  }

  @Delete('prayer-lists/items/:itemId')
  deletePrayerItem(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
  ) {
    return this.prayerLists.deleteItem(churchId, user.userId, itemId);
  }

  @Post('prayer-lists/items/:itemId/answered')
  markPrayerAnswered(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
  ) {
    return this.prayerLists.setAnswered(churchId, user.userId, itemId, true);
  }

  @Delete('prayer-lists/items/:itemId/answered')
  unmarkPrayerAnswered(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
  ) {
    return this.prayerLists.setAnswered(churchId, user.userId, itemId, false);
  }

  @Post('prayer-lists/items/:itemId/booster')
  prayerItemBooster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
    @Body() body: PrayerBoosterDto,
  ) {
    return this.prayerLists.generateBooster(churchId, user.userId, itemId, body);
  }



  @Get('reminders')

  @ApiOperation({ summary: 'List reminder settings and per-plan channels' })

  listReminders(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {

    return this.reminders.listMine(churchId, user.userId);

  }



  @Get('reminders/sync')

  @ApiOperation({ summary: 'Sync reminders across devices' })

  syncReminders(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {

    return this.reminders.syncState(churchId, user.userId);

  }



  @Put('reminders/preferences')

  @ApiOperation({ summary: 'Timezone and quiet hours' })

  updateReminderPreferences(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body() body: UpsertReminderPreferencesDto,

  ) {

    return this.reminders.updatePreferences(churchId, user.userId, body);

  }



  @Put('reminders/plans/:planId')

  @ApiOperation({ summary: 'Per-plan reminder channels' })

  upsertPlanReminders(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('planId') planId: string,

    @Body() body: UpsertPlanRemindersDto,

  ) {

    return this.reminders.upsertPlanReminders(churchId, user.userId, planId, body);

  }



  @Post('reminders')

  upsertReminder(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body()

    body: {

      channel: DevotionalReminderChannel;

      hourLocal?: number;

      minuteLocal?: number;

      timezone?: string;

      planId?: string;

      isEnabled?: boolean;

      frequency?: 'HOURLY' | 'DAILY';

    },

  ) {

    return this.reminders.upsert(churchId, user.userId, body);

  }



  @Post('reminders/:reminderId/snooze')

  @ApiOperation({ summary: '1-tap snooze reminder' })

  snoozeReminder(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('reminderId') reminderId: string,

    @Body() body: SnoozeReminderDto,

  ) {

    return this.reminders.snoozeReminder(churchId, user.userId, reminderId, body.minutes);

  }



  @Post('reminders/deliveries/:deliveryId/snooze')

  snoozeDelivery(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('deliveryId') deliveryId: string,

    @Body() body: SnoozeReminderDto,

  ) {

    return this.reminders.snoozeDelivery(churchId, user.userId, deliveryId, body.minutes);

  }



  @Post('reminders/deliveries/:deliveryId/done')

  @ApiOperation({ summary: 'Mark as done' })

  markReminderDone(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Param('deliveryId') deliveryId: string,

  ) {

    return this.reminders.markDeliveryDone(churchId, user.userId, deliveryId);

  }



  @Get('ai/artifacts')
  @ApiOperation({ summary: 'List recent AI artifacts for caching and history' })
  listAiArtifacts(
    @ChurchId() churchId: string,
    @Query('type') type?: string,
    @Query('planId') planId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ai.listArtifacts(churchId, {
      type: type as DevotionalAiArtifactType | undefined,
      planId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('ai/artifacts/:artifactId')
  @ApiOperation({ summary: 'Get a single AI artifact by id' })
  getAiArtifact(
    @ChurchId() churchId: string,
    @Param('artifactId') artifactId: string,
  ) {
    return this.ai.getArtifact(churchId, artifactId);
  }

  @Post('ai/study-outline')
  @UseGuards(DevotionalAiThrottleGuard)
  @ApiOperation({ summary: 'AI study outline — summary, breakdown, questions, application' })
  generateStudyOutlineAi(
    @ChurchId() churchId: string,
    @Body() body: StudyOutlineAiDto,
  ) {
    return this.ai.generateFullStudyOutline({
      churchId,
      planId: body.planId,
      sourceType: body.sourceType,
      topic: body.topic,
      bibleBook: body.bibleBook,
      topicalBook: body.topicalBook,
      customTopic: body.customTopic,
      tone: body.tone,
      durationDays: body.durationDays,
      durationWeeks: body.durationWeeks,
    });
  }

  @Post('ai/prayer-points')
  @UseGuards(DevotionalAiThrottleGuard)
  @ApiOperation({ summary: 'AI prayer points from scripture, topic, PDF, or daily section' })
  generatePrayerPointsAi(
    @ChurchId() churchId: string,
    @Body() body: PrayerPointsAiDto,
  ) {
    return this.ai.generatePrayerPoints({
      churchId,
      source: body.source,
      prompt: body.prompt,
      context: body.context,
      planId: body.planId,
      dayId: body.dayId,
      pdfImportId: body.pdfImportId,
    });
  }

  @Post('ai/ask-scripture')
  @UseGuards(DevotionalAiThrottleGuard)
  @ApiOperation({ summary: 'Ask the Scripture — simple, youth, or adult/theological depth' })
  askScriptureAi(
    @ChurchId() churchId: string,
    @Body() body: AskScriptureAiDto,
  ) {
    return this.ai.askScripture({
      churchId,
      question: body.question,
      passage: body.passage,
      depth: body.depth,
      planId: body.planId,
      dayId: body.dayId,
    });
  }

  @Post('ai/generate')
  @UseGuards(DevotionalAiThrottleGuard)
  generateAi(

    @ChurchId() churchId: string,

    @Body()

    body: {

      type: string;

      prompt: string;

      planId?: string;

      dayId?: string;

      context?: string;

    },

  ) {

    return this.ai.generate({

      churchId,

      planId: body.planId,

      dayId: body.dayId,

      type: body.type as Parameters<DevotionalAiService['generate']>[0]['type'],

      prompt: body.prompt,

      context: body.context,

    });

  }



  @Get('pdf/imports/:importId')
  @ApiOperation({ summary: 'Get PDF import status, pages, and devotional days' })
  getPdfImport(
    @ChurchId() churchId: string,
    @Param('importId') importId: string,
  ) {
    return this.pdf.getImport(churchId, importId);
  }

  @Post('pdf/imports/:importId/process')
  @UseGuards(DevotionalAiThrottleGuard)
  @ApiOperation({ summary: 'Extract PDF pages and build devotional day outline' })
  processPdfImport(
    @ChurchId() churchId: string,
    @Param('importId') importId: string,
  ) {
    return this.pdf.processImport(churchId, importId);
  }

  @Post('pdf/imports/:importId/simplify')
  @UseGuards(DevotionalAiThrottleGuard)
  @ApiOperation({ summary: 'Simplify PDF page text for a reading level' })
  simplifyPdfImport(
    @ChurchId() churchId: string,
    @Param('importId') importId: string,
    @Body() body: PdfSimplifyDto,
  ) {
    return this.ai.simplifyPdfContent({
      churchId,
      pdfImportId: importId,
      readingLevel: body.readingLevel,
      pageNumber: body.pageNumber,
    });
  }

  @Post('pdf/imports')
  @UseGuards(DevotionalAiThrottleGuard)
  registerPdf(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body() body: { fileName: string; fileUrl: string; planId?: string },

  ) {

    return this.pdf.registerImport(churchId, user.userId, body);

  }



  @Get('meetups/calendar')
  @ApiOperation({ summary: 'Monthly calendar of group meetups' })
  meetupCalendar(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('groupId') groupId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.meetups.calendar(
      churchId,
      user.userId,
      groupId,
      parseInt(year, 10) || new Date().getFullYear(),
      parseInt(month, 10) || new Date().getMonth() + 1,
    );
  }

  @Get('meetups')
  @ApiOperation({ summary: 'List group meetups (upcoming, past, or all)' })
  listMeetups(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('groupId') groupId: string,
    @Query('view') view?: 'upcoming' | 'past' | 'all',
  ) {
    return this.meetups.list(churchId, user.userId, groupId, view ?? 'upcoming');
  }

  @Get('meetups/:meetupId')
  getMeetup(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
  ) {
    return this.meetups.getOne(churchId, user.userId, meetupId);
  }

  @Post('meetups')
  @ApiOperation({ summary: 'Create group meetup (group admin)' })
  createMeetup(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMeetupDto,
  ) {
    return this.meetups.create(churchId, user.userId, body);
  }

  @Patch('meetups/:meetupId')
  updateMeetup(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
    @Body() body: UpdateMeetupDto,
  ) {
    return this.meetups.update(churchId, user.userId, meetupId, body);
  }

  @Post('meetups/:meetupId/cancel')
  cancelMeetup(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
  ) {
    return this.meetups.cancel(churchId, user.userId, meetupId);
  }

  @Post('meetups/:meetupId/duplicate')
  duplicateMeetup(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
  ) {
    return this.meetups.duplicate(churchId, user.userId, meetupId);
  }

  @Post('meetups/:meetupId/rsvp')
  meetupRsvp(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
    @Body() body: MeetupRsvpDto,
  ) {
    return this.meetups.rsvp(churchId, user.userId, meetupId, body.status);
  }

  @Patch('meetups/:meetupId/reminders')
  meetupReminderOffsets(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
    @Body() body: MeetupReminderOffsetsDto,
  ) {
    return this.meetups.updateReminderOffsets(churchId, user.userId, meetupId, body);
  }

  @Post('meetups/:meetupId/post-event')
  meetupPostEvent(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('meetupId') meetupId: string,
    @Body() body: MeetupPostEventDto,
  ) {
    return this.meetups.savePostEvent(churchId, user.userId, meetupId, body);
  }



  @Get('discussions')

  listDiscussions(@ChurchId() churchId: string, @Query('groupId') groupId: string) {

    return this.discussions.listGroup(churchId, groupId);

  }



  @Post('discussions')

  createDiscussion(

    @ChurchId() churchId: string,

    @CurrentUser() user: AuthUser,

    @Body() body: { body: string; title?: string; groupId?: string; planId?: string },

  ) {

    return this.discussions.create(churchId, user.userId, body);

  }

}



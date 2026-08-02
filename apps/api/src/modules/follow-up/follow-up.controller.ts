import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FollowUpAutomationTrigger, FollowUpStage } from '@prisma/client';
import { FollowUpService } from './follow-up.service';
import { FollowUpAutomationService } from './follow-up-automation.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { MemberAdmin, ModuleGate, Roles } from '../auth/decorators';

@ApiTags('follow-up')
@ApiBearerAuth()
@ModuleGate('followUp')
@Controller('follow-up')
export class FollowUpController {
  constructor(
    private readonly followUpService: FollowUpService,
    private readonly automation: FollowUpAutomationService,
  ) {}

  @Get('stats')
  getStats(@ChurchId() churchId: string) {
    return this.followUpService.getStats(churchId);
  }

  @Get('automation-rules')
  @Roles('ADMIN', 'PASTOR')
  listAutomationRules(@ChurchId() churchId: string) {
    return this.automation.listRules(churchId);
  }

  @Post('automation-rules')
  @Roles('ADMIN', 'PASTOR')
  upsertAutomationRule(
    @ChurchId() churchId: string,
    @Body()
    body: {
      id?: string;
      name: string;
      trigger: FollowUpAutomationTrigger;
      stage?: FollowUpStage | null;
      delayHours: number;
      channel: string;
      message?: string;
      notifyAssignee?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.automation.upsertRule(churchId, body);
  }

  @Get('assignees')
  listAssignees(@ChurchId() churchId: string) {
    return this.followUpService.listAssignees(churchId);
  }

  @Get('templates')
  listTemplates(@ChurchId() churchId: string) {
    return this.followUpService.listTemplates(churchId);
  }

  @Post('export-check')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({
    summary: 'Authorize church outreach PDF export (Admin, Pastor, or Leader)',
  })
  exportCheck() {
    return { ok: true };
  }

  @Post('templates')
  @Roles('ADMIN', 'PASTOR')
  createTemplate(
    @ChurchId() churchId: string,
    @Body() body: { name: string; channel: string; body: string; subject?: string },
  ) {
    return this.followUpService.createTemplate(churchId, body);
  }

  @Post('pastoral-notes')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  addNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      content: string;
      isConfidential?: boolean;
      memberId?: string;
      followUpId?: string;
      stageAtTime?: FollowUpStage;
      kind?: string;
    },
  ) {
    return this.followUpService.addPastoralNote(churchId, user.userId, body);
  }

  @Get('pastoral-notes')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  getNotes(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('followUpId') followUpId?: string,
  ) {
    return this.followUpService.getPastoralNotes(churchId, user.userId, { memberId, followUpId });
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Active leads with next-action dates for calendar view' })
  calendar(
    @ChurchId() churchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = to
      ? new Date(to)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return this.followUpService.listCalendar(
        churchId,
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      );
    }
    return this.followUpService.listCalendar(churchId, fromDate, toDate);
  }

  @Get()
  list(
    @ChurchId() churchId: string,
    @Query('stage') stage?: FollowUpStage,
    @Query('assignedToId') assignedToId?: string,
    @Query('archived') archived?: string,
  ) {
    return this.followUpService.list(churchId, stage, assignedToId, {
      archived: archived === '1' || archived === 'true',
    });
  }

  @Post()
  create(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.followUpService.create(churchId, body as Parameters<FollowUpService['create']>[1]);
  }

  @Get(':id')
  getOne(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.followUpService.getOne(churchId, id);
  }

  @Post(':id/archive')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Archive lead (no restore; email re-contact only)' })
  archive(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.followUpService.archive(churchId, id, user.userId, body.reason ?? '');
  }

  @Post(':id/archive-request')
  @ApiOperation({ summary: 'Outreach member DND — request archive with required comment' })
  requestArchive(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.followUpService.requestArchive(churchId, id, user.userId, body.reason ?? '');
  }

  @Post(':id/archive-request/approve')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Approve pending archive request' })
  approveArchiveRequest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.followUpService.archive(
      churchId,
      id,
      user.userId,
      body.reason?.trim() || 'Approved archive request',
    );
  }

  @Post(':id/archive-request/decline')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  declineArchiveRequest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.followUpService.declineArchiveRequest(churchId, id, user.userId, body.note);
  }

  @Post(':id/recontact')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Email an archived lead (no pipeline restore)' })
  recontact(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { subject?: string; body?: string },
  ) {
    return this.followUpService.recontactArchived(churchId, id, user.userId, {
      subject: body.subject ?? '',
      body: body.body ?? '',
    });
  }

  @Patch(':id')
  update(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.followUpService.update(churchId, id, body as Parameters<FollowUpService['update']>[2]);
  }

  @Patch(':id/stage')
  updateStage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      stage: FollowUpStage;
      notes?: string;
      whatWasDone?: string;
      whatNext?: string;
      dueAt?: string | null;
    },
  ) {
    return this.followUpService.updateStage(churchId, id, user.userId, body);
  }

  @Get(':id/reminders')
  listReminders(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.followUpService.listReminders(churchId, id);
  }

  @Post(':id/reminders')
  scheduleReminder(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { remindAt: string; channel: string; message: string; templateId?: string },
  ) {
    return this.followUpService.scheduleReminder(churchId, id, body);
  }

  @Post(':id/send-template')
  sendTemplate(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { templateId: string },
  ) {
    return this.followUpService.sendTemplateNow(churchId, id, body.templateId);
  }

  @Post(':id/link-member')
  @MemberAdmin()
  @ApiOperation({ summary: 'Link an existing member to this follow-up lead' })
  linkMember(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { memberId: string },
  ) {
    return this.followUpService.linkMember(churchId, id, body.memberId);
  }

  @Post(':id/create-member')
  @MemberAdmin()
  @ApiOperation({ summary: 'Create a membership record from this lead and link it' })
  createMemberFromLead(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.followUpService.createMemberFromLead(churchId, id);
  }
}

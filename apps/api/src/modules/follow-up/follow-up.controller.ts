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
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Authorize church outreach PDF export (Admin/Pastor only)' })
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

  @Get()
  list(
    @ChurchId() churchId: string,
    @Query('stage') stage?: FollowUpStage,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.followUpService.list(churchId, stage, assignedToId);
  }

  @Post()
  create(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.followUpService.create(churchId, body as Parameters<FollowUpService['create']>[1]);
  }

  @Get(':id')
  getOne(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.followUpService.getOne(churchId, id);
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

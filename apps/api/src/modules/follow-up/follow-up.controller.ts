import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FollowUpAutomationTrigger } from '@prisma/client';
import { FollowUpService } from './follow-up.service';
import { FollowUpAutomationService } from './follow-up-automation.service';
import { PipelineResolveService } from './pipeline-resolve.service';
import {
  PipelineDefinitionService,
  type AddStageInput,
  type PatchStageInput,
} from './pipeline-definition.service';
import { PipelineMergeService } from './pipeline-merge.service';
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
    private readonly pipelineResolve: PipelineResolveService,
    private readonly pipelineDefinition: PipelineDefinitionService,
    private readonly pipelineMerge: PipelineMergeService,
  ) {}

  @Get('pipeline')
  @ApiOperation({
    summary:
      'Resolve membership pipeline for this church (active definition, else preferred/base template)',
  })
  resolvePipeline(@ChurchId() churchId: string) {
    return this.pipelineResolve.resolveForChurch(churchId);
  }

  @Get('pipeline/templates')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'List system pipeline templates and preferred base (pre-fork)' })
  listPipelineTemplates(@ChurchId() churchId: string) {
    return this.pipelineDefinition.listTemplates(churchId);
  }

  @Put('pipeline/base-template')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary: 'Select base system template used before fork (rejected if already forked)',
  })
  setPipelineBaseTemplate(
    @ChurchId() churchId: string,
    @Body() body: { templateKey: string },
  ) {
    return this.pipelineDefinition.setBaseTemplate(churchId, body.templateKey);
  }

  @Post('pipeline/discard')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary: 'Deactivate church definition so a base system template can be selected again',
  })
  discardPipelineDefinition(@ChurchId() churchId: string) {
    return this.pipelineDefinition.discardDefinition(churchId);
  }

  @Post('pipeline/fork')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary:
      'Fork selected/preferred system template into a church-owned definition (idempotent if already forked)',
  })
  forkPipeline(
    @ChurchId() churchId: string,
    @Body() body?: { templateKey?: string },
  ) {
    return this.pipelineDefinition.fork(churchId, body?.templateKey);
  }

  @Patch('pipeline')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Rename the active church pipeline definition' })
  renamePipeline(
    @ChurchId() churchId: string,
    @Body() body: { name: string },
  ) {
    return this.pipelineDefinition.renameDefinition(churchId, body.name);
  }

  @Patch('pipeline/stages/:key')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary: 'Rename a customized stage label/shortLabel (presentation only)',
  })
  patchPipelineStage(
    @ChurchId() churchId: string,
    @Param('key') key: string,
    @Body() body: PatchStageInput,
  ) {
    return this.pipelineDefinition.patchStage(churchId, key, body);
  }

  @Post('pipeline/stages')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Add a custom stage to the forked church definition' })
  addPipelineStage(@ChurchId() churchId: string, @Body() body: AddStageInput) {
    return this.pipelineDefinition.addStage(churchId, body);
  }

  @Get('pipeline/updates')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary: 'Template updates available for forked church + stage diff',
  })
  pipelineUpdates(@ChurchId() churchId: string) {
    return this.pipelineMerge.getUpdates(churchId);
  }

  @Post('pipeline/updates/dismiss')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Dismiss current template update notice until the next bump' })
  dismissPipelineUpdates(@ChurchId() churchId: string) {
    return this.pipelineMerge.dismissUpdates(churchId);
  }

  @Post('pipeline/merge')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary:
      'Merge system template into church definition (preserves custom stages; conflicts need resolveConflicts)',
  })
  mergePipeline(
    @ChurchId() churchId: string,
    @Body()
    body?: { resolveConflicts?: Record<string, 'keep_church' | 'take_template'> },
  ) {
    return this.pipelineMerge.merge(churchId, body?.resolveConflicts ?? {});
  }

  @Post('pipeline/templates/:key/resync')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary:
      'Resync system template from seed (QA only — requires PIPELINE_QA_TOOLS=true; mutates shared templates)',
  })
  resyncPipelineTemplate(@Param('key') key: string) {
    return this.pipelineMerge.resyncTemplate(key);
  }

  @Post('pipeline/templates/:key/bump')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary:
      'Bump system template version (QA only — requires PIPELINE_QA_TOOLS=true; mutates shared templates)',
  })
  bumpPipelineTemplate(
    @Param('key') key: string,
    @Body()
    body?: {
      name?: string;
      description?: string;
      stages?: Array<{
        key: string;
        label?: string;
        shortLabel?: string;
        sortOrder?: number;
        phaseKey?: string;
        phaseStep?: number;
        phaseTitle?: string;
        colorToken?: string | null;
        isEntry?: boolean;
        blocksArchive?: boolean;
        graduatesSla?: boolean;
        isEnabled?: boolean;
      }>;
    },
  ) {
    return this.pipelineMerge.bumpTemplate(key, body);
  }

  @Get('stats')
  getStats(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.followUpService.getStats(churchId, user.userId);
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
      stage?: string | null;
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
  listAssignees(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.followUpService.listAssignees(churchId, user.userId);
  }

  @Get('templates')
  listTemplates(@ChurchId() churchId: string) {
    return this.followUpService.listTemplates(churchId);
  }

  @Post('export-check')
  @ApiOperation({
    summary: 'Authorize Establishment directory PDF export (managers only)',
  })
  async exportCheck(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    const access = await this.followUpService.getAccess(churchId, user.userId);
    if (access.mode !== 'manager') {
      throw new ForbiddenException('Only Establishment managers can export the directory');
    }
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
  @Roles('ADMIN', 'PASTOR')
  addNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      content: string;
      isConfidential?: boolean;
      memberId?: string;
      followUpId?: string;
      stageAtTime?: string;
      kind?: string;
    },
  ) {
    return this.followUpService.addPastoralNote(churchId, user.userId, body);
  }

  @Get('pastoral-notes')
  @Roles('ADMIN', 'PASTOR')
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
    @CurrentUser() user: AuthUser,
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
        user.userId,
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      );
    }
    return this.followUpService.listCalendar(churchId, user.userId, fromDate, toDate);
  }

  @Get()
  list(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('stage') stage?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('archived') archived?: string,
  ) {
    return this.followUpService.list(churchId, user.userId, stage, assignedToId, {
      archived: archived === '1' || archived === 'true',
    });
  }

  @Post()
  create(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.followUpService.create(
      churchId,
      body as Parameters<FollowUpService['create']>[1],
      user.userId,
    );
  }

  @Get(':id')
  getOne(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.followUpService.getOne(churchId, id, user.userId);
  }

  @Get(':id/stage-audit')
  @ApiOperation({ summary: 'Stage-change audit log (Establishment managers)' })
  listStageAudits(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.followUpService.listStageAudits(churchId, id, user.userId);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive lead (Establishment managers; no restore)' })
  archive(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.followUpService.archive(churchId, id, user.userId, body.reason ?? '');
  }

  @Post(':id/archive-request')
  @ApiOperation({ summary: 'Worker DND — request archive with required comment' })
  requestArchive(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.followUpService.requestArchive(churchId, id, user.userId, body.reason ?? '');
  }

  @Post(':id/archive-request/approve')
  @ApiOperation({ summary: 'Approve pending archive request (managers)' })
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
  declineArchiveRequest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.followUpService.declineArchiveRequest(churchId, id, user.userId, body.note);
  }

  @Post(':id/recontact')
  @ApiOperation({ summary: 'Email an archived lead (managers; no pipeline restore)' })
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
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.followUpService.update(churchId, id, body, user.userId);
  }

  @Patch(':id/stage')
  updateStage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      stage: string;
      notes?: string;
      whatWasDone?: string;
      whatNext?: string;
      dueAt?: string | null;
    },
  ) {
    return this.followUpService.updateStage(churchId, id, user.userId, body);
  }

  @Get(':id/reminders')
  listReminders(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.followUpService.listReminders(churchId, id, user.userId);
  }

  @Post(':id/reminders')
  scheduleReminder(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { remindAt: string; channel: string; message: string; templateId?: string },
  ) {
    return this.followUpService.scheduleReminder(churchId, id, body, user.userId);
  }

  @Post(':id/send-template')
  sendTemplate(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { templateId: string },
  ) {
    return this.followUpService.sendTemplateNow(churchId, id, body.templateId, user.userId);
  }

  @Post(':id/link-member')
  @MemberAdmin()
  @ApiOperation({ summary: 'Link an existing member to this follow-up lead' })
  linkMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { memberId: string },
  ) {
    return this.followUpService.linkMember(churchId, id, body.memberId, user.userId);
  }

  @Post(':id/create-member')
  @MemberAdmin()
  @ApiOperation({ summary: 'Create a membership record from this lead and link it' })
  createMemberFromLead(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.followUpService.createMemberFromLead(churchId, id, user.userId);
  }
}

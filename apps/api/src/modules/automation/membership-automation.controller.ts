import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutomationWorkflowKind } from '@prisma/client';
import { MembershipAutomationService } from './membership-automation.service';
import { AutomationSyncService } from './automation-sync.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';

const AUTOMATION_MANAGERS = ['ADMIN', 'PASTOR', 'LEADER'] as const;

@ApiTags('automation')
@ApiBearerAuth()
@Controller('automation')
export class MembershipAutomationController {
  constructor(
    private readonly automation: MembershipAutomationService,
    private readonly sync: AutomationSyncService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Automation hub status (settings, sync queue, recent runs)' })
  status(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.automation.getStatus(churchId, user.userId);
  }

  @Get('settings')
  @Roles(...AUTOMATION_MANAGERS)
  getSettings(@ChurchId() churchId: string) {
    return this.automation.getSettings(churchId);
  }

  @Patch('settings')
  @Roles('ADMIN', 'PASTOR')
  updateSettings(@ChurchId() churchId: string, @Body() body: Record<string, boolean>) {
    return this.automation.updateSettings(churchId, body);
  }

  @Get('runs')
  listRuns(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('workflow') workflow?: AutomationWorkflowKind,
  ) {
    return this.automation.listRunLogs(churchId, workflow, user.userId);
  }

  @Get('recommendations')
  recommendations(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.automation.buildRecommendations(churchId, user.userId);
  }

  @Get('pastoral-alerts/preview')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Preview pastoral alert counts without enqueueing' })
  pastoralPreview(@ChurchId() churchId: string) {
    return this.automation.previewPastoralAlerts(churchId);
  }

  @Post('run/:workflow')
  @Roles('ADMIN', 'PASTOR')
  runWorkflow(
    @ChurchId() churchId: string,
    @Param('workflow') workflow: AutomationWorkflowKind,
  ) {
    return this.automation.runWorkflow(churchId, workflow);
  }

  @Post('weekly')
  @Roles('ADMIN', 'PASTOR')
  runWeekly(@ChurchId() churchId: string) {
    return this.automation.runWeeklyWorkflow(churchId);
  }

  @Post('sync/process')
  processSync(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.automation.assertCanViewAutomation(user.userId, churchId).then(() =>
      this.sync.processPending(churchId),
    );
  }
}

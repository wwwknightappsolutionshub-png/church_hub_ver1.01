import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles, RequirePlatformPermission } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { BackupsService } from './backups.service';
import { BackupStorageService } from './backup-storage.service';
import {
  CreateTenantBackupDto,
  ListBackupJobsQueryDto,
  ListBackupRequestsQueryDto,
  ReviewBackupRequestDto,
  UpsertBackupScheduleDto,
} from './dto/backups.dto';

@ApiTags('platform-backups')
@ApiBearerAuth()
@Controller('platform/backups')
@Roles('PLATFORM_ADMIN')
export class PlatformBackupsController {
  constructor(
    private readonly backups: BackupsService,
    private readonly storage: BackupStorageService,
  ) {}

  @Get('status')
  @RequirePlatformPermission('platform.backups:read')
  @ApiOperation({ summary: 'Backup status monitor (last full/tenant, schedules, recent jobs)' })
  status() {
    return this.backups.getStatusMonitor();
  }

  @Get('jobs')
  @RequirePlatformPermission('platform.backups:read')
  listJobs(@Query() query: ListBackupJobsQueryDto) {
    return this.backups.listJobs(query);
  }

  @Get('jobs/:id')
  @RequirePlatformPermission('platform.backups:read')
  getJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.backups.getJob(id);
  }

  @Post('full')
  @RequirePlatformPermission('platform.backups:write')
  @ApiOperation({ summary: 'Manually run a full database backup' })
  runFull(@CurrentUser() user: AuthUser) {
    return this.backups.enqueueFullDb(user.userId);
  }

  @Post('tenant')
  @RequirePlatformPermission('platform.backups:write')
  @ApiOperation({ summary: 'Manually run a per-tenant export backup' })
  runTenant(@CurrentUser() user: AuthUser, @Body() body: CreateTenantBackupDto) {
    return this.backups.enqueueTenant(user.userId, body.churchId);
  }

  @Get('schedules')
  @RequirePlatformPermission('platform.backups:read')
  listSchedules() {
    return this.backups.listSchedules();
  }

  @Post('schedules')
  @RequirePlatformPermission('platform.backups:write')
  @ApiOperation({ summary: 'Create or update global / tenant backup schedule' })
  upsertSchedule(@CurrentUser() user: AuthUser, @Body() body: UpsertBackupScheduleDto) {
    return this.backups.upsertSchedule({
      actorUserId: user.userId,
      churchId: body.churchId ?? null,
      scope: body.scope,
      enabled: body.enabled,
      frequency: body.frequency,
      hourUtc: body.hourUtc,
      minuteUtc: body.minuteUtc,
      dayOfPeriod: body.dayOfPeriod,
      timezone: body.timezone,
      retentionDays: body.retentionDays,
    });
  }

  @Get('requests')
  @RequirePlatformPermission('platform.backups:read')
  listRequests(@Query() query: ListBackupRequestsQueryDto) {
    return this.backups.listRequests(query.status);
  }

  @Post('requests/:id/review')
  @RequirePlatformPermission('platform.backups:write')
  @ApiOperation({ summary: 'Approve or reject a tenant backup request' })
  review(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewBackupRequestDto,
  ) {
    return this.backups.reviewRequest({
      requestId: id,
      reviewerId: user.userId,
      approve: body.approve,
      reviewNote: body.reviewNote,
    });
  }

  @Post('artifacts/:id/download-token')
  @RequirePlatformPermission('platform.backups:download')
  @ApiOperation({ summary: 'Issue a short-lived single-use download token for an artifact' })
  async downloadToken(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const prepared = await this.backups.prepareDownload({
      artifactId: id,
      actor: { userId: user.userId, isPlatform: true },
    });
    return {
      artifactId: prepared.artifactId,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      byteSize: prepared.byteSize,
      token: prepared.token,
      expiresAt: prepared.expiresAt,
      /** Path only — send token via X-Backup-Download-Token header (never put token in the URL). */
      downloadPath: `/platform/backups/artifacts/${prepared.artifactId}/download`,
    };
  }

  @Get('artifacts/:id/download')
  @RequirePlatformPermission('platform.backups:download')
  @ApiOperation({ summary: 'Stream artifact bytes (requires X-Backup-Download-Token header)' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-backup-download-token') token: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const artifact = await this.backups.getArtifactForStream(id);
    await this.backups.redeemDownloadToken(id, token ?? '');
    const safeName = this.storage.sanitizeFileName(
      this.backups.clientDownloadName(artifact.fileName),
    );
    res.set({
      'Content-Type': artifact.mimeType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(this.backups.openArtifactStream(artifact.storageKey));
  }
}

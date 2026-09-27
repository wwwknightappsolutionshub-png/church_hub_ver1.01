import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../auth/decorators';
import { AuthUser, CurrentUser, ChurchId } from '../auth/current-user.decorator';
import { BackupsService } from './backups.service';
import { BackupStorageService } from './backup-storage.service';
import { CreateBackupRequestDto } from './dto/backups.dto';

@ApiTags('church-backups')
@ApiBearerAuth()
@Controller('backups')
@Roles('ADMIN', 'PASTOR')
export class TenantBackupsController {
  constructor(
    private readonly backups: BackupsService,
    private readonly storage: BackupStorageService,
  ) {}

  @Get('requests')
  @ApiOperation({ summary: 'List backup requests for the current church' })
  list(@ChurchId() churchId: string) {
    return this.backups.listTenantRequests(churchId);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Request a tenant backup (requires platform approval)' })
  create(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateBackupRequestDto,
  ) {
    return this.backups.createTenantRequest({
      churchId,
      userId: user.userId,
      reason: body.reason,
    });
  }

  @Post('artifacts/:id/download-token')
  @ApiOperation({ summary: 'Issue single-use download token for an approved tenant backup artifact' })
  async downloadToken(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const prepared = await this.backups.prepareDownload({
      artifactId: id,
      actor: { userId: user.userId, isPlatform: false, churchId },
    });
    return {
      artifactId: prepared.artifactId,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      byteSize: prepared.byteSize,
      token: prepared.token,
      expiresAt: prepared.expiresAt,
      downloadPath: `/backups/artifacts/${prepared.artifactId}/download`,
    };
  }

  @Get('artifacts/:id/download')
  @ApiOperation({ summary: 'Stream tenant backup artifact (X-Backup-Download-Token required)' })
  async download(
    @ChurchId() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-backup-download-token') token: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const artifact = await this.backups.assertTenantArtifactAccess({
      artifactId: id,
      churchId,
    });
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

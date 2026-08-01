import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OutreachConvertStage } from '@prisma/client';
import { OutreachService } from './outreach.service';
import { OutreachPipelineService } from './outreach-pipeline.service';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';
import { Roles, ModuleGate, Public } from '../auth/decorators';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import {
  outreachCaptureSchema,
  outreachSyncSchema,
  pipelineAdvanceSchema,
  publicRegisterSchema,
  resolveSyncConflictSchema,
} from './outreach.schemas';
import type { z } from 'zod';

@ApiTags('outreach')
@Controller('outreach')
export class OutreachController {
  constructor(
    private readonly outreachService: OutreachService,
    private readonly pipeline: OutreachPipelineService,
    private readonly syncConflicts: OutreachSyncConflictService,
    private readonly config: ConfigService,
  ) {}

  private appBaseUrl() {
    return this.config.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3001');
  }

  @Get('stats')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  getStats(@ChurchId() churchId: string) {
    return this.outreachService.getStats(churchId);
  }

  @Post('capture')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @ApiOperation({ summary: 'Capture outreach contact (online)' })
  capture(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(outreachCaptureSchema) body: z.infer<typeof outreachCaptureSchema>,
  ) {
    return this.outreachService.captureContact(churchId, {
      ...body,
      capturedByUserId: user.userId,
    });
  }

  @Post('sync')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @ApiOperation({ summary: 'Sync offline capture queue' })
  sync(
    @ChurchId() churchId: string,
    @ZodBody(outreachSyncSchema) body: z.infer<typeof outreachSyncSchema>,
  ) {
    return this.outreachService.queueOfflineCapture(churchId, body.items);
  }

  @Get('sync/queue')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  getSyncQueue(@ChurchId() churchId: string) {
    return this.outreachService.getSyncQueue(churchId);
  }

  @Get('sync/conflicts')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'List open offline sync conflicts' })
  listSyncConflicts(@ChurchId() churchId: string) {
    return this.syncConflicts.listOpenConflicts(churchId);
  }

  @Post('sync/conflicts/:id/resolve')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Resolve outreach sync conflict (client/server/merge)' })
  resolveSyncConflict(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(resolveSyncConflictSchema) body: z.infer<typeof resolveSyncConflictSchema>,
  ) {
    return this.syncConflicts.resolveConflict(churchId, id, user.userId, body.strategy, body.mergedPayload);
  }

  @Post('contacts/:id/welcome')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  resendWelcome(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.outreachService.sendWelcomeMessage(churchId, id);
  }

  @Get('contacts')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  listContacts(
    @ChurchId() churchId: string,
    @Query('evangelistId') evangelistId?: string,
    @Query('convertStage') convertStage?: string,
  ) {
    return this.outreachService.listContacts(churchId, evangelistId, convertStage);
  }

  @Get('pipeline')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Convert pipeline board data' })
  getPipeline(@ChurchId() churchId: string) {
    return this.pipeline.getPipeline(churchId);
  }

  @Patch('contacts/:id/pipeline')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  advancePipeline(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @ZodBody(pipelineAdvanceSchema) body: z.infer<typeof pipelineAdvanceSchema>,
  ) {
    return this.pipeline.advanceStage(churchId, id, body.convertStage as OutreachConvertStage);
  }

  @Post('contacts/:id/convert-to-member')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Convert outreach contact to church member (+ bus ride if flagged)' })
  convertToMember(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pipeline.convertToMember(churchId, id, user.userId);
  }

  @Get('qr/team')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  listTeamQr(@ChurchId() churchId: string) {
    return this.outreachService.listTeamQrCodes(churchId);
  }

  @Get('qr/me')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @ApiOperation({ summary: 'Get or create the stable church-wide Team QR' })
  myQr(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.outreachService.getOrCreateMyQr(churchId, user.userId, this.appBaseUrl());
  }

  @Get('qr/church')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @ApiOperation({ summary: 'Stable church-level Team QR (same as /qr/me)' })
  churchQr(@ChurchId() churchId: string) {
    return this.outreachService.getOrCreateChurchQr(churchId, this.appBaseUrl());
  }

  @Post('qr/:memberId')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary: 'Deprecated — personal evangelist QR. Prefer GET /outreach/qr/church',
    deprecated: true,
  })
  generateQr(@ChurchId() churchId: string, @Param('memberId') memberId: string) {
    return this.outreachService.generateEvangelistQr(churchId, memberId, this.appBaseUrl());
  }

  @Public()
  @Get('register/:code')
  @ApiOperation({ summary: 'Resolve evangelist QR / NFC link (public)' })
  resolveRegister(@Param('code') code: string) {
    return this.outreachService.resolveQrCode(code);
  }

  @Public()
  @Post('register/:code')
  @ApiOperation({ summary: 'Self-registration via team QR or NFC tap' })
  publicRegister(
    @Param('code') code: string,
    @ZodBody(publicRegisterSchema) body: z.infer<typeof publicRegisterSchema>,
  ) {
    return this.outreachService.publicSelfRegister(code, body);
  }
}

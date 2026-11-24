import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OutreachConvertStage } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { OutreachService } from './outreach.service';
import { OutreachPipelineService } from './outreach-pipeline.service';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';
import { OutreachCampaignService } from './outreach-campaign.service';
import { OutreachDedupeService } from './outreach-dedupe.service';
import { OutreachIntelligenceService } from './outreach-intelligence.service';
import { Roles, ModuleGate, Public } from '../auth/decorators';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import {
  outreachCaptureSchema,
  outreachCampaignBodySchema,
  outreachSyncSchema,
  pipelineAdvanceSchema,
  publicRegisterSchema,
  resolveSyncConflictSchema,
} from './outreach.schemas';
import { resolveOutreachCaptureBaseUrl } from './outreach-capture-url.util';
import type { z } from 'zod';
import { formatDuplicateMatchesForClient } from './outreach-dedupe.present';

const LEADER_ROLES = ['ADMIN', 'PASTOR', 'LEADER'] as const;

function userCanOverrideDuplicate(user: AuthUser) {
  return user.roles?.some((r) => LEADER_ROLES.includes(r as (typeof LEADER_ROLES)[number]));
}

@ApiTags('outreach')
@Controller('outreach')
export class OutreachController {
  constructor(
    private readonly outreachService: OutreachService,
    private readonly pipeline: OutreachPipelineService,
    private readonly syncConflicts: OutreachSyncConflictService,
    private readonly campaigns: OutreachCampaignService,
    private readonly dedupe: OutreachDedupeService,
    private readonly intelligence: OutreachIntelligenceService,
    private readonly config: ConfigService,
  ) {}

  private appBaseUrl(requestOrigin?: string) {
    const configured =
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'https://church-hub.online';
    return resolveOutreachCaptureBaseUrl(configured, requestOrigin);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Outreach stats (all church users)' })
  getStats(@ChurchId() churchId: string) {
    return this.outreachService.getStats(churchId);
  }

  @Get('campaigns')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List outreach campaigns' })
  listCampaigns(
    @ChurchId() churchId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.campaigns.list(churchId, activeOnly === '1' || activeOnly === 'true');
  }

  @Post('campaigns')
  @ApiBearerAuth()
  @Roles(...LEADER_ROLES)
  @ModuleGate('followUp')
  createCampaign(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(outreachCampaignBodySchema) body: z.infer<typeof outreachCampaignBodySchema>,
  ) {
    return this.campaigns.create(churchId, user.userId, body);
  }

  @Patch('campaigns/:id')
  @ApiBearerAuth()
  @Roles(...LEADER_ROLES)
  @ModuleGate('followUp')
  updateCampaign(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(outreachCampaignBodySchema.partial()) body: Partial<
      z.infer<typeof outreachCampaignBodySchema>
    >,
  ) {
    return this.campaigns.update(churchId, user.userId, id, body);
  }

  @Get('duplicates')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Check for active Establishment journey duplicates' })
  async checkDuplicates(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
  ) {
    const phoneNorm = phone?.trim();
    const emailNorm = email?.trim();
    if (!phoneNorm && !emailNorm) {
      throw new BadRequestException('Provide phone or email to check duplicates');
    }
    const matches = await this.dedupe.findActiveJourneyDuplicates(
      churchId,
      phoneNorm,
      emailNorm,
    );
    const exposePii = userCanOverrideDuplicate(user) === true;
    return { matches: formatDuplicateMatchesForClient(matches, exposePii) };
  }

  @Get('command-centre')
  @ApiBearerAuth()
  @Roles(...LEADER_ROLES)
  @ModuleGate('followUp')
  commandCentre(
    @ChurchId() churchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.intelligence.commandCentre(churchId, from, to, campaignId);
  }

  @Get('team-scorecard')
  @ApiBearerAuth()
  @Roles(...LEADER_ROLES)
  @ModuleGate('followUp')
  teamScorecard(
    @ChurchId() churchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.intelligence.teamScorecard(churchId, from, to, campaignId);
  }

  @Get('map-points')
  @ApiBearerAuth()
  @Roles(...LEADER_ROLES)
  @ModuleGate('followUp')
  mapPoints(
    @ChurchId() churchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaignId') campaignId?: string,
    @Query('minLat') minLat?: string,
    @Query('maxLat') maxLat?: string,
    @Query('minLng') minLng?: string,
    @Query('maxLng') maxLng?: string,
  ) {
    return this.intelligence.mapPoints(
      churchId,
      from,
      to,
      campaignId,
      minLat != null ? Number(minLat) : undefined,
      maxLat != null ? Number(maxLat) : undefined,
      minLng != null ? Number(minLng) : undefined,
      maxLng != null ? Number(maxLng) : undefined,
    );
  }

  @Post('capture')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture outreach contact (online) — all church users' })
  capture(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(outreachCaptureSchema) body: z.infer<typeof outreachCaptureSchema>,
  ) {
    const leader = userCanOverrideDuplicate(user);
    const allowDuplicateOverride = body.allowDuplicateOverride === true && leader;
    if (body.allowDuplicateOverride && !allowDuplicateOverride) {
      throw new ForbiddenException('Only leaders can override duplicate journey blocks');
    }
    const { allowDuplicateOverride: _drop, ...captureBody } = body;
    return this.outreachService.captureContact(churchId, captureBody, {
      allowDuplicateOverride,
      capturedByUserId: user.userId,
      captureSource: 'MANUAL',
      exposeDuplicatePii: leader,
    });
  }

  @Post('sync')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync offline capture queue — all church users' })
  sync(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(outreachSyncSchema) body: z.infer<typeof outreachSyncSchema>,
  ) {
    return this.outreachService.queueOfflineCapture(churchId, body.items, user.userId);
  }

  @Get('sync/queue')
  @ApiBearerAuth()
  getSyncQueue(@ChurchId() churchId: string) {
    return this.outreachService.getSyncQueue(churchId);
  }

  @Get('sync/conflicts')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles(...LEADER_ROLES)
  @ApiOperation({ summary: 'List open offline sync conflicts' })
  listSyncConflicts(@ChurchId() churchId: string) {
    return this.syncConflicts.listOpenConflicts(churchId);
  }

  @Post('sync/conflicts/:id/resolve')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles(...LEADER_ROLES)
  @ApiOperation({ summary: 'Resolve outreach sync conflict (client/server/merge)' })
  resolveSyncConflict(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(resolveSyncConflictSchema) body: z.infer<typeof resolveSyncConflictSchema>,
  ) {
    return this.syncConflicts.resolveConflict(
      churchId,
      id,
      user.userId,
      body.strategy,
      body.mergedPayload,
    );
  }

  @Post('contacts/:id/welcome')
  @ApiBearerAuth()
  @Roles(...LEADER_ROLES)
  resendWelcome(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.outreachService.sendWelcomeMessage(churchId, id);
  }

  @Get('contacts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List outreach contacts — all church users' })
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
  @Roles(...LEADER_ROLES)
  @ApiOperation({ summary: 'Convert pipeline board data' })
  getPipeline(@ChurchId() churchId: string) {
    return this.pipeline.getPipeline(churchId);
  }

  @Patch('contacts/:id/pipeline')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles(...LEADER_ROLES)
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
  @Roles(...LEADER_ROLES)
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
  listTeamQr(@ChurchId() churchId: string) {
    return this.outreachService.listTeamQrCodes(churchId);
  }

  @Get('qr/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get or create the stable church-wide Team QR' })
  myQr(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('origin') origin?: string,
  ) {
    return this.outreachService.getOrCreateMyQr(churchId, user.userId, this.appBaseUrl(origin));
  }

  @Get('qr/church')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stable church-level Team QR (same as /qr/me)' })
  churchQr(@ChurchId() churchId: string, @Query('origin') origin?: string) {
    return this.outreachService.getOrCreateChurchQr(churchId, this.appBaseUrl(origin));
  }

  @Post('qr/:memberId')
  @ApiBearerAuth()
  @ModuleGate('followUp')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({
    summary: 'Deprecated — personal evangelist QR. Prefer GET /outreach/qr/church',
    deprecated: true,
  })
  generateQr(
    @ChurchId() churchId: string,
    @Param('memberId') memberId: string,
    @Query('origin') origin?: string,
  ) {
    return this.outreachService.generateEvangelistQr(churchId, memberId, this.appBaseUrl(origin));
  }

  @Public()
  @Get('register/:code')
  @ApiOperation({ summary: 'Resolve evangelist QR / NFC link (public)' })
  resolveRegister(@Param('code') code: string) {
    return this.outreachService.resolveQrCode(code);
  }

  @Public()
  @Get('register/:code/check-email')
  @ApiOperation({ summary: 'Check if email already exists for this church (public)' })
  checkRegisterEmail(@Param('code') code: string, @Query('email') email?: string) {
    return this.outreachService.checkRegisterEmail(code, email ?? '');
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
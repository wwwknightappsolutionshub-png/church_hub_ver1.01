import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketingInboundStatus, MarketingInboundType } from '@prisma/client';
import { Roles, RequirePlatformPermission } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { PlatformMarketingService } from './platform-marketing.service';
import { MarketingInboundService } from '../marketing-inbound/marketing-inbound.service';

@ApiTags('platform-marketing')
@ApiBearerAuth()
@Controller('platform/marketing')
@Roles('PLATFORM_ADMIN')
export class PlatformMarketingController {
  constructor(
    private readonly marketing: PlatformMarketingService,
    private readonly inbound: MarketingInboundService,
  ) {}

  @Get('templates')
  @RequirePlatformPermission('platform.marketing:read')
  @ApiOperation({ summary: 'List platform marketing email templates (auto-syncs missing defaults)' })
  listTemplates() {
    return this.marketing.listTemplates();
  }

  @Post('sync')
  @RequirePlatformPermission('platform.marketing:write')
  @ApiOperation({ summary: 'Insert any missing default marketing templates without overwriting edits' })
  syncMissing() {
    return this.marketing.syncMissingDefaults();
  }

  @Post('seed')
  @RequirePlatformPermission('platform.marketing:write')
  @ApiOperation({ summary: 'Seed / refresh Church_Hub marketing templates' })
  seedTemplates() {
    return this.marketing.ensureSeeded();
  }

  /** @deprecated Prefer POST /platform/marketing/seed */
  @Post('templates/seed')
  @RequirePlatformPermission('platform.marketing:write')
  seedTemplatesLegacy() {
    return this.marketing.ensureSeeded();
  }

  @Get('templates/:slug')
  @RequirePlatformPermission('platform.marketing:read')
  getTemplate(@Param('slug') slug: string) {
    return this.marketing.getBySlug(slug);
  }

  @Patch('templates/:slug')
  @RequirePlatformPermission('platform.marketing:write')
  updateTemplate(
    @Param('slug') slug: string,
    @Body() body: { subject?: string; htmlBody?: string; textBody?: string | null; name?: string },
  ) {
    return this.marketing.updateTemplate(slug, body);
  }

  @Get('submissions')
  @RequirePlatformPermission('platform.marketing:read')
  @ApiOperation({ summary: 'List public marketing contact & feedback submissions' })
  listSubmissions(
    @Query('type') type?: MarketingInboundType,
    @Query('status') status?: MarketingInboundStatus,
  ) {
    return this.inbound.list({ type, status });
  }

  @Patch('submissions/:id')
  @RequirePlatformPermission('platform.marketing:write')
  @ApiOperation({ summary: 'Update submission status or internal notes' })
  updateSubmission(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status?: MarketingInboundStatus; internalNotes?: string | null },
  ) {
    return this.inbound.update(user.userId, id, body);
  }
}

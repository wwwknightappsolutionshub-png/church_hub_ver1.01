import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { PlatformMarketingService } from './platform-marketing.service';

@ApiTags('platform-marketing')
@ApiBearerAuth()
@Controller('platform/marketing')
@Roles('PLATFORM_ADMIN')
export class PlatformMarketingController {
  constructor(private readonly marketing: PlatformMarketingService) {}

  @Get('templates')
  @ApiOperation({ summary: 'List platform marketing email templates (auto-syncs missing defaults)' })
  listTemplates() {
    return this.marketing.listTemplates();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Insert any missing default marketing templates without overwriting edits' })
  syncMissing() {
    return this.marketing.syncMissingDefaults();
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed / refresh Church_Hub marketing templates' })
  seedTemplates() {
    return this.marketing.ensureSeeded();
  }

  /** @deprecated Prefer POST /platform/marketing/seed */
  @Post('templates/seed')
  seedTemplatesLegacy() {
    return this.marketing.ensureSeeded();
  }

  @Get('templates/:slug')
  getTemplate(@Param('slug') slug: string) {
    return this.marketing.getBySlug(slug);
  }

  @Patch('templates/:slug')
  updateTemplate(
    @Param('slug') slug: string,
    @Body() body: { subject?: string; htmlBody?: string; textBody?: string | null; name?: string },
  ) {
    return this.marketing.updateTemplate(slug, body);
  }
}

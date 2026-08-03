import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RequirePlatformPermission } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { WhatsAppAdapter } from '../notifications/adapters/whatsapp.adapter';
import { PlatformWhatsAppService } from './platform-whatsapp.service';
import {
  TestPlatformWhatsAppDto,
  UpdatePlatformWhatsAppDto,
} from './dto/platform-whatsapp.dto';

@ApiTags('platform-integrations')
@ApiBearerAuth()
@Roles('PLATFORM_ADMIN')
@Controller('platform/integrations/whatsapp')
export class PlatformWhatsAppController {
  constructor(
    private readonly whatsappConfig: PlatformWhatsAppService,
    private readonly whatsapp: WhatsAppAdapter,
  ) {}

  @Get()
  @RequirePlatformPermission('platform.integrations:read')
  @ApiOperation({ summary: 'Get global WhatsApp gateway config (secrets masked)' })
  getConfig() {
    return this.whatsappConfig.getPublicConfig();
  }

  @Patch()
  @RequirePlatformPermission('platform.integrations:write')
  @ApiOperation({ summary: 'Update or rotate global WhatsApp session credentials' })
  async update(@CurrentUser() user: AuthUser, @Body() body: UpdatePlatformWhatsAppDto) {
    const config = await this.whatsappConfig.updateConfig(user.userId, body);
    this.whatsapp.invalidateCache();
    return config;
  }

  @Post('test')
  @RequirePlatformPermission('platform.integrations:write')
  @ApiOperation({ summary: 'Send a test WhatsApp message using the global session' })
  async test(@Body() body: TestPlatformWhatsAppDto) {
    const creds = await this.whatsappConfig.resolveCredentials();
    if (creds.source === 'none') {
      await this.whatsappConfig.recordTestResult(
        false,
        'WhatsApp gateway is not configured (no DB session and no WHATSAPP_* env).',
      );
      return {
        success: false,
        messageId: null,
        error: 'WhatsApp gateway is not configured. Save API URL, session ID, and API key, then enable.',
        config: await this.whatsappConfig.getPublicConfig(),
      };
    }

    const message =
      body.message?.trim() ||
      `Church Hub test message at ${new Date().toISOString()}`;
    this.whatsapp.invalidateCache();
    const result = await this.whatsapp.send({
      to: body.phone,
      body: message,
      churchId: 'platform',
    });
    const ok = result.success === true && !result.messageId.startsWith('wa_stub_');
    await this.whatsappConfig.recordTestResult(
      ok,
      ok
        ? `Sent via ${creds.source} (messageId=${result.messageId})`
        : `Failed: ${result.error ?? 'unknown error'}`,
    );
    return {
      success: ok,
      messageId: result.messageId,
      error: ok ? null : (result.error ?? 'Send failed'),
      config: await this.whatsappConfig.getPublicConfig(),
    };
  }
}

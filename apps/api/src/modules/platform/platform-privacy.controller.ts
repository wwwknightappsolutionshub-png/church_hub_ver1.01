import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DsarRequestStatus } from '@prisma/client';
import { Request } from 'express';
import { Public, Roles, RequirePlatformPermission } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { PlatformPrivacyService } from './platform-privacy.service';
import { RecordConsentDto, UpdateDsarDto } from './dto/platform-cms.dto';
import { CookieConsentDto } from './dto/cookie-consent.dto';
import { clientMeta } from './platform-cms.controller';

@ApiTags('privacy')
@Controller('privacy')
export class PrivacySelfServiceController {
  constructor(private readonly privacy: PlatformPrivacyService) {}

  @Public()
  @Post('cookies')
  @ApiOperation({ summary: 'Record cookie banner choice (anonymous or authenticated)' })
  recordCookies(@Body() body: CookieConsentDto, @Req() req: Request) {
    const meta = clientMeta(req);
    const authUser = (req as Request & { user?: AuthUser }).user;
    return this.privacy.recordCookieConsent({
      choice: body.choice,
      userId: authUser?.userId ?? null,
      churchId: authUser?.churchId ?? null,
      email: authUser?.email ?? body.email ?? null,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @ApiBearerAuth()
  @Get('consents')
  @ApiOperation({ summary: 'List my consent records' })
  myConsents(@CurrentUser() user: AuthUser) {
    return this.privacy.listMyConsents(user.userId);
  }

  @ApiBearerAuth()
  @Post('consents')
  @ApiOperation({ summary: 'Record a consent decision' })
  recordConsent(
    @CurrentUser() user: AuthUser,
    @Body() body: RecordConsentDto,
    @Req() req: Request,
  ) {
    const meta = clientMeta(req);
    return this.privacy.recordConsentForUser(
      user.userId,
      user.churchId,
      user.email,
      body,
      { ipAddress: meta.ipAddress ?? undefined, userAgent: meta.userAgent ?? undefined },
    );
  }

  @ApiBearerAuth()
  @Get('export')
  @ApiOperation({ summary: 'Export my personal data (JSON package)' })
  export(@CurrentUser() user: AuthUser) {
    return this.privacy.exportMyData(user.userId);
  }

  @ApiBearerAuth()
  @Post('erasure')
  @ApiOperation({ summary: 'Request account erasure (optionally execute now)' })
  erasure(
    @CurrentUser() user: AuthUser,
    @Body() body: { executeNow?: boolean; notes?: string },
  ) {
    return this.privacy.requestErasure(user.userId, {
      executeNow: body?.executeNow === true,
      notes: body?.notes,
    });
  }
}

@ApiTags('platform-privacy')
@ApiBearerAuth()
@Roles('PLATFORM_ADMIN')
@Controller('platform/privacy')
export class PlatformPrivacyController {
  constructor(private readonly privacy: PlatformPrivacyService) {}

  @Get('dsar')
  @RequirePlatformPermission('platform.privacy:read')
  list(@Query('status') status?: DsarRequestStatus) {
    return this.privacy.listDsar(status);
  }

  @Patch('dsar/:id')
  @RequirePlatformPermission('platform.privacy:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateDsarDto,
  ) {
    return this.privacy.updateDsar(user.userId, id, body);
  }
}

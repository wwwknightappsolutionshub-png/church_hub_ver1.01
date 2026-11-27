import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, RequirePlatformPermission, Roles } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { UpdatePlatformSiteTrackingDto } from './dto/platform-site-tracking.dto';
import { PlatformSiteTrackingService } from './platform-site-tracking.service';
import type { SiteTrackingIds } from './site-tracking.ids';

const EMPTY_TRACKING: SiteTrackingIds = {
  gtmContainerId: null,
  gaMeasurementId: null,
  facebookPixelId: null,
  googleSiteVerification: null,
};

@ApiTags('public-site-tracking')
@Controller('public/site-tracking')
export class PublicSiteTrackingController {
  constructor(private readonly tracking: PlatformSiteTrackingService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public measurement IDs for the marketing site' })
  async getPublic() {
    try {
      return await this.tracking.getPublic();
    } catch {
      return EMPTY_TRACKING;
    }
  }
}

@ApiTags('platform-integrations')
@Roles('PLATFORM_ADMIN')
@Controller('platform/integrations/site-tracking')
export class PlatformSiteTrackingController {
  constructor(private readonly tracking: PlatformSiteTrackingService) {}

  @Get()
  @RequirePlatformPermission('platform.integrations:read')
  @ApiOperation({ summary: 'Read public-site measurement IDs' })
  getConfig() {
    return this.tracking.getAdmin();
  }

  @Patch()
  @RequirePlatformPermission('platform.integrations:write')
  @ApiOperation({ summary: 'Update public-site measurement IDs' })
  update(@CurrentUser() user: AuthUser, @Body() body: UpdatePlatformSiteTrackingDto) {
    return this.tracking.update(user.userId, body);
  }
}

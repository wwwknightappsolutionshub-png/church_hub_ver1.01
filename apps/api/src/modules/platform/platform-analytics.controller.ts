import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { PlatformAnalyticsService } from './platform-analytics.service';

@ApiTags('platform-analytics')
@ApiBearerAuth()
@Controller('platform/analytics')
@Roles('PLATFORM_ADMIN')
export class PlatformAnalyticsController {
  constructor(private readonly analytics: PlatformAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'SaaS owner business performance dashboard' })
  dashboard() {
    return this.analytics.getDashboard();
  }
}

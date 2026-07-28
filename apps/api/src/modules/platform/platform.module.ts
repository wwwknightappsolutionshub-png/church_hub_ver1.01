import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PlatformController } from './platform.controller';
import { PlatformMarketingController } from './platform-marketing.controller';
import { PlatformService } from './platform.service';
import { PlatformProvisioningService } from './platform-provisioning.service';
import { PlatformMarketingService } from './platform-marketing.service';
import { PlatformMarketingDripService } from './platform-marketing-drip.service';
import { PlatformMarketingDripSchedulerService } from './platform-marketing-drip-scheduler.service';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { PlatformMessagingService } from './platform-messaging.service';
import {
  PlatformMessagingController,
  TenantSupportController,
  UserNotificationsController,
} from './platform-messaging.controller';
import { PlatformAccessService } from './platform-access.service';
import { PlatformPermissionGuard } from './platform-permission.guard';
import { PlatformTeamService } from './platform-team.service';
import { PlatformTeamController } from './platform-team.controller';

@Module({
  imports: [MembershipModule, UploadsModule],
  controllers: [
    PlatformController,
    PlatformMarketingController,
    PlatformAnalyticsController,
    PlatformMessagingController,
    TenantSupportController,
    UserNotificationsController,
    PlatformTeamController,
  ],
  providers: [
    PlatformService,
    PlatformProvisioningService,
    PlatformMarketingService,
    PlatformMarketingDripService,
    PlatformMarketingDripSchedulerService,
    PlatformAnalyticsService,
    PlatformMessagingService,
    PlatformAccessService,
    PlatformPermissionGuard,
    PlatformTeamService,
  ],
  exports: [
    PlatformService,
    PlatformMarketingService,
    PlatformMarketingDripService,
    PlatformAnalyticsService,
    PlatformMessagingService,
    PlatformAccessService,
    PlatformPermissionGuard,
  ],
})
export class PlatformModule {}

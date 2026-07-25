import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
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

@Module({
  imports: [MembershipModule],
  controllers: [
    PlatformController,
    PlatformMarketingController,
    PlatformAnalyticsController,
    PlatformMessagingController,
    TenantSupportController,
    UserNotificationsController,
  ],
  providers: [
    PlatformService,
    PlatformProvisioningService,
    PlatformMarketingService,
    PlatformMarketingDripService,
    PlatformMarketingDripSchedulerService,
    PlatformAnalyticsService,
    PlatformMessagingService,
  ],
  exports: [
    PlatformService,
    PlatformMarketingService,
    PlatformMarketingDripService,
    PlatformAnalyticsService,
    PlatformMessagingService,
  ],
})
export class PlatformModule {}

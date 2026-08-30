import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MarketingInboundModule } from '../marketing-inbound/marketing-inbound.module';
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
import { PlatformCmsService } from './platform-cms.service';
import { PlatformCmsController } from './platform-cms.controller';
import { PlatformPrivacyService } from './platform-privacy.service';
import {
  PlatformPrivacyController,
  PrivacySelfServiceController,
} from './platform-privacy.controller';
import { PlatformWhatsAppConfigModule } from './platform-whatsapp-config.module';
import { PlatformWhatsAppController } from './platform-whatsapp.controller';

@Module({
  imports: [MembershipModule, UploadsModule, PlatformWhatsAppConfigModule, MarketingInboundModule],
  controllers: [
    PlatformController,
    PlatformMarketingController,
    PlatformAnalyticsController,
    PlatformMessagingController,
    TenantSupportController,
    UserNotificationsController,
    PlatformTeamController,
    PlatformCmsController,
    PlatformPrivacyController,
    PrivacySelfServiceController,
    PlatformWhatsAppController,
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
    PlatformCmsService,
    PlatformPrivacyService,
  ],
  exports: [
    PlatformService,
    PlatformMarketingService,
    PlatformMarketingDripService,
    PlatformAnalyticsService,
    PlatformMessagingService,
    PlatformAccessService,
    PlatformPermissionGuard,
    PlatformCmsService,
    PlatformPrivacyService,
    PlatformWhatsAppConfigModule,
  ],
})
export class PlatformModule {}

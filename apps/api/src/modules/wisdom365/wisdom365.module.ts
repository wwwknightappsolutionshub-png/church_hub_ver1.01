import { Module } from '@nestjs/common';
import { Wisdom365Controller } from './wisdom365.controller';
import { Wisdom365PlatformController } from './wisdom365-platform.controller';
import { Wisdom365AccessService } from './wisdom365-access.service';
import { Wisdom365SubscriptionService } from './wisdom365-subscription.service';
import { Wisdom365ContentService } from './wisdom365-content.service';
import { Wisdom365StripeService } from './wisdom365-stripe.service';
import { Wisdom365AdminService } from './wisdom365-admin.service';
import { Wisdom365InsightsService } from './wisdom365-insights.service';

@Module({
  controllers: [Wisdom365Controller, Wisdom365PlatformController],
  providers: [
    Wisdom365AccessService,
    Wisdom365SubscriptionService,
    Wisdom365ContentService,
    Wisdom365StripeService,
    Wisdom365AdminService,
    Wisdom365InsightsService,
  ],
  exports: [Wisdom365AccessService, Wisdom365SubscriptionService, Wisdom365ContentService],
})
export class Wisdom365Module {}

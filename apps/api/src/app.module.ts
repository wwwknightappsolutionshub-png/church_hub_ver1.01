import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChurchesModule } from './modules/churches/churches.module';
import { AccessModule } from './modules/access/access.module';
import { MembershipModule } from './modules/membership/membership.module';
import { FollowUpModule } from './modules/follow-up/follow-up.module';
import { PastoralCareModule } from './modules/pastoral-care/pastoral-care.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { YouthModule } from './modules/youth/youth.module';
import { BusinessModule } from './modules/business/business.module';
import { BusModule } from './modules/bus/bus.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ChurchStaffModule } from './modules/church-staff/church-staff.module';
import { LoungeModule } from './modules/lounge/lounge.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ServiceUnitsModule } from './modules/service-units/service-units.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { AutomationModule } from './modules/automation/automation.module';
import { CommunityHubModule } from './modules/community-hub/community-hub.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { RtpModule } from './modules/rtp/rtp.module';
import { DevotionalHubModule } from './modules/devotional-hub/devotional-hub.module';
import { MemberProfileModule } from './modules/member-profile/member-profile.module';
import { CommunitySupportModule } from './modules/community-support/community-support.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthModule } from './modules/health/health.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SermonNotesModule } from './modules/sermon-notes/sermon-notes.module';
import { Wisdom365Module } from './modules/wisdom365/wisdom365.module';
import { MinistryCellsModule } from './modules/ministry-cells/ministry-cells.module';
import { ChurchCalendarModule } from './modules/church-calendar/church-calendar.module';
import { MarketingTrialModule } from './modules/marketing-trial/marketing-trial.module';
import { MarketingInboundModule } from './modules/marketing-inbound/marketing-inbound.module';
import { GeoModule } from './modules/geo/geo.module';
import { CacheModule } from './common/cache/cache.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { resolveRedisConnection } from './common/redis/redis-connection';

const redisEnabled = process.env.REDIS_ENABLED !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Root .env first so empty SMTP_* in apps/api/.env cannot block Hostinger settings.
      // Nest only assigns keys that are not already set on process.env.
      envFilePath: ['../../.env', '../.env', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
      },
    ]),
    CacheModule,
    ObservabilityModule,
    ...(redisEnabled
      ? [
          BullModule.forRoot({
            connection: resolveRedisConnection({ maxRetriesPerRequest: null }),
          }),
        ]
      : []),
    PrismaModule,
    AccessModule,
    HealthModule,
    UploadsModule,
    AuthModule,
    NotificationsModule.forRoot(),
    ChurchesModule,
    MembershipModule,
    FollowUpModule,
    PastoralCareModule,
    OutreachModule,
    YouthModule,
    DepartmentsModule,
    ServiceUnitsModule,
    AutomationModule,
    CommunityHubModule,
    SuggestionsModule,
    RtpModule,
    DevotionalHubModule,
    MemberProfileModule,
    CommunitySupportModule,
    BusinessModule,
    BusModule,
    CommunicationsModule,
    AdminModule,
    PlatformModule,
    ChurchStaffModule,
    LoungeModule,
    RealtimeModule,
    SermonNotesModule,
    Wisdom365Module,
    MinistryCellsModule,
    ChurchCalendarModule,
    MarketingTrialModule,
    MarketingInboundModule,
    GeoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

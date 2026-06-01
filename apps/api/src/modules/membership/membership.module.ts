import { Module } from '@nestjs/common';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { MembershipImportController } from './membership-import.controller';
import { MembershipImportService } from './membership-import.service';
import { MembershipAccessService } from './membership-access.service';
import { MembershipConfigService } from './membership-config.service';
import { MembershipActivityService } from './membership-activity.service';
import { MembershipClassesService } from './membership-classes.service';
import { MembershipAttendanceService } from './membership-attendance.service';
import { MembershipTimelineService } from './membership-timeline.service';
import { MembershipAnalyticsService } from './membership-analytics.service';

@Module({
  imports: [FollowUpModule],
  controllers: [MembershipController, MembershipImportController],
  providers: [
    MembershipImportService,
    MembershipService,
    MembershipAccessService,
    MembershipConfigService,
    MembershipActivityService,
    MembershipClassesService,
    MembershipAttendanceService,
    MembershipTimelineService,
    MembershipAnalyticsService,
  ],
  exports: [
    MembershipService,
    MembershipAccessService,
    MembershipConfigService,
    MembershipActivityService,
    MembershipClassesService,
    MembershipAttendanceService,
    MembershipTimelineService,
    MembershipAnalyticsService,
  ],
})
export class MembershipModule {}

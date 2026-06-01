import { Module } from '@nestjs/common';
import { ChurchesService } from './churches.service';
import { ChurchesController } from './churches.controller';
import { ChurchLandingPublicController } from './church-landing-public.controller';
import { ChurchLandingAdminController } from './church-landing-admin.controller';
import { LandingPageService } from './landing-page.service';
import { LandingMembershipService } from './landing-membership.service';
import { MembershipModule } from '../membership/membership.module';
import { ServiceUnitsModule } from '../service-units/service-units.module';
import { CommunitySupportModule } from '../community-support/community-support.module';

@Module({
  imports: [MembershipModule, ServiceUnitsModule, CommunitySupportModule],
  controllers: [ChurchesController, ChurchLandingPublicController, ChurchLandingAdminController],
  providers: [ChurchesService, LandingPageService, LandingMembershipService],
  exports: [ChurchesService, LandingPageService, LandingMembershipService],
})
export class ChurchesModule {}

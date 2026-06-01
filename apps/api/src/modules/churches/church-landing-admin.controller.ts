import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { LandingTemplateId } from '@church-hub/shared-types';
import { ChurchId } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';
import { LandingMembershipService } from './landing-membership.service';
import { LandingPageService } from './landing-page.service';

/**
 * Admin CRUD for public landing membership form (dedicated controller for reliable routing).
 */
@ApiTags('church-landing-admin')
@Controller('church-landing/admin')
export class ChurchLandingAdminController {
  constructor(
    private readonly landingMembership: LandingMembershipService,
    private readonly landingPage: LandingPageService,
  ) {}

  @Get('landing')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Get church landing page settings (admin)' })
  getLandingAdmin(@ChurchId() churchId: string) {
    return this.landingPage.getAdmin(churchId);
  }

  @Patch('landing')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Save and publish church landing page (admin)' })
  updateLanding(@ChurchId() churchId: string, @Body() body: unknown) {
    return this.landingPage.update(churchId, body);
  }

  @Patch('landing/branding')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Update church landing public domain and logo (admin)' })
  updateLandingBranding(@ChurchId() churchId: string, @Body() body: unknown) {
    return this.landingPage.updateBranding(churchId, body);
  }

  @Post('landing/apply-template')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Reset landing content to a standard template (admin)' })
  applyTemplate(@ChurchId() churchId: string, @Body() body: { templateId: LandingTemplateId }) {
    return this.landingPage.applyTemplate(churchId, body.templateId);
  }

  @Get('membership-form')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Get public membership registration form settings (admin)' })
  getMembershipFormAdmin(@ChurchId() churchId: string) {
    return this.landingMembership.getAdminForm(churchId);
  }

  @Patch('membership-form')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Update public membership registration form (admin)' })
  updateMembershipForm(@ChurchId() churchId: string, @Body() body: unknown) {
    return this.landingMembership.updateAdminForm(churchId, body);
  }

  @Post('membership-form/reset')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Create / reset membership form to factory defaults (admin)' })
  resetMembershipForm(@ChurchId() churchId: string) {
    return this.landingMembership.resetAdminForm(churchId);
  }
}

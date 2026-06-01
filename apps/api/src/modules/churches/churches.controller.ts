import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PublicMembershipRegisterDto } from './dto/public-membership-register.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChurchesService } from './churches.service';
import { LandingPageService } from './landing-page.service';
import { LandingMembershipService } from './landing-membership.service';
import { ChurchId } from '../auth/current-user.decorator';
import { Public, Roles } from '../auth/decorators';
import type { LandingTemplateId } from '@church-hub/shared-types';

@ApiTags('churches')
@Controller('churches')
export class ChurchesController {
  constructor(
    private readonly churchesService: ChurchesService,
    private readonly landingPageService: LandingPageService,
    private readonly landingMembershipService: LandingMembershipService,
  ) {}

  @Get('landing/admin')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Get church landing page settings (admin)' })
  getLandingAdmin(@ChurchId() churchId: string) {
    return this.landingPageService.getAdmin(churchId);
  }

  @Get('landing/membership-form/admin')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Get public membership registration form settings (admin)' })
  getMembershipFormAdmin(@ChurchId() churchId: string) {
    return this.landingMembershipService.getAdminForm(churchId);
  }

  @Patch('landing/membership-form')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Update public membership registration form (admin CRUD)' })
  updateMembershipForm(@ChurchId() churchId: string, @Body() body: unknown) {
    return this.landingMembershipService.updateAdminForm(churchId, body);
  }

  @Post('landing/membership-form/reset')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Create / reset membership form to factory defaults (admin)' })
  resetMembershipForm(@ChurchId() churchId: string) {
    return this.landingMembershipService.resetAdminForm(churchId);
  }

  @Patch('landing')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Update church landing page content (admin CRUD)' })
  updateLanding(@ChurchId() churchId: string, @Body() body: unknown) {
    return this.landingPageService.update(churchId, body);
  }

  @Patch('landing/branding')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Update church landing public domain and logo (admin)' })
  updateLandingBranding(@ChurchId() churchId: string, @Body() body: unknown) {
    return this.landingPageService.updateBranding(churchId, body);
  }

  @Post('landing/apply-template')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Reset landing content to a standard template (admin)' })
  applyTemplate(@ChurchId() churchId: string, @Body() body: { templateId: LandingTemplateId }) {
    return this.landingPageService.applyTemplate(churchId, body.templateId);
  }

  @Patch('settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update church settings' })
  updateSettings(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.churchesService.updateSettings(churchId, body);
  }

  @Public()
  @Get(':slug/landing')
  @ApiOperation({ summary: 'Public church landing page' })
  getPublicLanding(@Param('slug') slug: string) {
    return this.landingPageService.getPublicBySlug(slug);
  }

  @Public()
  @Get(':slug/membership/form')
  @ApiOperation({ summary: 'Public membership form config and service units' })
  getPublicMembershipForm(@Param('slug') slug: string) {
    return this.landingMembershipService.getPublicForm(slug);
  }

  @Public()
  @Post(':slug/membership/register')
  @ApiOperation({ summary: 'Register membership from public landing page' })
  registerMembership(
    @Param('slug') slug: string,
    @Body() body: PublicMembershipRegisterDto,
  ) {
    return this.landingMembershipService.registerFromLanding(slug, body);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get church by slug (public)' })
  getBySlug(@Param('slug') slug: string) {
    return this.churchesService.getBySlug(slug);
  }
}

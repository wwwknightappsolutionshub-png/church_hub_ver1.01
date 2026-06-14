import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembershipRegistryService } from './membership-registry.service';
import { ChurchId } from '../auth/current-user.decorator';
import { MemberAdmin, Roles } from '../auth/decorators';

@ApiTags('membership')
@ApiBearerAuth()
@Controller('membership/registry')
export class MembershipRegistryController {
  constructor(private readonly registry: MembershipRegistryService) {}

  @Get('catalog')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Classifications, family roles, custom fields, and properties' })
  getCatalog(@ChurchId() churchId: string) {
    return this.registry.getRegistryCatalog(churchId);
  }

  /** Admin settings — includes inactive definitions. */
  @Get('admin-catalog')
  @MemberAdmin()
  @ApiOperation({ summary: 'Full registry catalog for admin settings (includes inactive)' })
  getAdminCatalog(@ChurchId() churchId: string) {
    return this.registry.getAdminCatalog(churchId);
  }

  @Post('seed-defaults')
  @MemberAdmin()
  seedDefaults(@ChurchId() churchId: string) {
    return this.registry.ensureRegistryDefaults(churchId);
  }

  @Post('classifications')
  @MemberAdmin()
  createClassification(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.registry.createClassification(
      churchId,
      body as Parameters<MembershipRegistryService['createClassification']>[1],
    );
  }

  @Patch('classifications/:id')
  @MemberAdmin()
  updateClassification(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.registry.updateClassification(
      churchId,
      id,
      body as Parameters<MembershipRegistryService['updateClassification']>[2],
    );
  }

  @Post('family-roles')
  @MemberAdmin()
  createFamilyRole(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.registry.createFamilyRole(
      churchId,
      body as Parameters<MembershipRegistryService['createFamilyRole']>[1],
    );
  }

  @Patch('family-roles/:id')
  @MemberAdmin()
  updateFamilyRole(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.registry.updateFamilyRole(
      churchId,
      id,
      body as Parameters<MembershipRegistryService['updateFamilyRole']>[2],
    );
  }

  @Post('member-custom-fields')
  @MemberAdmin()
  createMemberCustomField(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.registry.createMemberCustomField(
      churchId,
      body as Parameters<MembershipRegistryService['createMemberCustomField']>[1],
    );
  }

  @Post('family-custom-fields')
  @MemberAdmin()
  createFamilyCustomField(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.registry.createFamilyCustomField(
      churchId,
      body as Parameters<MembershipRegistryService['createFamilyCustomField']>[1],
    );
  }

  @Post('member-properties')
  @MemberAdmin()
  createMemberProperty(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.registry.createMemberProperty(
      churchId,
      body as Parameters<MembershipRegistryService['createMemberProperty']>[1],
    );
  }

  @Post('family-properties')
  @MemberAdmin()
  createFamilyProperty(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.registry.createFamilyProperty(
      churchId,
      body as Parameters<MembershipRegistryService['createFamilyProperty']>[1],
    );
  }

  @Patch('member-custom-fields/:id')
  @MemberAdmin()
  updateMemberCustomField(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.registry.updateMemberCustomField(
      churchId,
      id,
      body as Parameters<MembershipRegistryService['updateMemberCustomField']>[2],
    );
  }

  @Patch('family-custom-fields/:id')
  @MemberAdmin()
  updateFamilyCustomField(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.registry.updateFamilyCustomField(
      churchId,
      id,
      body as Parameters<MembershipRegistryService['updateFamilyCustomField']>[2],
    );
  }

  @Patch('member-properties/:id')
  @MemberAdmin()
  updateMemberProperty(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.registry.updateMemberProperty(
      churchId,
      id,
      body as Parameters<MembershipRegistryService['updateMemberProperty']>[2],
    );
  }

  @Patch('family-properties/:id')
  @MemberAdmin()
  updateFamilyProperty(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.registry.updateFamilyProperty(
      churchId,
      id,
      body as Parameters<MembershipRegistryService['updateFamilyProperty']>[2],
    );
  }

  @Get('congregant-analytics')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Congregant breakdown charts for membership dashboard' })
  getCongregantAnalytics(@ChurchId() churchId: string) {
    return this.registry.getCongregantAnalytics(churchId);
  }

  @Get('email-links')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Mailto links for Email All and Email BCC' })
  getEmailLinks(@ChurchId() churchId: string) {
    return this.registry.getEmailLinks(churchId);
  }

  @Post('send-email')
  @MemberAdmin()
  @ApiOperation({ summary: 'Send HTML email to congregants (direct delivery)' })
  sendEmail(
    @ChurchId() churchId: string,
    @Body()
    body: {
      subject: string;
      bodyHtml: string;
      mode?: 'all' | 'bcc';
      familyRoleName?: string;
    },
  ) {
    return this.registry.sendCongregantEmail(churchId, {
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      mode: body.mode ?? 'bcc',
      familyRoleName: body.familyRoleName,
    });
  }
}

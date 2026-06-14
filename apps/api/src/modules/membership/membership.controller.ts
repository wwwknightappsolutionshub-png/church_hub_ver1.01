import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberRoleType, MemberStatus } from '@prisma/client';
import { AttendanceScope, ClassEnrollmentStatus } from '@prisma/client';
import { MembershipService } from './membership.service';
import { MembershipConfigService } from './membership-config.service';
import { MembershipActivityService } from './membership-activity.service';
import { MembershipClassesService } from './membership-classes.service';
import { MembershipAttendanceService } from './membership-attendance.service';
import { MembershipTimelineService } from './membership-timeline.service';
import { MembershipAnalyticsService } from './membership-analytics.service';
import { MembershipCelebrationsService } from './membership-celebrations.service';
import { MembershipFamilyMapService } from './membership-family-map.service';
import { AuthUser, ChurchId, CurrentUser } from '../auth/current-user.decorator';
import { MemberAdmin, Roles } from '../auth/decorators';

@ApiTags('membership')
@ApiBearerAuth()
@Controller('membership')
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly membershipConfig: MembershipConfigService,
    private readonly membershipActivity: MembershipActivityService,
    private readonly membershipClasses: MembershipClassesService,
    private readonly membershipAttendance: MembershipAttendanceService,
    private readonly membershipTimeline: MembershipTimelineService,
    private readonly membershipAnalytics: MembershipAnalyticsService,
    private readonly membershipCelebrations: MembershipCelebrationsService,
    private readonly membershipFamilyMap: MembershipFamilyMapService,
  ) {}

  @Get('catalog')
  getCatalog() {
    return this.membershipService.getCatalog();
  }

  @Get('stats')
  getStats(@ChurchId() churchId: string) {
    return this.membershipService.getStats(churchId);
  }

  @Get('members')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'List church members' })
  listMembers(
    @ChurchId() churchId: string,
    @Query('status') status?: MemberStatus,
    @Query('search') search?: string,
    @Query('role') role?: MemberRoleType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '25', 10) || 25));
      return this.membershipService.listMembersPaginated(churchId, {
        status,
        search,
        role,
        page: pageNum,
        limit: limitNum,
      });
    }
    return this.membershipService.listMembers(churchId, { status, search, role });
  }

  @Get('members/:id')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  getMember(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.membershipService.getMember(churchId, id);
  }

  @Post('members')
  @MemberAdmin()
  createMember(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.membershipService.createMember(
      churchId,
      { ...body, startOnboarding: body.startOnboarding ?? false } as Parameters<
        MembershipService['createMember']
      >[1],
    );
  }

  @Patch('members/:id')
  @MemberAdmin()
  updateMember(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.updateMember(
      churchId,
      id,
      body as Parameters<MembershipService['updateMember']>[2],
      user.userId,
    );
  }

  @Delete('members/:id')
  @MemberAdmin()
  @ApiOperation({ summary: 'Remove a member record (Member Admin only)' })
  deleteMember(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.deleteMember(churchId, id, user.userId);
  }

  @Patch('members/:id/status')
  @MemberAdmin()
  setStatus(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { status: MemberStatus },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.setStatus(churchId, id, body.status, user.userId);
  }

  @Post('members/:id/status/advance')
  @MemberAdmin()
  advanceStatus(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.advanceStatus(churchId, id, user.userId);
  }

  @Patch('members/:id/onboarding')
  @MemberAdmin()
  saveOnboarding(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { step: number; data?: Record<string, unknown> },
  ) {
    return this.membershipService.saveOnboardingStep(
      churchId,
      id,
      body.step,
      (body.data ?? {}) as Parameters<MembershipService['saveOnboardingStep']>[3],
    );
  }

  @Post('members/:id/onboarding/complete')
  @MemberAdmin()
  completeOnboarding(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.completeOnboarding(churchId, id, user.userId);
  }

  @Get('families')
  listFamilies(
    @ChurchId() churchId: string,
    @Query('search') search?: string,
    @Query('serviceUnitId') serviceUnitId?: string,
  ) {
    return this.membershipService.listFamilies(churchId, { search, serviceUnitId });
  }

  @Post('families')
  @MemberAdmin()
  createFamily(
    @ChurchId() churchId: string,
    @Body()
    body: {
      name: string;
      headMemberId?: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      homePhone?: string;
      email?: string;
      homeCell?: string;
      specialOccasion?: string;
      specialOccasionDate?: string;
      customFields?: Record<string, string | boolean | null>;
      propertyIds?: string[];
    },
    @CurrentUser() user: AuthUser,
  ) {
    const { name, headMemberId, ...rest } = body;
    return this.membershipService.createFamily(
      churchId,
      name,
      headMemberId,
      user.userId,
      rest,
    );
  }

  @Post('members/:id/family')
  @MemberAdmin()
  linkFamily(
    @ChurchId() churchId: string,
    @Param('id') memberId: string,
    @Body() body: { familyId: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.linkFamilyMember(
      churchId,
      memberId,
      body.familyId,
      user.userId,
    );
  }

  @Post('members/:parentId/guardian')
  @MemberAdmin()
  linkGuardian(
    @ChurchId() churchId: string,
    @Param('parentId') parentId: string,
    @Body() body: { childId: string; relation?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.linkParentGuardian(
      churchId,
      parentId,
      body.childId,
      body.relation,
      user.userId,
    );
  }

  @Delete('members/:parentId/guardian/:childId')
  @MemberAdmin()
  removeGuardian(
    @ChurchId() churchId: string,
    @Param('parentId') parentId: string,
    @Param('childId') childId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipService.removeParentGuardianLink(
      churchId,
      parentId,
      childId,
      user.userId,
    );
  }

  @Get('families/:id')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  getFamily(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.membershipService.getFamily(churchId, id);
  }

  @Patch('families/:id')
  @MemberAdmin()
  updateFamily(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.membershipService.updateFamily(
      churchId,
      id,
      body as Parameters<MembershipService['updateFamily']>[2],
    );
  }

  @Get('members/:id/timeline')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  getMemberTimeline(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.membershipTimeline.getMemberTimeline(churchId, id);
  }

  @Get('members/:id/activity')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  listMemberActivity(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.membershipActivity.listForMember(churchId, id);
  }

  @Get('class-enrollments')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  listClassEnrollments(
    @ChurchId() churchId: string,
    @Query('memberId') memberId?: string,
    @Query('classDefinitionId') classDefinitionId?: string,
    @Query('status') status?: ClassEnrollmentStatus,
  ) {
    return this.membershipClasses.listEnrollments(churchId, {
      memberId,
      classDefinitionId,
      status,
    });
  }

  @Post('class-enrollments')
  @MemberAdmin()
  enrollClass(
    @ChurchId() churchId: string,
    @Body()
    body: {
      memberId: string;
      classDefinitionId: string;
      notes?: string;
      status?: ClassEnrollmentStatus;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipClasses.enroll(churchId, body, user.userId);
  }

  @Patch('class-enrollments/:id')
  @MemberAdmin()
  updateClassEnrollment(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { status?: ClassEnrollmentStatus; notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipClasses.updateEnrollment(churchId, id, body, user.userId);
  }

  @Get('attendance')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  listAttendance(
    @ChurchId() churchId: string,
    @Query('memberId') memberId?: string,
    @Query('familyId') familyId?: string,
    @Query('churchServiceId') churchServiceId?: string,
    @Query('serviceUnitId') serviceUnitId?: string,
    @Query('scope') scope?: AttendanceScope,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.membershipAttendance.list(churchId, {
      memberId,
      familyId,
      churchServiceId,
      serviceUnitId,
      scope,
      from,
      to,
    });
  }

  @Post('attendance')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  recordAttendance(
    @ChurchId() churchId: string,
    @Body()
    body: {
      memberId: string;
      scope: AttendanceScope;
      serviceDate: string;
      present?: boolean;
      churchServiceId?: string;
      serviceUnitId?: string;
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipAttendance.recordOne(churchId, body, user.userId);
  }

  @Post('attendance/bulk')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  recordAttendanceBulk(
    @ChurchId() churchId: string,
    @Body()
    body: {
      scope: AttendanceScope;
      serviceDate: string;
      churchServiceId?: string;
      serviceUnitId?: string;
      familyId?: string;
      entries: Array<{ memberId: string; present: boolean; notes?: string }>;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipAttendance.recordBulk(churchId, body, user.userId);
  }

  @Get('attendance/summary/service')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  serviceAttendanceSummary(
    @ChurchId() churchId: string,
    @Query('churchServiceId') churchServiceId: string,
    @Query('serviceDate') serviceDate: string,
  ) {
    return this.membershipAttendance.serviceSummary(churchId, churchServiceId, serviceDate);
  }

  @Get('attendance/summary/family/:familyId')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  familyAttendanceSummary(
    @ChurchId() churchId: string,
    @Param('familyId') familyId: string,
    @Query('serviceDate') serviceDate: string,
  ) {
    return this.membershipAttendance.familySummary(churchId, familyId, serviceDate);
  }

  @Get('church-services')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Fixed service catalog for this church (attendance)' })
  listChurchServices(@ChurchId() churchId: string) {
    return this.membershipConfig.listChurchServices(churchId);
  }

  @Post('church-services')
  @MemberAdmin()
  createChurchService(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.membershipConfig.createChurchService(
      churchId,
      body as Parameters<MembershipConfigService['createChurchService']>[1],
    );
  }

  @Patch('church-services/:id')
  @MemberAdmin()
  updateChurchService(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.membershipConfig.updateChurchService(
      churchId,
      id,
      body as Parameters<MembershipConfigService['updateChurchService']>[2],
    );
  }

  @Delete('church-services/:id')
  @MemberAdmin()
  deleteChurchService(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.membershipConfig.deleteChurchService(churchId, id);
  }

  @Get('class-definitions')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Configurable membership class levels (101–401, etc.)' })
  listClassDefinitions(@ChurchId() churchId: string) {
    return this.membershipConfig.listClassDefinitions(churchId);
  }

  @Post('class-definitions')
  @MemberAdmin()
  createClassDefinition(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.membershipConfig.createClassDefinition(
      churchId,
      body as Parameters<MembershipConfigService['createClassDefinition']>[1],
    );
  }

  @Patch('class-definitions/:id')
  @MemberAdmin()
  updateClassDefinition(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.membershipConfig.updateClassDefinition(
      churchId,
      id,
      body as Parameters<MembershipConfigService['updateClassDefinition']>[2],
    );
  }

  @Delete('class-definitions/:id')
  @MemberAdmin()
  deleteClassDefinition(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.membershipConfig.deleteClassDefinition(churchId, id);
  }

  @Post('config/seed-defaults')
  @MemberAdmin()
  @ApiOperation({ summary: 'Seed default services + class levels for this church' })
  seedConfigDefaults(@ChurchId() churchId: string) {
    return this.membershipConfig.seedChurchDefaults(churchId);
  }

  @Get('weekly-attendance-flow')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Weekly sanctuary headcounts from Ushering service unit' })
  getWeeklyAttendanceFlow(
    @ChurchId() churchId: string,
    @Query('weeks') weeks?: string,
  ) {
    const w = Math.min(12, Math.max(1, parseInt(weeks ?? '6', 10) || 6));
    return this.membershipService.getUsheringWeeklyAttendanceFlow(churchId, w);
  }

  @Get('celebrations')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Upcoming birthdays and special anniversaries' })
  getCelebrations(
    @ChurchId() churchId: string,
    @Query('days') days?: string,
    @Query('birthdaysPage') birthdaysPage?: string,
    @Query('birthdaysLimit') birthdaysLimit?: string,
    @Query('anniversariesPage') anniversariesPage?: string,
    @Query('anniversariesLimit') anniversariesLimit?: string,
  ) {
    const windowDays = Math.min(90, Math.max(7, parseInt(days ?? '30', 10) || 30));
    const parsePage = (v?: string) => Math.max(1, parseInt(v ?? '1', 10) || 1);
    const parseLimit = (v?: string) => Math.min(50, Math.max(1, parseInt(v ?? '8', 10) || 8));
    return this.membershipCelebrations.getCelebrations(churchId, windowDays, {
      birthdaysPage: parsePage(birthdaysPage),
      birthdaysLimit: parseLimit(birthdaysLimit),
      anniversariesPage: parsePage(anniversariesPage),
      anniversariesLimit: parseLimit(anniversariesLimit),
    });
  }

  @Get('family-map')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Geocoded family locations by post code for map display' })
  getFamilyMap(@ChurchId() churchId: string) {
    return this.membershipFamilyMap.getFamilyMapPins(churchId);
  }

  @Get('analytics')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({
    summary: 'Membership analytics dashboard (no giving) — trends, attendance, follow-up',
  })
  getAnalytics(
    @ChurchId() churchId: string,
    @Query('months') months?: string,
  ) {
    const periodMonths = Math.min(12, Math.max(3, parseInt(months ?? '6', 10) || 6));
    return this.membershipAnalytics.getDashboard(churchId, periodMonths);
  }

  @Get('analytics/growth-trends')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Growth trend series (module 9)' })
  async getGrowthTrends(@ChurchId() churchId: string, @Query('months') months?: string) {
    const periodMonths = Math.min(12, Math.max(3, parseInt(months ?? '6', 10) || 6));
    const dashboard = await this.membershipAnalytics.getDashboard(churchId, periodMonths);
    return dashboard.growthTrends;
  }
}

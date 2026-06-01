import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IdeaStatus, MarketplaceItemType, MentorshipStatus } from '@prisma/client';
import { BusinessService } from './business.service';
import { SubmitMentorApplicationDto } from './dto/submit-mentor-application.dto';
import { SubmitMenteeRequestDto } from './dto/submit-mentee-request.dto';
import { RejectMentorApplicationDto } from './dto/reject-mentor-application.dto';
import { CreateMentorByAdminDto } from './dto/create-mentor-by-admin.dto';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';

@ApiTags('business')
@ApiBearerAuth()
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Kingdom Konnect dashboard stats' })
  getStats(@ChurchId() churchId: string) {
    return this.businessService.getStats(churchId);
  }

  @Get('members')
  listMembers(@ChurchId() churchId: string) {
    return this.businessService.listMembersForKonnect(churchId);
  }

  @Get('my-profile')
  getMyProfile(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.businessService.getMyBusinessProfile(churchId, user.userId);
  }

  @Get('profiles')
  listProfiles(
    @ChurchId() churchId: string,
    @Query('verified') verified?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
  ) {
    return this.businessService.listProfiles(churchId, {
      verifiedOnly: verified === 'true',
      category,
      search,
      featured: featured === 'true',
    });
  }

  @Get('profiles/:id')
  getProfile(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.businessService.getProfile(churchId, id);
  }

  @Post('profiles')
  createProfile(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.businessService.createProfile(churchId, body as Parameters<BusinessService['createProfile']>[1]);
  }

  @Patch('profiles/:id')
  updateProfile(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.businessService.updateProfile(churchId, id, body as Parameters<BusinessService['updateProfile']>[2]);
  }

  @Patch('profiles/:id/verify')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  verify(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { status: 'VERIFIED' | 'REJECTED'; rejectionNote?: string },
  ) {
    return this.businessService.verifyProfile(churchId, id, body.status, body.rejectionNote);
  }

  @Patch('profiles/:id/feature')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  feature(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: { isFeatured: boolean }) {
    return this.businessService.setFeatured(churchId, id, body.isFeatured);
  }

  @Get('marketplace')
  listMarketplace(
    @ChurchId() churchId: string,
    @Query('type') type?: MarketplaceItemType,
    @Query('search') search?: string,
  ) {
    return this.businessService.listMarketplace(churchId, { itemType: type, search });
  }

  @Post('profiles/:businessId/listings')
  createListing(
    @ChurchId() churchId: string,
    @Param('businessId') businessId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.businessService.createListing(churchId, businessId, body as Parameters<BusinessService['createListing']>[2]);
  }

  @Patch('listings/:id')
  updateListing(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.businessService.updateListing(churchId, id, body as Parameters<BusinessService['updateListing']>[2]);
  }

  @Delete('listings/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteListing(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.businessService.deleteListing(churchId, id);
  }

  @Get('jobs')
  listJobs(@ChurchId() churchId: string) {
    return this.businessService.listJobs(churchId);
  }

  @Post('jobs')
  createJob(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.businessService.createJob(churchId, body as Parameters<BusinessService['createJob']>[1]);
  }

  @Patch('jobs/:id')
  updateJob(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.businessService.updateJob(churchId, id, body as Parameters<BusinessService['updateJob']>[2]);
  }

  @Delete('jobs/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteJob(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.businessService.deleteJob(churchId, id);
  }

  @Get('events')
  listEvents(@ChurchId() churchId: string, @Query('upcoming') upcoming?: string) {
    return this.businessService.listEvents(churchId, upcoming === 'true');
  }

  @Post('events')
  createEvent(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.businessService.createEvent(churchId, body as Parameters<BusinessService['createEvent']>[1]);
  }

  @Patch('events/:id')
  @Roles('ADMIN', 'PASTOR')
  updateEvent(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.businessService.updateEvent(churchId, id, body as Parameters<BusinessService['updateEvent']>[2]);
  }

  @Delete('events/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteEvent(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.businessService.deleteEvent(churchId, id);
  }

  @Post('events/:eventId/rsvp')
  rsvp(
    @ChurchId() churchId: string,
    @Param('eventId') eventId: string,
    @Body() body: { memberId: string; status?: string },
  ) {
    return this.businessService.rsvpEvent(churchId, eventId, body.memberId, body.status);
  }

  @Get('mentorships')
  listMentorships(@ChurchId() churchId: string, @Query('status') status?: MentorshipStatus) {
    return this.businessService.listMentorships(churchId, status);
  }

  @Post('mentorships')
  @Roles('ADMIN', 'PASTOR')
  createMentorship(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.businessService.createMentorship(churchId, body as Parameters<BusinessService['createMentorship']>[1]);
  }

  @Post('mentor-applications')
  submitMentorApplication(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: SubmitMentorApplicationDto,
  ) {
    return this.businessService.submitMentorApplication(churchId, user.userId, body);
  }

  @Get('mentor-applications/manage')
  @Roles('ADMIN', 'PASTOR')
  listMentorsManage(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.businessService.listMentorsManage(churchId, user.userId);
  }

  @Get('mentor-applications')
  @Roles('ADMIN', 'PASTOR')
  listMentorApplications(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.businessService.listMentorApplicationsAdmin(churchId, user.userId, status);
  }

  @Patch('mentor-applications/:id/approve')
  @Roles('ADMIN', 'PASTOR')
  approveMentorApplication(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.businessService.approveMentorApplication(churchId, user.userId, id);
  }

  @Patch('mentor-applications/:id/reject')
  @Roles('ADMIN', 'PASTOR')
  rejectMentorApplication(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: RejectMentorApplicationDto,
  ) {
    return this.businessService.rejectMentorApplication(churchId, user.userId, id, body.note);
  }

  @Post('mentors')
  @Roles('ADMIN', 'PASTOR')
  createMentor(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMentorByAdminDto,
  ) {
    return this.businessService.createMentorByAdmin(churchId, user.userId, body);
  }

  @Get('mentors')
  listPublicMentors(@ChurchId() churchId: string) {
    return this.businessService.listPublicMentors(churchId);
  }

  @Post('mentee-requests')
  submitMenteeRequest(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: SubmitMenteeRequestDto,
  ) {
    return this.businessService.submitMenteeRequest(churchId, user.userId, body);
  }

  @Get('mentee-requests')
  listMenteeRequests(@ChurchId() churchId: string) {
    return this.businessService.listPublicMenteeRequests(churchId);
  }

  @Post('mentors/:mentorProfileId/connect')
  requestMentorConnection(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('mentorProfileId') mentorProfileId: string,
    @Body() body: { goals?: string },
  ) {
    return this.businessService.requestMentorConnection(
      churchId,
      user.userId,
      mentorProfileId,
      body.goals,
    );
  }

  @Patch('mentorships/:id')
  updateMentorship(@ChurchId() churchId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.businessService.updateMentorship(
      churchId,
      id,
      body as Parameters<BusinessService['updateMentorship']>[2],
    );
  }

  @Get('ideas')
  listIdeas(@ChurchId() churchId: string) {
    return this.businessService.listIdeas(churchId);
  }

  @Post('ideas')
  createIdea(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { title: string; description: string; category?: string },
  ) {
    return this.businessService.createIdea(churchId, user.userId, body);
  }

  @Post('ideas/:id/messages')
  addIdeaMessage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.businessService.addIdeaMessage(churchId, user.userId, id, body.body);
  }

  @Patch('ideas/:id/status')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  updateIdeaStatus(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: { status: IdeaStatus },
  ) {
    return this.businessService.updateIdeaStatus(churchId, id, body.status);
  }
}

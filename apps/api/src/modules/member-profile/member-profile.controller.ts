import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MemberProfileService } from './member-profile.service';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate } from '../auth/decorators';

@ApiTags('member-profile')
@ApiBearerAuth()
@ModuleGate('profile')
@Controller('member-profile')
export class MemberProfileController {
  constructor(private readonly profiles: MemberProfileService) {}

  @Get('messages/inbox')
  listMessages(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.profiles.listMessages(churchId, user.userId);
  }

  @Post('messages')
  send(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { recipientId: string; subject?: string; body: string },
  ) {
    return this.profiles.sendMessage(churchId, user.userId, body);
  }

  @Patch('messages/:id')
  updateMessage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { subject?: string; body?: string; readAt?: string },
  ) {
    return this.profiles.updateMessage(churchId, user.userId, id, body);
  }

  @Delete('messages/:id')
  deleteMessage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.profiles.deleteMessage(churchId, user.userId, id);
  }

  @Get('me')
  getMe(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.profiles.getMyProfile(churchId, user.userId);
  }

  @Get(':memberId/message-recipients')
  recipients(@ChurchId() churchId: string, @Param('memberId') memberId: string) {
    return this.profiles.listMessageRecipients(churchId, memberId);
  }

  @Get(':memberId')
  getOne(@ChurchId() churchId: string, @Param('memberId') memberId: string) {
    return this.profiles.getProfile(churchId, memberId);
  }

  @Patch(':memberId')
  update(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberProfileDto,
  ) {
    return this.profiles.updateProfile(churchId, memberId, user.userId, body);
  }

  @Patch(':memberId/business')
  upsertBusiness(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body()
    body: {
      businessName: string;
      tagline?: string;
      description?: string;
      category?: string;
      website?: string;
      phone?: string;
      email?: string;
    },
  ) {
    return this.profiles.upsertBusiness(churchId, memberId, user.userId, body);
  }
}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoungeService } from './lounge.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate } from '../auth/decorators';

@ApiTags('lounge')
@ApiBearerAuth()
@ModuleGate('profile')
@Controller('lounge')
export class LoungeController {
  constructor(private readonly lounge: LoungeService) {}

  @Get('members')
  async listMembers(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    const viewerId = await this.lounge.viewerMemberId(churchId, user.userId);
    return this.lounge.listMembers(churchId, viewerId);
  }

  @Get('presence')
  presence(@ChurchId() churchId: string) {
    return this.lounge.getPresence(churchId);
  }

  @Post('presence/heartbeat')
  heartbeat(
    @ChurchId() churchId: string,
    @Body() body: { memberId: string },
  ) {
    return this.lounge.heartbeat(churchId, body.memberId);
  }

  @Post('connect/:memberId')
  connect(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
  ) {
    return this.lounge.requestConnect(churchId, user.userId, memberId);
  }
}

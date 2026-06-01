import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { YouthEventsService } from './events.service';
import { ChurchId, CurrentUser, AuthUser } from '../../auth/current-user.decorator';
import { Roles, ModuleGate } from '../../auth/decorators';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@Controller('youth/events')
export class YouthEventsController {
  constructor(private readonly events: YouthEventsService) {}

  @Get()
  listEvents(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.events.listEvents(churchId, {
      upcomingOnly: upcoming === 'true',
      userId: user.userId,
    });
  }

  @Get(':eventId/friends-attending')
  @ApiOperation({ summary: 'Peers from shared youth groups who are going (public RSVPs)' })
  friendsAttending(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
  ) {
    return this.events.getFriendsAttending(churchId, user.userId, eventId);
  }

  @Get(':eventId')
  getEvent(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
  ) {
    return this.events.getEvent(churchId, eventId, user.userId);
  }

  @Post()
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  createEvent(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.events.createEvent(
      churchId,
      body as Parameters<YouthEventsService['createEvent']>[1],
    );
  }

  @Patch(':eventId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  updateEvent(
    @ChurchId() churchId: string,
    @Param('eventId') eventId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.events.updateEvent(
      churchId,
      eventId,
      body as Parameters<YouthEventsService['updateEvent']>[2],
    );
  }

  @Delete(':eventId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  deleteEvent(@ChurchId() churchId: string, @Param('eventId') eventId: string) {
    return this.events.deleteEvent(churchId, eventId);
  }

  @Post(':eventId/rsvp')
  rsvp(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body()
    body: {
      status?: string;
      visibility?: string;
      memberId?: string;
    },
  ) {
    if (body.memberId) {
      return this.events.rsvp(
        churchId,
        eventId,
        body.memberId,
        body.status ?? 'GOING',
        body.visibility ?? 'PUBLIC',
      );
    }
    return this.events.rsvpAsUser(
      churchId,
      user.userId,
      eventId,
      body.status ?? 'GOING',
      body.visibility ?? 'PUBLIC',
    );
  }

  @Post(':eventId/check-in')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  checkIn(
    @ChurchId() churchId: string,
    @Param('eventId') eventId: string,
    @Body() body: { memberId: string },
  ) {
    return this.events.checkInAttendance(churchId, eventId, body.memberId);
  }
}

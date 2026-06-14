import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, ChurchId, CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';
import { ChurchCalendarService } from './church-calendar.service';

@ApiTags('church-calendar')
@ApiBearerAuth()
@Controller('church-calendar')
export class ChurchCalendarController {
  constructor(private readonly calendar: ChurchCalendarService) {}

  @Get('feed')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'MEMBER')
  @ApiOperation({ summary: 'Calendar feed (events, birthdays, anniversaries)' })
  getFeed(
    @ChurchId() churchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to
      ? new Date(to)
      : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    return this.calendar.getFeed(churchId, start, end);
  }

  @Post('events')
  @Roles('ADMIN', 'PASTOR')
  createEvent(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      description?: string;
      startsAt: string;
      endsAt?: string;
      allDay?: boolean;
      isPinned?: boolean;
      highlightColor?: string;
    },
  ) {
    return this.calendar.createEvent(churchId, user.userId, body);
  }

  @Patch('events/:id')
  @Roles('ADMIN', 'PASTOR')
  updateEvent(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      description: string | null;
      startsAt: string;
      endsAt: string | null;
      allDay: boolean;
      isPinned: boolean;
      highlightColor: string | null;
    }>,
  ) {
    return this.calendar.updateEvent(churchId, id, body);
  }

  @Delete('events/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteEvent(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.calendar.deleteEvent(churchId, id);
  }
}

import { BadRequestException, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateChurchCalendarEventSchema,
  UpdateChurchCalendarEventSchema,
  type CreateChurchCalendarEventInput,
  type UpdateChurchCalendarEventInput,
} from '@church-hub/shared-types';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
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
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('from/to must be valid dates');
    }
    if (end.getTime() < start.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }
    // Cap feed window to 93 days to limit PII/celebration scrape volume.
    const maxMs = 93 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxMs) {
      throw new BadRequestException('Date range cannot exceed 93 days');
    }
    return this.calendar.getFeed(churchId, start, end);
  }

  @Post('events')
  @Roles('ADMIN', 'PASTOR')
  createEvent(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(CreateChurchCalendarEventSchema) body: CreateChurchCalendarEventInput,
  ) {
    return this.calendar.createEvent(churchId, user.userId, body);
  }

  @Patch('events/:id')
  @Roles('ADMIN', 'PASTOR')
  updateEvent(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @ZodBody(UpdateChurchCalendarEventSchema) body: UpdateChurchCalendarEventInput,
  ) {
    return this.calendar.updateEvent(churchId, id, body);
  }

  @Delete('events/:id')
  @Roles('ADMIN', 'PASTOR')
  deleteEvent(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.calendar.deleteEvent(churchId, id);
  }
}

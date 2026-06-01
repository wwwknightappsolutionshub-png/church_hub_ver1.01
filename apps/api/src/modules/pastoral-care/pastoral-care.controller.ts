import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CarePrayerStatus, CounselingCaseStatus } from '@prisma/client';
import { AuthUser, ChurchId, CurrentUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';
import { PastoralCareService } from './pastoral-care.service';

@ApiTags('pastoral-care')
@ApiBearerAuth()
@ModuleGate('followUp')
@Roles('PASTOR')
@Controller('pastoral-care')
export class PastoralCareController {
  constructor(private readonly pastoral: PastoralCareService) {}

  @Get('stats')
  getStats(@ChurchId() churchId: string) {
    return this.pastoral.getStats(churchId);
  }

  @Get('cases')
  listCases(
    @ChurchId() churchId: string,
    @Query('status') status?: CounselingCaseStatus,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.pastoral.listCases(churchId, { status, assignedToId });
  }

  @Post('cases')
  createCase(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.pastoral.createCase(
      churchId,
      body as Parameters<PastoralCareService['createCase']>[1],
    );
  }

  @Patch('cases/:id')
  updateCase(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.pastoral.updateCase(
      churchId,
      id,
      body as Parameters<PastoralCareService['updateCase']>[2],
    );
  }

  @Post('cases/:id/sessions')
  addSession(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { notes: string; scheduledAt?: string; outcome?: string },
  ) {
    return this.pastoral.addSession(churchId, id, user.userId, body);
  }

  @Get('prayer-requests')
  listPrayers(@ChurchId() churchId: string, @Query('status') status?: CarePrayerStatus) {
    return this.pastoral.listPrayerRequests(churchId, status);
  }

  @Post('prayer-requests')
  createPrayer(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.pastoral.createPrayerRequest(
      churchId,
      body as Parameters<PastoralCareService['createPrayerRequest']>[1],
    );
  }

  @Patch('prayer-requests/:id')
  updatePrayer(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.pastoral.updatePrayerRequest(
      churchId,
      id,
      body as Parameters<PastoralCareService['updatePrayerRequest']>[2],
    );
  }

  @Get('notes')
  @ApiOperation({ summary: 'List pastoral notes (confidential filtered by role)' })
  listNotes(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('followUpId') followUpId?: string,
  ) {
    return this.pastoral.listNotes(churchId, user.userId, { memberId, followUpId });
  }

  @Post('notes')
  addNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      content: string;
      isConfidential?: boolean;
      memberId?: string;
      followUpId?: string;
    },
  ) {
    return this.pastoral.addNote(churchId, user.userId, body);
  }
}

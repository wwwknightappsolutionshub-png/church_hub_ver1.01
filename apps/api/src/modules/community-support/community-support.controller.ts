import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunitySupportStatus } from '@prisma/client';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';
import { CommunitySupportService } from './community-support.service';

@ApiTags('community-support')
@Controller('community-support')
export class CommunitySupportController {
  constructor(private readonly service: CommunitySupportService) {}

  @Post()
  @ApiBearerAuth()
  @ModuleGate('profile')
  submit(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      requestType: 'JOB_SEARCH' | 'BUSINESS_SEARCH';
      title: string;
      description: string;
      location?: string;
      contactEmail?: string;
      contactPhone?: string;
      skills?: string;
    },
  ) {
    return this.service.submit(churchId, user.userId, body);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ModuleGate('profile')
  listMine(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.service.listMine(churchId, user.userId);
  }

  @Get('admin')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  listAdmin(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CommunitySupportStatus,
  ) {
    return this.service.listForAdmin(churchId, user.userId, status);
  }

  @Get('manage')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  listManage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CommunitySupportStatus,
  ) {
    return this.service.listForChurchAdmin(churchId, user.userId, status);
  }

  @Post('manage')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  createManage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      memberId: string;
      requestType: 'JOB_SEARCH' | 'BUSINESS_SEARCH';
      title: string;
      description: string;
      location?: string;
      contactEmail?: string;
      contactPhone?: string;
      skills?: string;
      status?: CommunitySupportStatus;
      validUntil?: string;
    },
  ) {
    return this.service.createByAdmin(churchId, user.userId, body);
  }

  @Patch('manage/:id')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  updateManage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      requestType: 'JOB_SEARCH' | 'BUSINESS_SEARCH';
      title: string;
      description: string;
      location: string;
      contactEmail: string;
      contactPhone: string;
      skills: string;
      status: CommunitySupportStatus;
      validUntil: string | null;
    }>,
  ) {
    return this.service.updateByAdmin(churchId, user.userId, id, body);
  }

  @Delete('manage/:id')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  deleteManage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteByAdmin(churchId, user.userId, id);
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  approve(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { validUntil?: string; validityDays?: number },
  ) {
    return this.service.approve(churchId, user.userId, id, body);
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @Roles('ADMIN', 'PASTOR')
  reject(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.service.reject(churchId, user.userId, id, body.note);
  }
}


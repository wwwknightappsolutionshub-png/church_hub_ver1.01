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
import { RtpFieldType } from '@prisma/client';
import { AuthUser, ChurchId, CurrentUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';
import { RtpService } from './rtp.service';

@ApiTags('rtp')
@ApiBearerAuth()
@ModuleGate('serviceUnitHub')
@Controller('rtp')
export class RtpController {
  constructor(private readonly rtp: RtpService) {}

  @Get('form-fields')
  @ApiOperation({ summary: 'List RTP form field definitions (sample + custom)' })
  listFields(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('all') all?: string,
  ) {
    return this.rtp.listFormFields(user.userId, churchId, all !== '1');
  }

  @Post('form-fields')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a custom RTP form field (church admin)' })
  createField(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      fieldKey: string;
      label: string;
      fieldType?: RtpFieldType;
      sectionKey: string;
      sectionLabel: string;
      sortOrder?: number;
      isRequired?: boolean;
      options?: string[];
    },
  ) {
    return this.rtp.createFormField(user.userId, churchId, body);
  }

  @Patch('form-fields/:fieldId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an RTP form field' })
  updateField(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('fieldId') fieldId: string,
    @Body()
    body: Partial<{
      label: string;
      fieldType: RtpFieldType;
      sectionKey: string;
      sectionLabel: string;
      sortOrder: number;
      isRequired: boolean;
      isActive: boolean;
      options: string[];
    }>,
  ) {
    return this.rtp.updateFormField(user.userId, churchId, fieldId, body);
  }

  @Delete('form-fields/:fieldId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate an RTP form field' })
  deleteField(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('fieldId') fieldId: string,
  ) {
    return this.rtp.deleteFormField(user.userId, churchId, fieldId);
  }

  @Get('requests')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'List all RTP requests for church leadership' })
  listAll(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.rtp.listChurchRequests(user.userId, churchId);
  }

  @Get('units/:serviceUnitId/requests')
  @ApiOperation({ summary: 'List RTP requests for a service unit' })
  listUnit(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('serviceUnitId') serviceUnitId: string,
  ) {
    return this.rtp.listUnitRequests(user.userId, churchId, serviceUnitId);
  }

  @Post('units/:serviceUnitId/requests')
  @ApiOperation({ summary: 'Submit a Request to Purchase from a service unit' })
  submit(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('serviceUnitId') serviceUnitId: string,
    @Body() body: { title?: string; fieldValues: Record<string, unknown> },
  ) {
    return this.rtp.submitRequest(user.userId, churchId, serviceUnitId, body);
  }

  @Post('requests/:id/remind')
  @ApiOperation({ summary: 'Unit admin manual reminder to pastor/church admin' })
  remind(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.rtp.remindLeadership(user.userId, churchId, id);
  }

  @Post('requests/:id/received')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Mark RTP as received → Processing; notify originator' })
  received(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.rtp.markReceived(user.userId, churchId, id);
  }

  @Post('requests/:id/approve')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Approve an RTP request' })
  approve(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.rtp.approve(user.userId, churchId, id);
  }

  @Post('requests/:id/reject')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Reject an RTP request' })
  reject(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.rtp.reject(user.userId, churchId, id, body?.reason);
  }
}

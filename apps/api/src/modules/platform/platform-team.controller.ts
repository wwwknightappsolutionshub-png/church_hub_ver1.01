import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RequirePlatformPermission } from '../auth/decorators';
import { PlatformTeamService } from './platform-team.service';
import {
  CreatePlatformRoleDto,
  InvitePlatformStaffDto,
  UpdatePlatformRoleDto,
  UpdatePlatformStaffDto,
} from './dto/platform-team.dto';

@ApiTags('platform-team')
@ApiBearerAuth()
@Controller('platform/team')
@Roles('PLATFORM_ADMIN')
export class PlatformTeamController {
  constructor(private readonly team: PlatformTeamService) {}

  @Get('permissions')
  @RequirePlatformPermission('platform.team:read')
  @ApiOperation({ summary: 'Permission catalog for custom platform roles' })
  permissions() {
    return this.team.permissionCatalog();
  }

  @Get('roles')
  @RequirePlatformPermission('platform.team:read')
  listRoles() {
    return this.team.listRoles();
  }

  @Post('roles')
  @RequirePlatformPermission('platform.team:write')
  createRole(@Body() body: CreatePlatformRoleDto) {
    return this.team.createRole(body);
  }

  @Patch('roles/:id')
  @RequirePlatformPermission('platform.team:write')
  updateRole(@Param('id') id: string, @Body() body: UpdatePlatformRoleDto) {
    return this.team.updateRole(id, body);
  }

  @Delete('roles/:id')
  @RequirePlatformPermission('platform.team:write')
  deleteRole(@Param('id') id: string) {
    return this.team.deleteRole(id);
  }

  @Get('staff')
  @RequirePlatformPermission('platform.team:read')
  listStaff() {
    return this.team.listStaff();
  }

  @Post('staff')
  @RequirePlatformPermission('platform.team:write')
  inviteStaff(@Body() body: InvitePlatformStaffDto) {
    return this.team.inviteStaff(body);
  }

  @Patch('staff/:id')
  @RequirePlatformPermission('platform.team:write')
  updateStaff(@Param('id') id: string, @Body() body: UpdatePlatformStaffDto) {
    return this.team.updateStaff(id, body);
  }
}

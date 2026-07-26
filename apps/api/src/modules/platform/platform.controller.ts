import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { Roles } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { ResetTenantUserPasswordDto } from './dto/reset-tenant-user-password.dto';
import { PurgeChurchDto } from './dto/purge-church.dto';
import { UpdateTenantUserEmailDto } from './dto/update-tenant-user-email.dto';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform')
@Roles('PLATFORM_ADMIN')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('module-catalog')
  moduleCatalog() {
    return this.platform.getModuleCatalog();
  }

  @Get('churches')
  listChurches() {
    return this.platform.listChurches();
  }

  @Get('churches/:id')
  getChurch(@Param('id') id: string) {
    return this.platform.getChurch(id);
  }

  @Post('churches')
  createChurch(@Body() body: CreateChurchDto) {
    return this.platform.createChurch(body);
  }

  @Patch('churches/:id')
  updateChurch(@Param('id') id: string, @Body() body: UpdateChurchDto) {
    return this.platform.updateChurch(id, body);
  }

  @Delete('churches/:id')
  @ApiOperation({ summary: 'Deactivate tenant (or hard-delete if it has no users)' })
  deleteChurch(@Param('id') id: string) {
    return this.platform.deleteChurch(id);
  }

  @Post('churches/:id/purge')
  @ApiOperation({
    summary:
      'Permanently delete tenant, all DB rows (users/emails/members), and upload files. Irreversible.',
  })
  permanentlyDeleteChurch(
    @Param('id') id: string,
    @Body() body: PurgeChurchDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.platform.permanentlyDeleteChurch(id, body, {
      userId: actor.userId,
      email: actor.email,
    });
  }

  @Patch('churches/:churchId/users/:userId/email')
  @ApiOperation({ summary: 'Update a tenant staff user email (platform admin)' })
  updateTenantUserEmail(
    @Param('churchId') churchId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateTenantUserEmailDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.platform.updateTenantUserEmail(churchId, userId, body, {
      userId: actor.userId,
      email: actor.email,
    });
  }

  @Post('churches/:churchId/users/:userId/reset-password')
  @ApiOperation({ summary: 'Set or regenerate a tenant user password (platform admin)' })
  resetTenantUserPassword(
    @Param('churchId') churchId: string,
    @Param('userId') userId: string,
    @Body() body: ResetTenantUserPasswordDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.platform.resetTenantUserPassword(churchId, userId, body, {
      userId: actor.userId,
      email: actor.email,
    });
  }
}
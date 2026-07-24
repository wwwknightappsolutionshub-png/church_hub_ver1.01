import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { Roles } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { ResetTenantUserPasswordDto } from './dto/reset-tenant-user-password.dto';

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
  deleteChurch(@Param('id') id: string) {
    return this.platform.deleteChurch(id);
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

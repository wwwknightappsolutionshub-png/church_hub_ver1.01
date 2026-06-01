import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { Roles } from '../auth/decorators';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';

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
}

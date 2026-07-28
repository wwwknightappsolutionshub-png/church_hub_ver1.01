import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Wisdom365ContentStatus, Wisdom365SubscriptionStatus } from '@prisma/client';
import { Roles, RequirePlatformPermission } from '../auth/decorators';
import { Wisdom365AdminService } from './wisdom365-admin.service';
import {
  PublishBatchDto,
  SetChurchAvailabilityDto,
  UpdateContentEntryDto,
  UpdateProductConfigDto,
  UpdateSubscriptionStatusDto,
  UpsertContentEntryDto,
  UpsertVariantDto,
} from './dto/wisdom365.dto';

@ApiTags('wisdom365-platform')
@ApiBearerAuth()
@Controller('platform/wisdom365')
@Roles('PLATFORM_ADMIN')
export class Wisdom365PlatformController {
  constructor(private readonly admin: Wisdom365AdminService) {}

  @Get('dashboard')
  @RequirePlatformPermission('platform.wisdom365:read')
  dashboard() {
    return this.admin.getDashboard();
  }

  @Get('product-config')
  @RequirePlatformPermission('platform.wisdom365:read')
  getProductConfig() {
    return this.admin.getProductConfig();
  }

  @Put('product-config')
  @RequirePlatformPermission('platform.wisdom365:write')
  updateProductConfig(@Body() body: UpdateProductConfigDto) {
    return this.admin.updateProductConfig(body);
  }

  @Get('variants')
  @RequirePlatformPermission('platform.wisdom365:read')
  listVariants() {
    return this.admin.listVariants();
  }

  @Post('variants')
  @RequirePlatformPermission('platform.wisdom365:write')
  upsertVariant(@Body() body: UpsertVariantDto) {
    return this.admin.upsertVariant(body);
  }

  @Get('variants/:variantId/content')
  @RequirePlatformPermission('platform.wisdom365:read')
  listContent(
    @Param('variantId') variantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: Wisdom365ContentStatus,
  ) {
    return this.admin.listContent(
      variantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      status,
    );
  }

  @Get('content/:id')
  @RequirePlatformPermission('platform.wisdom365:read')
  getContent(@Param('id') id: string) {
    return this.admin.getContentEntry(id);
  }

  @Post('content')
  @RequirePlatformPermission('platform.wisdom365:write')
  createContent(@Body() body: UpsertContentEntryDto) {
    return this.admin.createContentEntry(body);
  }

  @Patch('content/:id')
  @RequirePlatformPermission('platform.wisdom365:write')
  updateContent(@Param('id') id: string, @Body() body: UpdateContentEntryDto) {
    return this.admin.updateContentEntry(id, body);
  }

  @Delete('content/:id')
  @RequirePlatformPermission('platform.wisdom365:write')
  deleteContent(@Param('id') id: string) {
    return this.admin.deleteContentEntry(id);
  }

  @Post('content/publish-batch')
  @RequirePlatformPermission('platform.wisdom365:write')
  publishBatch(@Body() body: PublishBatchDto) {
    return this.admin.publishContentBatch(body.variantId, body.dayFrom, body.dayTo);
  }

  @Get('churches')
  @RequirePlatformPermission('platform.wisdom365:read')
  listChurches() {
    return this.admin.listChurchAvailability();
  }

  @Patch('churches/:churchId/availability')
  @RequirePlatformPermission('platform.wisdom365:write')
  setChurchAvailability(
    @Param('churchId') churchId: string,
    @Body() body: SetChurchAvailabilityDto,
  ) {
    return this.admin.setChurchAvailability(churchId, body.isAvailable, body.notes);
  }

  @Get('subscriptions')
  @RequirePlatformPermission('platform.wisdom365:read')
  listSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: Wisdom365SubscriptionStatus,
  ) {
    return this.admin.listSubscriptions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      status,
    );
  }

  @Patch('subscriptions/:id/status')
  @RequirePlatformPermission('platform.wisdom365:write')
  updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionStatusDto,
  ) {
    return this.admin.updateSubscriptionStatus(id, body.status);
  }
}

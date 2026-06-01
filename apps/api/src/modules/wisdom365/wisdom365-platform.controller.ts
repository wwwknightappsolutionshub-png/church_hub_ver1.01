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
import { Roles } from '../auth/decorators';
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
  dashboard() {
    return this.admin.getDashboard();
  }

  @Get('product-config')
  getProductConfig() {
    return this.admin.getProductConfig();
  }

  @Put('product-config')
  updateProductConfig(@Body() body: UpdateProductConfigDto) {
    return this.admin.updateProductConfig(body);
  }

  @Get('variants')
  listVariants() {
    return this.admin.listVariants();
  }

  @Post('variants')
  upsertVariant(@Body() body: UpsertVariantDto) {
    return this.admin.upsertVariant(body);
  }

  @Get('variants/:variantId/content')
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
  getContent(@Param('id') id: string) {
    return this.admin.getContentEntry(id);
  }

  @Post('content')
  createContent(@Body() body: UpsertContentEntryDto) {
    return this.admin.createContentEntry(body);
  }

  @Patch('content/:id')
  updateContent(@Param('id') id: string, @Body() body: UpdateContentEntryDto) {
    return this.admin.updateContentEntry(id, body);
  }

  @Delete('content/:id')
  deleteContent(@Param('id') id: string) {
    return this.admin.deleteContentEntry(id);
  }

  @Post('content/publish-batch')
  publishBatch(@Body() body: PublishBatchDto) {
    return this.admin.publishContentBatch(body.variantId, body.dayFrom, body.dayTo);
  }

  @Get('churches')
  listChurches() {
    return this.admin.listChurchAvailability();
  }

  @Patch('churches/:churchId/availability')
  setChurchAvailability(
    @Param('churchId') churchId: string,
    @Body() body: SetChurchAvailabilityDto,
  ) {
    return this.admin.setChurchAvailability(churchId, body.isAvailable, body.notes);
  }

  @Get('subscriptions')
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
  updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionStatusDto,
  ) {
    return this.admin.updateSubscriptionStatus(id, body.status);
  }
}

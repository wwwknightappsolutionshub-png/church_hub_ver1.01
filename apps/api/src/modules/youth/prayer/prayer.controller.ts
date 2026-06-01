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
import { YouthPrayerCategory } from '@prisma/client';
import { YouthPrayerService } from './prayer.service';
import { ChurchId, CurrentUser, AuthUser } from '../../auth/current-user.decorator';
import { Roles, ModuleGate } from '../../auth/decorators';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@Controller('youth/prayer')
export class YouthPrayerController {
  constructor(private readonly prayer: YouthPrayerService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Prayer wall feed' })
  listFeed(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('category') category?: YouthPrayerCategory,
    @Query('limit') limit?: string,
  ) {
    return this.prayer.listFeed(churchId, user.userId, {
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('my')
  listMine(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.prayer.listMine(churchId, user.userId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Someone prayed for you — in-app notifications' })
  prayedForMe(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.prayer.listPrayedForMeNotifications(churchId, user.userId);
  }

  @Post('requests')
  create(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      content: string;
      category?: YouthPrayerCategory;
      isAnonymous?: boolean;
      alias?: string;
      allowComments?: boolean;
    },
  ) {
    return this.prayer.createRequest(churchId, user.userId, body);
  }

  @Get('requests/:prayerId')
  getOne(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('prayerId') prayerId: string,
  ) {
    return this.prayer.getRequest(churchId, user.userId, prayerId);
  }

  @Patch('requests/:prayerId')
  update(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('prayerId') prayerId: string,
    @Body()
    body: {
      content?: string;
      category?: YouthPrayerCategory;
      allowComments?: boolean;
      isAnonymous?: boolean;
      alias?: string;
    },
  ) {
    return this.prayer.updateRequest(churchId, user.userId, prayerId, body);
  }

  @Delete('requests/:prayerId')
  archive(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('prayerId') prayerId: string,
  ) {
    return this.prayer.archiveRequest(churchId, user.userId, prayerId);
  }

  @Post('requests/:prayerId/pray')
  @ApiOperation({ summary: 'Tap to pray' })
  tapPray(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('prayerId') prayerId: string,
  ) {
    return this.prayer.tapPray(churchId, user.userId, prayerId);
  }

  @Post('requests/:prayerId/encourage')
  encourage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('prayerId') prayerId: string,
    @Body() body: { body: string },
  ) {
    return this.prayer.addEncouragement(
      churchId,
      user.userId,
      prayerId,
      body.body,
    );
  }

  @Patch('requests/:prayerId/hide')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  hide(@ChurchId() churchId: string, @Param('prayerId') prayerId: string) {
    return this.prayer.hideRequest(churchId, prayerId);
  }
}

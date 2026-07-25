import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Roles } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { PlatformMessagingService } from './platform-messaging.service';

class CreateBroadcastDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  churchIds?: string[];

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

class CreateSupportThreadDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsUUID()
  churchId?: string;
}

class SupportReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

class PushSubscribeDto {
  @IsString()
  endpoint!: string;

  @IsOptional()
  keys?: { p256dh: string; auth: string };

  @IsOptional()
  @IsString()
  userAgent?: string;
}

@ApiTags('platform-messaging')
@ApiBearerAuth()
@Controller('platform/messaging')
export class PlatformMessagingController {
  constructor(private readonly messaging: PlatformMessagingService) {}

  @Get('broadcasts')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List SaaS → tenant broadcasts' })
  listBroadcasts() {
    return this.messaging.listBroadcasts();
  }

  @Post('broadcasts')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Broadcast notification to tenant staff' })
  createBroadcast(@CurrentUser() user: AuthUser, @Body() body: CreateBroadcastDto) {
    return this.messaging.createBroadcast(user.userId, body);
  }

  @Get('support/threads')
  @Roles('PLATFORM_ADMIN')
  listSupportThreads(@Query('status') status?: string) {
    return this.messaging.listSupportThreads({ status });
  }

  @Get('support/threads/:id')
  @Roles('PLATFORM_ADMIN')
  getSupportThread(@Param('id') id: string) {
    return this.messaging.getSupportThread(id, { isPlatform: true });
  }

  @Post('support/threads')
  @Roles('PLATFORM_ADMIN')
  createSupportThreadAsPlatform(@CurrentUser() user: AuthUser, @Body() body: CreateSupportThreadDto) {
    return this.messaging.createSupportThread(
      { userId: user.userId, churchId: null },
      body,
    );
  }

  @Post('support/threads/:id/messages')
  @Roles('PLATFORM_ADMIN')
  replyAsPlatform(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: SupportReplyDto,
  ) {
    return this.messaging.replySupportThread(id, { userId: user.userId, churchId: null }, body.body);
  }

  @Post('support/threads/:id/close')
  @Roles('PLATFORM_ADMIN')
  closeAsPlatform(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messaging.closeSupportThread(id, { userId: user.userId, churchId: null });
  }

  @Get('inbox')
  @Roles('PLATFORM_ADMIN')
  platformInbox(@CurrentUser() user: AuthUser) {
    return this.messaging.myNotifications(user.userId, null);
  }
}

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
@Roles('ADMIN', 'PASTOR')
export class TenantSupportController {
  constructor(private readonly messaging: PlatformMessagingService) {}

  @Get('threads')
  listMine(@CurrentUser() user: AuthUser) {
    if (!user.churchId) return [];
    return this.messaging.listSupportThreads({ churchId: user.churchId });
  }

  @Get('threads/:id')
  getMine(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messaging.getSupportThread(id, {
      isPlatform: false,
      churchId: user.churchId ?? undefined,
    });
  }

  @Post('threads')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateSupportThreadDto) {
    return this.messaging.createSupportThread(
      { userId: user.userId, churchId: user.churchId },
      body,
    );
  }

  @Post('threads/:id/messages')
  reply(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: SupportReplyDto,
  ) {
    return this.messaging.replySupportThread(
      id,
      { userId: user.userId, churchId: user.churchId },
      body.body,
    );
  }

  @Post('threads/:id/close')
  close(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messaging.closeSupportThread(id, {
      userId: user.userId,
      churchId: user.churchId,
    });
  }
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class UserNotificationsController {
  constructor(private readonly messaging: PlatformMessagingService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.messaging.myNotifications(user.userId, user.churchId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.churchId) return { success: false };
    return this.messaging.markMyNotificationRead(user.userId, user.churchId, id);
  }

  @Post('read-all')
  markAll(@CurrentUser() user: AuthUser) {
    if (!user.churchId) return { success: false };
    return this.messaging.markAllMyNotificationsRead(user.userId, user.churchId);
  }

  @Post('push-subscribe')
  subscribe(@CurrentUser() user: AuthUser, @Body() body: PushSubscribeDto) {
    return this.messaging.registerPushSubscription(user.userId, {
      endpoint: body.endpoint,
      keys: body.keys ?? { p256dh: '', auth: '' },
      userAgent: body.userAgent,
    });
  }

  @Post('push-unsubscribe')
  unsubscribe(@CurrentUser() user: AuthUser, @Body() body: { endpoint: string }) {
    return this.messaging.unregisterPushSubscription(user.userId, body.endpoint);
  }
}

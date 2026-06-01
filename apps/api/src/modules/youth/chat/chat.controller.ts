import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatMessageType } from '@prisma/client';
import { YouthChatService } from './chat.service';
import { ChurchId, CurrentUser, AuthUser } from '../../auth/current-user.decorator';
import { Roles, ModuleGate } from '../../auth/decorators';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@Controller('youth/chat')
export class YouthChatController {
  constructor(private readonly chat: YouthChatService) {}

  @Get('channels')
  listChannels(
    @ChurchId() churchId: string,
    @Query('youthGroupId') youthGroupId?: string,
  ) {
    return this.chat.listChannels(churchId, youthGroupId);
  }

  @Post('channels')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  createChannel(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.chat.createChannel(
      churchId,
      body as Parameters<YouthChatService['createChannel']>[1],
    );
  }

  @Post('channels/:channelId/join')
  joinChannel(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('channelId') channelId: string,
  ) {
    return this.chat.joinChannel(churchId, user.userId, channelId);
  }

  @Get('channels/:channelId/messages')
  listMessages(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('channelId') channelId: string,
    @Query('moderator') moderator?: string,
  ) {
    return this.chat.listMessages(
      churchId,
      user.userId,
      channelId,
      moderator === 'true',
    );
  }

  @Post('channels/:channelId/messages')
  @ApiOperation({ summary: 'Post a channel message (broadcasts via WebSocket)' })
  postMessage(
    @ChurchId() churchId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      content: string;
      attachmentUrl?: string;
      messageType?: ChatMessageType;
      replyToId?: string;
    },
  ) {
    return this.chat.postMessage(churchId, channelId, user.userId, body);
  }

  @Post('channels/:channelId/read')
  markRead(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('channelId') channelId: string,
    @Body() body: { upToMessageId?: string },
  ) {
    return this.chat.markChannelRead(
      churchId,
      user.userId,
      channelId,
      body.upToMessageId,
    );
  }

  @Post('messages/:messageId/reactions')
  toggleReaction(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() body: { reactionType?: 'LIKE' | 'LOVE' | 'AMEN' | 'FIRE' | 'SAVE' },
  ) {
    return this.chat.toggleMessageReaction(
      churchId,
      user.userId,
      messageId,
      body.reactionType ?? 'LIKE',
    );
  }

  @Patch('messages/:messageId/moderate')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  moderateMessage(
    @ChurchId() churchId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { isHidden: boolean; flagReason?: string },
  ) {
    return this.chat.moderateMessage(churchId, messageId, user.userId, body);
  }

  @Get('messages/flagged')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  listFlagged(@ChurchId() churchId: string) {
    return this.chat.listFlaggedMessages(churchId);
  }

  @Get('dm/threads')
  listDmThreads(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.chat.listDmThreads(churchId, user.userId);
  }

  @Get('dm/:peerMemberId/messages')
  listDm(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('peerMemberId') peerMemberId: string,
  ) {
    return this.chat.listDmMessages(churchId, user.userId, peerMemberId);
  }

  @Post('dm/:peerMemberId/messages')
  sendDm(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('peerMemberId') peerMemberId: string,
    @Body() body: { content: string; attachmentUrl?: string },
  ) {
    return this.chat.sendDm(
      churchId,
      user.userId,
      peerMemberId,
      body.content,
      body.attachmentUrl,
    );
  }
}

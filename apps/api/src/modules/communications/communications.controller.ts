import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatChannelType } from '@prisma/client';
import type { CelebrationTemplateKind } from './celebration-email-templates.service';
import { CommunicationsService } from './communications.service';
import { CommunicationsQueueService } from './communications-queue.service';
import { CommunicationsConversationsService } from './communications-conversations.service';
import { CommunicationsAutomationService } from './communications-automation.service';
import { CelebrationEmailTemplatesService } from './celebration-email-templates.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles, ModuleGate } from '../auth/decorators';
import { ModuleAccessService } from '../access/module-access.service';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import {
  announcementBodySchema,
  channelBodySchema,
  channelMessageSchema,
  conversationMessageSchema,
  conversationStartSchema,
  devotionalBodySchema,
  inAppMessageSchema,
  notificationBodySchema,
  queueEnqueueSchema,
  sermonBodySchema,
} from './communications.schemas';
import type { z } from 'zod';

const COMM_MANAGERS = ['ADMIN', 'PASTOR'] as const;

@ApiTags('communications')
@ApiBearerAuth()
@ModuleGate('communications')
@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly communicationsService: CommunicationsService,
    private readonly queueService: CommunicationsQueueService,
    private readonly conversationsService: CommunicationsConversationsService,
    private readonly automationService: CommunicationsAutomationService,
    private readonly celebrationTemplates: CelebrationEmailTemplatesService,
    private readonly moduleAccess: ModuleAccessService,
  ) {}

  private async isCommManager(userId: string, churchId: string): Promise<boolean> {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    return ctx ? this.moduleAccess.isChurchStaff(ctx) : false;
  }

  @Get('stats')
  @Roles(...COMM_MANAGERS)
  getStats(@ChurchId() churchId: string) {
    return this.communicationsService.getStats(churchId);
  }

  @Get('catalog')
  @Roles(...COMM_MANAGERS)
  getCatalog() {
    return this.communicationsService.getCatalog();
  }

  @Get('announcements')
  listAnnouncements(
    @ChurchId() churchId: string,
    @Query('all') all?: string,
    @Query('category') category?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.isCommManager(user!.userId, churchId).then((manager) =>
      this.communicationsService.listAnnouncements(
        churchId,
        manager && all === 'true',
        category,
      ),
    );
  }

  @Post('announcements')
  @Roles(...COMM_MANAGERS)
  createAnnouncement(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(announcementBodySchema) body: z.infer<typeof announcementBodySchema>,
  ) {
    return this.communicationsService.createAnnouncement(churchId, {
      ...body,
      authorId: user.userId,
    });
  }

  @Patch('announcements/:id')
  @Roles(...COMM_MANAGERS)
  updateAnnouncement(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.communicationsService.updateAnnouncement(
      churchId,
      id,
      body as Parameters<CommunicationsService['updateAnnouncement']>[2],
    );
  }

  @Delete('announcements/:id')
  @Roles(...COMM_MANAGERS)
  deleteAnnouncement(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.communicationsService.deleteAnnouncement(churchId, id);
  }

  @Get('sermons')
  listSermons(@ChurchId() churchId: string, @Query('search') search?: string) {
    return this.communicationsService.listSermons(churchId, search);
  }

  @Post('sermons')
  @Roles(...COMM_MANAGERS)
  createSermon(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.communicationsService.createSermon(
      churchId,
      body as Parameters<CommunicationsService['createSermon']>[1],
    );
  }

  @Get('devotionals')
  listDevotionals(@ChurchId() churchId: string) {
    return this.communicationsService.listDevotionals(churchId);
  }

  @Post('devotionals')
  @Roles(...COMM_MANAGERS)
  createDevotional(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.communicationsService.createDevotional(
      churchId,
      body as Parameters<CommunicationsService['createDevotional']>[1],
    );
  }

  @Get('notifications')
  async listNotifications(
    @ChurchId() churchId: string,
    @Query('mine') mine?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const manager = await this.isCommManager(user!.userId, churchId);
    const userId = manager && mine !== 'true' ? undefined : user!.userId;
    return this.communicationsService.listNotifications(churchId, userId);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communicationsService.markNotificationRead(churchId, id, user.userId);
  }

  @Post('notifications')
  @Roles(...COMM_MANAGERS)
  sendNotification(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    if (body.sendPush !== undefined || body.sendEmail !== undefined) {
      return this.communicationsService.sendBroadcast(
        churchId,
        body as Parameters<CommunicationsService['sendBroadcast']>[1],
      );
    }
    return this.communicationsService.sendNotification(
      churchId,
      body as Parameters<CommunicationsService['sendNotification']>[1],
    );
  }

  @Get('messages/recipients')
  @Roles(...COMM_MANAGERS)
  listRecipients(@ChurchId() churchId: string) {
    return this.communicationsService.listMessageRecipients(churchId);
  }

  @Get('messages')
  listInAppMessages(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('box') box?: 'inbox' | 'sent',
  ) {
    return this.communicationsService.listInAppMessages(churchId, user.userId, box ?? 'inbox');
  }

  @Post('messages')
  @Roles(...COMM_MANAGERS)
  sendInAppMessage(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { recipientId: string; subject?: string; body: string },
  ) {
    return this.communicationsService.sendInAppMessage(churchId, user.userId, body);
  }

  @Patch('messages/:id/read')
  markInAppRead(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communicationsService.markInAppRead(churchId, id, user.userId);
  }

  @Get('pastor-reports')
  @Roles('PASTOR')
  @ApiOperation({ summary: 'Pastor reports and message inbox (pastor-only)' })
  pastorReportsInbox(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communicationsService.getPastorReportsInbox(churchId, user.userId);
  }

  @Post('pastor-reports/reply')
  @Roles('PASTOR')
  @ApiOperation({ summary: 'Pastor reply via in-app message' })
  replyPastorInbox(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { recipientId: string; subject?: string; body: string },
  ) {
    return this.communicationsService.replyToPastorInbox(churchId, user.userId, body);
  }

  @Get('admin-reports')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Church-wide admin reports and communications inbox' })
  adminReportsInbox(@ChurchId() churchId: string) {
    return this.communicationsService.getAdminReportsInbox(churchId);
  }

  @Post('admin-reports/reply')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin reply to member, leader, or pastor via in-app message' })
  replyAdminInbox(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { recipientId: string; subject?: string; body: string },
  ) {
    return this.communicationsService.replyToAdminInbox(churchId, user.userId, body);
  }

  @Get('channels')
  listChannels(
    @ChurchId() churchId: string,
    @Query('type') type?: ChatChannelType,
    @Query('archived') archived?: string,
  ) {
    return this.communicationsService.listChannels(churchId, {
      channelType: type,
      includeArchived: archived === 'true',
    });
  }

  @Post('channels')
  @Roles(...COMM_MANAGERS)
  createChannel(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.communicationsService.createChannel(
      churchId,
      body as Parameters<CommunicationsService['createChannel']>[1],
    );
  }

  @Get('channels/:channelId/messages')
  async listChannelMessages(
    @ChurchId() churchId: string,
    @Param('channelId') channelId: string,
    @Query('moderator') moderator?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const manager = await this.isCommManager(user!.userId, churchId);
    return this.communicationsService.listChannelMessages(
      churchId,
      channelId,
      manager && moderator === 'true',
    );
  }

  @Post('channels/:channelId/messages')
  @Roles(...COMM_MANAGERS)
  postChannelMessage(
    @ChurchId() churchId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { content: string },
  ) {
    return this.communicationsService.postChannelMessage(
      churchId,
      channelId,
      user.userId,
      body.content,
    );
  }

  @Get('messages/flagged')
  @Roles(...COMM_MANAGERS)
  listFlagged(@ChurchId() churchId: string) {
    return this.communicationsService.listFlaggedMessages(churchId);
  }

  @Patch('chat-messages/:messageId/moderate')
  @Roles(...COMM_MANAGERS)
  moderateMessage(
    @ChurchId() churchId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { isHidden: boolean; flagReason?: string },
  ) {
    return this.communicationsService.moderateMessage(churchId, messageId, user.userId, body);
  }

  // ─── Phase 7: Notification queue ─────────────────────────

  @Get('queue')
  @Roles(...COMM_MANAGERS)
  @ApiOperation({ summary: 'Notification delivery queue' })
  listQueue(@ChurchId() churchId: string, @Query('status') status?: string) {
    return this.queueService.listQueue(churchId, status);
  }

  @Post('queue')
  @Roles(...COMM_MANAGERS)
  enqueueNotification(
    @ChurchId() churchId: string,
    @Body()
    body: {
      kind?: string;
      title: string;
      body: string;
      channels?: string[];
      scheduledAt?: string;
      serviceUnitId?: string;
      targetUserId?: string;
    },
  ) {
    return this.queueService.enqueue(churchId, {
      kind: (body.kind as 'BROADCAST') ?? 'BROADCAST',
      title: body.title,
      body: body.body,
      channels: body.channels as ('IN_APP' | 'EMAIL' | 'WHATSAPP')[] | undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      serviceUnitId: body.serviceUnitId,
      targetUserId: body.targetUserId,
    });
  }

  @Post('broadcast/department')
  @Roles(...COMM_MANAGERS)
  @ApiOperation({ summary: 'Department-wide broadcast (queued)' })
  departmentBroadcast(
    @ChurchId() churchId: string,
    @Body()
    body: {
      serviceUnitId: string;
      title: string;
      body: string;
      channels?: string[];
    },
  ) {
    return this.queueService.enqueue(churchId, {
      kind: 'DEPARTMENT_BROADCAST',
      title: body.title,
      body: body.body,
      channels: (body.channels as ('IN_APP' | 'EMAIL' | 'WHATSAPP')[]) ?? [
        'IN_APP',
        'EMAIL',
      ],
      serviceUnitId: body.serviceUnitId,
    });
  }

  // ─── Phase 7: Conversations ────────────────────────────────

  @Get('conversations')
  listConversations(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.conversationsService.listForUser(churchId, user.userId);
  }

  @Post('conversations')
  startConversation(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { participantId: string; subject?: string },
  ) {
    return this.conversationsService.getOrCreate(
      churchId,
      user.userId,
      body.participantId,
      body.subject,
    );
  }

  @Get('conversations/:id/messages')
  listConversationMessages(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.conversationsService.listMessages(churchId, id, user.userId);
  }

  @Post('conversations/:id/messages')
  sendConversationMessage(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { body: string },
  ) {
    return this.conversationsService.sendMessage(churchId, id, user.userId, body.body);
  }

  // ─── Phase 7: Automations ──────────────────────────────────

  @Post('automation/absentee-followup')
  @Roles(...COMM_MANAGERS)
  runAbsenteeAutomation(@ChurchId() churchId: string) {
    return this.automationService.runAbsenteeFollowUp(churchId);
  }

  @Post('automation/service-reminders')
  @Roles(...COMM_MANAGERS)
  runServiceReminders(@ChurchId() churchId: string) {
    return this.automationService.runServiceReminders(churchId);
  }

  @Post('automation/celebration-emails')
  @Roles(...COMM_MANAGERS)
  @ApiOperation({ summary: 'Run birthday & anniversary auto-emails for today' })
  runCelebrationEmails(@ChurchId() churchId: string) {
    return this.automationService.runCelebrationEmails(churchId);
  }

  @Get('celebration-templates')
  @Roles(...COMM_MANAGERS)
  @ApiOperation({ summary: 'Birthday and anniversary email templates' })
  listCelebrationTemplates(@ChurchId() churchId: string) {
    return this.celebrationTemplates.list(churchId);
  }

  @Patch('celebration-templates/:kind')
  @Roles(...COMM_MANAGERS)
  @ApiOperation({ summary: 'Update celebration email template (WYSIWYG HTML)' })
  updateCelebrationTemplate(
    @ChurchId() churchId: string,
    @Param('kind') kind: string,
    @Body()
    body: { subject?: string; bodyHtml?: string; isActive?: boolean; autoSend?: boolean },
  ) {
    const parsed = kind.toUpperCase() as CelebrationTemplateKind;
    if (!['BIRTHDAY', 'ANNIVERSARY'].includes(parsed)) {
      throw new BadRequestException('Invalid template kind');
    }
    return this.celebrationTemplates.update(churchId, parsed, body);
  }
}

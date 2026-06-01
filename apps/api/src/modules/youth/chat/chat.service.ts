import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatChannelType, ChatMessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { YouthPointSource } from '@prisma/client';
import { RedisCacheService } from '../../../common/cache/redis-cache.service';
import { scanYouthContent } from '../common/moderation.util';
import { YouthAccessService } from '../common/youth-access.service';
import { YouthGamificationService } from '../gamification/gamification.service';

const messageInclude = {
  sender: { select: { id: true, firstName: true, lastName: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      sender: { select: { firstName: true, lastName: true } },
    },
  },
  reactions: {
    select: { reactionType: true, memberId: true },
  },
  _count: { select: { readReceipts: true } },
} satisfies Prisma.MessageInclude;

@Injectable()
export class YouthChatService {
  static readonly MODULE_KEY = 'youth/chat' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly gamification: YouthGamificationService,
    private readonly cache: RedisCacheService,
    private readonly access: YouthAccessService,
  ) {}

  static dmThreadKey(memberIdA: string, memberIdB: string): string {
    return [memberIdA, memberIdB].sort().join(':');
  }

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true, userId: true },
    });
    if (!member?.userId) {
      throw new BadRequestException(
        'Link your account to a member profile to use youth chat',
      );
    }
    return member;
  }

  private youthChannelWhere(churchId: string): Prisma.ChatChannelWhereInput {
    return {
      churchId,
      isArchived: false,
      OR: [{ channelType: ChatChannelType.YOUTH }, { youthGroupId: { not: null } }],
    };
  }

  private serializeMessage(
    row: Prisma.MessageGetPayload<{ include: typeof messageInclude }>,
    viewerMemberId?: string,
  ) {
    const summary: Record<string, number> = {};
    const myReactions: string[] = [];
    for (const r of row.reactions) {
      summary[r.reactionType] = (summary[r.reactionType] ?? 0) + 1;
      if (viewerMemberId && r.memberId === viewerMemberId) myReactions.push(r.reactionType);
    }
    const { reactions: _r, _count, ...rest } = row;
    return {
      ...rest,
      reactionSummary: summary,
      myReactions,
      readCount: _count.readReceipts,
    };
  }

  private async notifyUser(
    churchId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    await this.prisma.notification.create({
      data: {
        churchId,
        userId,
        title,
        body: body.slice(0, 500),
        type: 'YOUTH_CHAT',
        data: data ? (data as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  private async notifyMentions(
    churchId: string,
    channelId: string,
    content: string,
    senderName: string,
    excludeUserId: string,
  ) {
    const mentions = content.match(/@([a-f0-9-]{36})/gi);
    if (!mentions?.length) return;
    for (const raw of mentions) {
      const userId = raw.slice(1);
      if (userId === excludeUserId) continue;
      const user = await this.prisma.user.findFirst({
        where: { id: userId, churchId },
      });
      if (!user) continue;
      await this.notifyUser(
        churchId,
        userId,
        `${senderName} mentioned you`,
        content,
        { channelId, kind: 'mention' },
      );
      this.realtime.server
        ?.to(`church:${churchId}`)
        .emit('youth:notification', { userId, channelId, content });
    }
  }

  // ─── Channels ──────────────────────────────────────────────

  async listChannels(churchId: string, youthGroupId?: string) {
    const cacheKey = `youth:chat:channels:${churchId}:${youthGroupId ?? 'all'}`;
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.chatChannel.findMany({
      where: {
        ...this.youthChannelWhere(churchId),
        ...(youthGroupId ? { youthGroupId } : {}),
      },
      include: {
        youthGroup: { select: { id: true, name: true } },
        _count: { select: { messages: true, members: true } },
      },
      orderBy: { name: 'asc' },
    });
    await this.cache.set(cacheKey, rows, 60);
    return rows;
  }

  async createChannel(
    churchId: string,
    data: {
      name: string;
      description?: string;
      youthGroupId?: string;
      isModerated?: boolean;
    },
  ) {
    if (!data.name?.trim()) throw new BadRequestException('Channel name is required');
    return this.prisma.chatChannel.create({
      data: {
        churchId,
        channelType: ChatChannelType.YOUTH,
        name: data.name.trim(),
        description: data.description,
        youthGroupId: data.youthGroupId,
        isModerated: data.isModerated ?? true,
      },
      include: { youthGroup: { select: { name: true } } },
    });
  }

  async ensureGroupChannel(churchId: string, youthGroupId: string) {
    const existing = await this.prisma.chatChannel.findFirst({
      where: { churchId, youthGroupId },
    });
    if (existing) return existing;
    const group = await this.prisma.youthGroup.findFirst({
      where: { id: youthGroupId, churchId },
    });
    if (!group) throw new NotFoundException('Group not found');
    return this.prisma.chatChannel.create({
      data: {
        churchId,
        channelType: ChatChannelType.YOUTH,
        youthGroupId,
        name: `${group.name} Chat`,
        description: 'Moderated youth group discussion',
        isModerated: true,
      },
    });
  }

  async joinChannel(churchId: string, userId: string, channelId: string) {
    const member = await this.requireMember(churchId, userId);
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, ...this.youthChannelWhere(churchId) },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return this.prisma.youthChannelMember.upsert({
      where: { channelId_memberId: { channelId, memberId: member.id } },
      create: { channelId, memberId: member.id },
      update: {},
    });
  }

  // ─── Channel messages ──────────────────────────────────────

  async listMessages(
    churchId: string,
    userId: string,
    channelId: string,
    includeHidden = false,
  ) {
    const member = await this.requireMember(churchId, userId);
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, ...this.youthChannelWhere(churchId) },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    if (!includeHidden) {
      const cacheKey = `youth:chat:msgs:${channelId}:public`;
      const cached = await this.cache.get<unknown[]>(cacheKey);
      if (cached) return cached;
    }

    const rows = await this.prisma.message.findMany({
      where: {
        channelId,
        ...(includeHidden ? {} : { isHidden: false }),
      },
      include: messageInclude,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const serialized = rows.map((r) => this.serializeMessage(r, member.id));
    if (!includeHidden) {
      await this.cache.set(`youth:chat:msgs:${channelId}:public`, serialized, 15);
    }
    return serialized;
  }

  async postMessage(
    churchId: string,
    channelId: string,
    senderId: string,
    data: {
      content: string;
      attachmentUrl?: string;
      messageType?: ChatMessageType;
      replyToId?: string;
    },
  ) {
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, ...this.youthChannelWhere(churchId) },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const trimmed = data.content?.trim();
    if (!trimmed && !data.attachmentUrl) {
      throw new BadRequestException('Message content or attachment is required');
    }

    const membership = await this.prisma.youthChannelMember.findFirst({
      where: { channelId, member: { userId: senderId } },
    });
    if (membership?.isMuted) {
      throw new ForbiddenException('You are muted in this channel');
    }

    const isLeader = await this.access.isLeader(senderId);
    const flagReason = channel.isModerated
      ? scanYouthContent(trimmed || '', { strictSafeMode: !isLeader })
      : null;

    const msg = await this.prisma.message.create({
      data: {
        channelId,
        senderId,
        content: trimmed || (data.attachmentUrl ? '[attachment]' : ''),
        attachmentUrl: data.attachmentUrl,
        messageType: data.messageType ?? (data.attachmentUrl ? ChatMessageType.IMAGE : ChatMessageType.TEXT),
        replyToId: data.replyToId,
        isFlagged: !!flagReason,
        flagReason: flagReason ?? undefined,
        isHidden: !!flagReason,
      },
      include: messageInclude,
    });

    const member = await this.prisma.member.findFirst({ where: { userId: senderId } });
    if (member) {
      await this.gamification.scoreEvent(churchId, member.id, YouthPointSource.COMMENT, {
        reason: 'Chat message',
        sourceId: msg.id,
      });
    }

    const serialized = this.serializeMessage(msg, member?.id);
    if (!msg.isHidden) {
      await this.cache.del(`youth:chat:msgs:${channelId}:public`);
      this.realtime.emitYouthChannelMessage(channelId, serialized);
    }

    const senderName = `${msg.sender.firstName} ${msg.sender.lastName}`;
    await this.notifyMentions(churchId, channelId, trimmed || '', senderName, senderId);

    return serialized;
  }

  async toggleMessageReaction(
    churchId: string,
    userId: string,
    messageId: string,
    reactionType: 'LIKE' | 'LOVE' | 'AMEN' | 'FIRE' | 'SAVE',
  ) {
    const member = await this.requireMember(churchId, userId);
    const msg = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        channel: { churchId, ...this.youthChannelWhere(churchId) },
        isHidden: false,
      },
      include: { channel: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    const existing = await this.prisma.youthMessageReaction.findUnique({
      where: {
        messageId_memberId_reactionType: {
          messageId,
          memberId: member.id,
          reactionType,
        },
      },
    });

    if (existing) {
      await this.prisma.youthMessageReaction.delete({ where: { id: existing.id } });
      const payload = { messageId, memberId: member.id, reactionType, added: false };
      this.realtime.emitYouthMessageReaction(msg.channelId, payload);
      return payload;
    }

    await this.prisma.youthMessageReaction.create({
      data: { messageId, memberId: member.id, reactionType },
    });
    const payload = { messageId, memberId: member.id, reactionType, added: true };
    this.realtime.emitYouthMessageReaction(msg.channelId, payload);
    return payload;
  }

  async markChannelRead(
    churchId: string,
    userId: string,
    channelId: string,
    upToMessageId?: string,
  ) {
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, ...this.youthChannelWhere(churchId) },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const readWhere: Prisma.MessageWhereInput = { channelId, isHidden: false };
    if (upToMessageId) {
      const ref = await this.prisma.message.findUnique({
        where: { id: upToMessageId },
        select: { createdAt: true },
      });
      if (ref) readWhere.createdAt = { lte: ref.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where: readWhere,
      select: { id: true },
      take: 100,
    });

    for (const m of messages) {
      await this.prisma.youthMessageReadReceipt.upsert({
        where: { messageId_userId: { messageId: m.id, userId } },
        create: { messageId: m.id, userId },
        update: { readAt: new Date() },
      });
    }

    this.realtime.emitYouthMessageRead(channelId, { userId, upToMessageId });
    return { ok: true, count: messages.length };
  }

  async moderateMessage(
    churchId: string,
    messageId: string,
    moderatorId: string,
    data: { isHidden: boolean; flagReason?: string },
  ) {
    const msg = await this.prisma.message.findFirst({
      where: { id: messageId, channel: { churchId } },
      include: messageInclude,
    });
    if (!msg) throw new NotFoundException('Message not found');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isHidden: data.isHidden,
        flagReason: data.flagReason,
        moderatedById: moderatorId,
        moderatedAt: new Date(),
      },
      include: messageInclude,
    });

    this.realtime.emitYouthChannelMessage(msg.channelId, {
      ...this.serializeMessage(updated),
      moderated: true,
    });
    return updated;
  }

  listFlaggedMessages(churchId: string) {
    return this.prisma.message.findMany({
      where: {
        channel: this.youthChannelWhere(churchId),
        OR: [{ isFlagged: true }, { isHidden: true }],
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        channel: { select: { id: true, name: true, youthGroupId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── Direct messages ───────────────────────────────────────

  async listDmThreads(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    const messages = await this.prisma.youthDirectMessage.findMany({
      where: {
        OR: [{ senderMemberId: member.id }, { recipientMemberId: member.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, userId: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    const byPeer = new Map<string, (typeof messages)[0]>();
    for (const m of messages) {
      const peerId =
        m.senderMemberId === member.id ? m.recipientMemberId : m.senderMemberId;
      if (!byPeer.has(peerId)) byPeer.set(peerId, m);
    }

    return Array.from(byPeer.entries()).map(([peerMemberId, last]) => {
      const peer =
        last.senderMemberId === member.id ? last.recipient : last.sender;
      return {
        threadKey: YouthChatService.dmThreadKey(member.id, peerMemberId),
        peerMemberId,
        peer,
        lastMessage: last,
        unread: last.recipientMemberId === member.id && !last.readAt,
      };
    });
  }

  async listDmMessages(
    churchId: string,
    userId: string,
    peerMemberId: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    const peer = await this.prisma.member.findFirst({
      where: { id: peerMemberId, churchId },
    });
    if (!peer) throw new NotFoundException('Member not found');

    const rows = await this.prisma.youthDirectMessage.findMany({
      where: {
        OR: [
          { senderMemberId: member.id, recipientMemberId: peerMemberId },
          { senderMemberId: peerMemberId, recipientMemberId: member.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.youthDirectMessage.updateMany({
      where: { recipientMemberId: member.id, senderMemberId: peerMemberId, readAt: null },
      data: { readAt: new Date() },
    });

    return {
      threadKey: YouthChatService.dmThreadKey(member.id, peerMemberId),
      messages: rows,
    };
  }

  async sendDm(
    churchId: string,
    userId: string,
    recipientMemberId: string,
    content: string,
    attachmentUrl?: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    const recipient = await this.prisma.member.findFirst({
      where: { id: recipientMemberId, churchId },
      include: { user: { select: { id: true } } },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const trimmed = content?.trim();
    if (!trimmed && !attachmentUrl) {
      throw new BadRequestException('Message content or attachment is required');
    }

    const isLeader = await this.access.isLeader(userId);
    const flagReason = scanYouthContent(trimmed || '', { strictSafeMode: !isLeader });
    if (flagReason) {
      throw new BadRequestException(
        'Message blocked by moderation. Please revise your message.',
      );
    }

    const dm = await this.prisma.youthDirectMessage.create({
      data: {
        churchId,
        senderMemberId: member.id,
        recipientMemberId,
        content: trimmed || '[attachment]',
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const threadKey = YouthChatService.dmThreadKey(member.id, recipientMemberId);
    const payload = { ...dm, attachmentUrl };
    this.realtime.emitYouthDm(threadKey, payload);

    if (recipient.user?.id) {
      await this.notifyUser(
        churchId,
        recipient.user.id,
        `DM from ${member.firstName}`,
        trimmed || 'Sent an attachment',
        { threadKey, senderMemberId: member.id },
      );
    }

    return payload;
  }
}

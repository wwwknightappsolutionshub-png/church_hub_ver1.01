import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class CommunicationsConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  private pairIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  async listForUser(churchId: string, userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        churchId,
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
  }

  async getOrCreate(
    churchId: string,
    userId: string,
    otherUserId: string,
    subject?: string,
  ) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }
    const other = await this.prisma.user.findFirst({
      where: { id: otherUserId, churchId },
    });
    if (!other) throw new NotFoundException('Participant not found');

    const [participantAId, participantBId] = this.pairIds(userId, otherUserId);
    const existing = await this.prisma.conversation.findUnique({
      where: {
        churchId_participantAId_participantBId: {
          churchId,
          participantAId,
          participantBId,
        },
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { churchId, participantAId, participantBId, subject },
    });
  }

  async listMessages(churchId: string, conversationId: string, userId: string) {
    const conv = await this.assertParticipant(churchId, conversationId, userId);
    const messages = await this.prisma.conversationMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    await this.prisma.conversationMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return messages;
  }

  async sendMessage(
    churchId: string,
    conversationId: string,
    senderId: string,
    body: string,
  ) {
    if (!body?.trim()) throw new BadRequestException('Message body is required');
    await this.assertParticipant(churchId, conversationId, senderId);

    const message = await this.prisma.conversationMessage.create({
      data: { conversationId, senderId, body: body.trim() },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    const recipientId =
      conv!.participantAId === senderId ? conv!.participantBId : conv!.participantAId;

    await this.prisma.notification.create({
      data: {
        churchId,
        userId: recipientId,
        title: 'New message',
        body: body.trim().slice(0, 200),
        type: 'CONVERSATION',
        data: { conversationId },
      },
    });

    return message;
  }

  private async assertParticipant(churchId: string, conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        churchId,
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }
}

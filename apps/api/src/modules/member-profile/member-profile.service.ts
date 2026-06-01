import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Injectable()
export class MemberProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  async getProfile(churchId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      include: {
        family: { select: { id: true, name: true } },
        businessProfile: true,
        serviceUnitMemberships: {
          include: {
            serviceUnit: { select: { id: true, name: true, description: true } },
          },
        },
        serviceUnitLeaderships: {
          include: {
            serviceUnit: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async getMyProfile(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
    });
    if (!member) throw new NotFoundException('No member profile linked to this account');
    return this.getProfile(churchId, member.id);
  }

  async updateProfile(
    churchId: string,
    memberId: string,
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nickname: string | null;
      email: string;
      phone: string | null;
      address: string;
      city: string;
      bio: string;
      notes: string;
      avatarUrl: string | null;
    }>,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const isOwner = member.userId === userId;
    const staff = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: ['ADMIN', 'PASTOR', 'LEADER'] } },
      },
    });
    if (!isOwner && !staff) throw new ForbiddenException('Cannot edit this profile');

    const { avatarUrl, nickname, ...memberData } = data;
    const nick =
      nickname !== undefined
        ? nickname?.trim()
          ? nickname.trim().slice(0, 32)
          : null
        : undefined;
    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: {
        ...memberData,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(nick !== undefined ? { nickname: nick } : {}),
      },
      include: {
        businessProfile: true,
        serviceUnitMemberships: { include: { serviceUnit: true } },
      },
    });

    if (isOwner && member.userId) {
      const userPatch: Record<string, unknown> = {};
      if (avatarUrl !== undefined) userPatch.avatarUrl = avatarUrl;
      if (data.firstName !== undefined) userPatch.firstName = data.firstName.trim();
      if (data.lastName !== undefined) userPatch.lastName = data.lastName.trim();
      if (data.phone !== undefined) userPatch.phone = data.phone;
      if (nick !== undefined) userPatch.nickname = nick;
      if (Object.keys(userPatch).length > 0) {
        await this.prisma.user.update({
          where: { id: member.userId },
          data: userPatch,
        });
      }
    }

    return updated;
  }

  async upsertBusiness(
    churchId: string,
    memberId: string,
    userId: string,
    data: {
      businessName: string;
      tagline?: string;
      description?: string;
      category?: string;
      website?: string;
      phone?: string;
      email?: string;
    },
  ) {
    await this.assertOwnerOrStaff(churchId, memberId, userId);
    return this.prisma.businessProfile.upsert({
      where: { memberId },
      create: { churchId, memberId, ...data },
      update: data,
    });
  }

  async listMessages(churchId: string, userId: string) {
    return this.prisma.inAppMessage.findMany({
      where: {
        churchId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async sendMessage(
    churchId: string,
    senderId: string,
    data: { recipientId: string; subject?: string; body: string },
  ) {
    const recipient = await this.prisma.user.findFirst({
      where: { id: data.recipientId, churchId, isActive: true },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const msg = await this.prisma.inAppMessage.create({
      data: {
        churchId,
        senderId,
        recipientId: data.recipientId,
        subject: data.subject,
        body: data.body,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.prisma.notification.create({
      data: {
        churchId,
        userId: recipient.id,
        type: 'IN_APP_MESSAGE',
        title: data.subject ?? 'New message',
        body: data.body.slice(0, 200),
        data: { messageId: msg.id },
      },
    });

    if (recipient.email) {
      await this.email.send({
        churchId,
        to: recipient.email,
        subject: data.subject ?? 'New message from Church Hub',
        body: data.body,
      });
    }

    return msg;
  }

  async updateMessage(
    churchId: string,
    userId: string,
    messageId: string,
    data: { subject?: string; body?: string; readAt?: string },
  ) {
    const msg = await this.prisma.inAppMessage.findFirst({
      where: { id: messageId, churchId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId && msg.recipientId !== userId) {
      throw new ForbiddenException('Not your message');
    }
    return this.prisma.inAppMessage.update({
      where: { id: messageId },
      data: {
        subject: data.subject,
        body: data.body,
        readAt: data.readAt ? new Date(data.readAt) : undefined,
      },
    });
  }

  async deleteMessage(churchId: string, userId: string, messageId: string) {
    const msg = await this.prisma.inAppMessage.findFirst({
      where: { id: messageId, churchId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId && msg.recipientId !== userId) {
      const staff = await this.prisma.userRole.findFirst({
        where: { userId, role: { name: { in: ['ADMIN', 'PASTOR'] } } },
      });
      if (!staff) throw new ForbiddenException('Cannot delete this message');
    }
    return this.prisma.inAppMessage.delete({ where: { id: messageId } });
  }

  async listMessageRecipients(churchId: string, memberId: string) {
    const pastors = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['PASTOR', 'ADMIN'] } } } },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const unitAdmins = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        member: {
          serviceUnitLeaderships: { some: { isUnitAdmin: true } },
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return { pastors, unitAdmins };
  }

  private async assertOwnerOrStaff(churchId: string, memberId: string, userId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, churchId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.userId === userId) return;
    const staff = await this.prisma.userRole.findFirst({
      where: { userId, role: { name: { in: ['ADMIN', 'PASTOR', 'LEADER'] } } },
    });
    if (!staff) throw new ForbiddenException('Not allowed');
  }
}

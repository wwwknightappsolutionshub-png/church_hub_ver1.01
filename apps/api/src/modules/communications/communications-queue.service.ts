import { Injectable, Logger } from '@nestjs/common';
import { CommunicationQueueKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter, EmailPurpose } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';

export type CommChannel = 'IN_APP' | 'EMAIL' | 'WHATSAPP';

@Injectable()
export class CommunicationsQueueService {
  private readonly logger = new Logger(CommunicationsQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly sms: SmsAdapter,
  ) {}

  async listQueue(churchId: string, status?: string) {
    return this.prisma.communicationQueueItem.findMany({
      where: {
        churchId,
        ...(status ? { status: status as never } : {}),
      },
      include: { serviceUnit: { select: { id: true, name: true } } },
      orderBy: [{ scheduledAt: 'desc' }],
      take: 100,
    });
  }

  async enqueue(
    churchId: string,
    data: {
      kind: CommunicationQueueKind;
      title: string;
      body: string;
      channels?: CommChannel[];
      scheduledAt?: Date;
      serviceUnitId?: string;
      targetUserId?: string;
      targetMemberId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.prisma.communicationQueueItem.create({
      data: {
        churchId,
        kind: data.kind,
        title: data.title,
        body: data.body,
        channels: data.channels ?? ['IN_APP'],
        scheduledAt: data.scheduledAt ?? new Date(),
        serviceUnitId: data.serviceUnitId,
        targetUserId: data.targetUserId,
        targetMemberId: data.targetMemberId,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Process due queue items (fail-safe, max 25 per tick). */
  async processDueItems() {
    const due = await this.prisma.communicationQueueItem.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 25,
    });

    let sent = 0;
    let failed = 0;
    for (const item of due) {
      try {
        await this.prisma.communicationQueueItem.update({
          where: { id: item.id },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });
        await this.deliver({
          id: item.id,
          churchId: item.churchId,
          kind: item.kind,
          title: item.title,
          body: item.body,
          channels: item.channels,
          serviceUnitId: item.serviceUnitId,
          targetUserId: item.targetUserId,
          targetMemberId: item.targetMemberId,
          metadata: item.metadata,
        });
        await this.prisma.communicationQueueItem.update({
          where: { id: item.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Delivery failed';
        await this.prisma.communicationQueueItem.update({
          where: { id: item.id },
          data: {
            status: item.attempts >= 4 ? 'FAILED' : 'PENDING',
            lastError: msg,
          },
        });
        failed++;
        this.logger.warn(`Queue item ${item.id} failed: ${msg}`);
      }
    }
    return { processed: due.length, sent, failed };
  }

  private async deliver(item: {
    id: string;
    churchId: string;
    kind: CommunicationQueueKind;
    title: string;
    body: string;
    channels: string[];
    serviceUnitId: string | null;
    targetUserId: string | null;
    targetMemberId: string | null;
    metadata?: Prisma.JsonValue | null;
  }) {
    const channels = item.channels as CommChannel[];
    const recipients = await this.resolveRecipients(item);
    const meta =
      item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? (item.metadata as Record<string, unknown>)
        : {};
    const metaPurpose = meta.emailPurpose;
    const emailPurpose: EmailPurpose =
      metaPurpose === 'reports' || item.kind === 'DEPARTMENT_WEEKLY_REPORT'
        ? 'reports'
        : metaPurpose === 'onboarding'
          ? 'onboarding'
          : metaPurpose === 'auth'
            ? 'auth'
            : 'connect';

    if (channels.includes('IN_APP')) {
      for (const userId of recipients.userIds) {
        await this.prisma.notification.create({
          data: {
            churchId: item.churchId,
            userId,
            title: item.title,
            body: item.body,
            type: item.kind,
            data: { queueItemId: item.id } as Prisma.InputJsonValue,
          },
        });
      }
    }

    if (channels.includes('EMAIL')) {
      for (const email of recipients.emails) {
        const isHtml = /<[a-z][\s\S]*>/i.test(item.body);
        await this.email.send({
          to: email,
          subject: item.title,
          body: isHtml ? item.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : item.body,
          html: isHtml ? item.body : undefined,
          churchId: item.churchId,
          purpose: emailPurpose,
        });
      }
    }

    if (channels.includes('WHATSAPP')) {
      for (const phone of recipients.phones) {
        await this.sms.sendWhatsApp({
          to: phone,
          body: item.body,
          churchId: item.churchId,
        });
      }
    }
  }

  private async resolveRecipients(item: {
    churchId: string;
    serviceUnitId: string | null;
    targetUserId: string | null;
    targetMemberId: string | null;
  }) {
    const userIds = new Set<string>();
    const emails = new Set<string>();
    const phones = new Set<string>();

    if (item.targetUserId) {
      userIds.add(item.targetUserId);
      const u = await this.prisma.user.findFirst({
        where: { id: item.targetUserId, churchId: item.churchId },
        select: { email: true, phone: true },
      });
      if (u?.email) emails.add(u.email);
      if (u?.phone) phones.add(u.phone);
    }

    if (item.targetMemberId) {
      const m = await this.prisma.member.findFirst({
        where: { id: item.targetMemberId, churchId: item.churchId },
        select: { email: true, phone: true, userId: true },
      });
      if (m?.userId) userIds.add(m.userId);
      if (m?.email) emails.add(m.email);
      if (m?.phone) phones.add(m.phone);
    }

    if (item.serviceUnitId) {
      const members = await this.prisma.serviceUnitMember.findMany({
        where: { serviceUnitId: item.serviceUnitId },
        include: {
          member: { select: { email: true, phone: true, userId: true } },
        },
      });
      for (const row of members) {
        if (row.member.userId) userIds.add(row.member.userId);
        if (row.member.email) emails.add(row.member.email);
        if (row.member.phone) phones.add(row.member.phone);
      }
    }

    if (!item.targetUserId && !item.targetMemberId && !item.serviceUnitId) {
      const users = await this.prisma.user.findMany({
        where: { churchId: item.churchId, isActive: true },
        select: { id: true, email: true, phone: true },
      });
      for (const u of users) {
        userIds.add(u.id);
        if (u.email) emails.add(u.email);
        if (u.phone) phones.add(u.phone);
      }
    }

    return {
      userIds: [...userIds],
      emails: [...emails],
      phones: [...phones],
    };
  }
}

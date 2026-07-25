import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Injectable()
export class PlatformMessagingService {
  private readonly logger = new Logger(PlatformMessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  private async staffUserIdsForChurch(churchId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true, email: true, firstName: true },
    });
    return users;
  }

  private async platformAdminUsers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { name: 'PLATFORM_ADMIN' } } },
      },
      select: { id: true, email: true, firstName: true },
    });
  }

  async listBroadcasts() {
    return this.prisma.platformBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        deliveries: {
          include: { church: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
  }

  async createBroadcast(
    actorUserId: string,
    input: {
      title: string;
      body: string;
      churchIds?: string[];
      sendEmail?: boolean;
    },
  ) {
    const title = input.title?.trim();
    const body = input.body?.trim();
    if (!title || !body) throw new BadRequestException('Title and body are required');

    let churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });
    const audience = input.churchIds?.length ? 'SELECTED' : 'ALL';
    if (audience === 'SELECTED') {
      const set = new Set(input.churchIds);
      churches = churches.filter((c) => set.has(c.id));
      if (churches.length === 0) throw new BadRequestException('Select at least one active tenant');
    }

    let notificationCount = 0;
    const notificationRows: Prisma.NotificationCreateManyInput[] = [];

    for (const church of churches) {
      const staff = await this.staffUserIdsForChurch(church.id);
      for (const user of staff) {
        notificationRows.push({
          id: randomUUID(),
          churchId: church.id,
          userId: user.id,
          title,
          body,
          type: 'PLATFORM_BROADCAST',
          data: { source: 'platform', audience } as Prisma.InputJsonValue,
        });
      }
      notificationCount += staff.length;

      if (input.sendEmail) {
        for (const user of staff) {
          try {
            await this.email.send({
              churchId: church.id,
              to: user.email,
              subject: `[Church_Hub] ${title}`,
              body: `Hi ${user.firstName},\n\n${body}\n\n— Church_Hub Platform`,
            });
          } catch (err) {
            this.logger.warn(
              `Broadcast email failed for ${user.email}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    }

    if (notificationRows.length) {
      await this.prisma.notification.createMany({ data: notificationRows });
    }

    const broadcast = await this.prisma.platformBroadcast.create({
      data: {
        title,
        body,
        audience,
        sendEmail: !!input.sendEmail,
        createdByUserId: actorUserId,
        notificationCount,
        deliveries: {
          create: churches.map((c) => ({ churchId: c.id })),
        },
      },
      include: {
        deliveries: { include: { church: { select: { id: true, name: true, slug: true } } } },
      },
    });

    return broadcast;
  }

  async listSupportThreads(opts: { churchId?: string; status?: string }) {
    return this.prisma.platformSupportThread.findMany({
      where: {
        ...(opts.churchId ? { churchId: opts.churchId } : {}),
        ...(opts.status && opts.status !== 'ALL'
          ? { status: opts.status as 'OPEN' | 'PENDING_PLATFORM' | 'PENDING_TENANT' | 'CLOSED' }
          : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        church: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, body: true, senderSide: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    });
  }

  async getSupportThread(threadId: string, opts: { churchId?: string; isPlatform: boolean }) {
    const thread = await this.prisma.platformSupportThread.findFirst({
      where: {
        id: threadId,
        ...(opts.isPlatform ? {} : { churchId: opts.churchId }),
      },
      include: {
        church: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!thread) throw new NotFoundException('Support thread not found');
    return thread;
  }

  async createSupportThread(
    actor: { userId: string; churchId: string | null },
    input: { subject: string; body: string; churchId?: string },
  ) {
    const subject = input.subject?.trim();
    const body = input.body?.trim();
    if (!subject || !body) throw new BadRequestException('Subject and message are required');

    const isPlatform = !actor.churchId;
    const churchId = isPlatform ? input.churchId : actor.churchId;
    if (!churchId) throw new BadRequestException('Church is required');

    if (!isPlatform && input.churchId && input.churchId !== actor.churchId) {
      throw new ForbiddenException('Cannot open support for another church');
    }

    const church = await this.prisma.church.findFirst({ where: { id: churchId, isActive: true } });
    if (!church) throw new NotFoundException('Church not found');

    const senderSide = isPlatform ? 'PLATFORM' : 'TENANT';
    const status = isPlatform ? 'PENDING_TENANT' : 'PENDING_PLATFORM';

    const thread = await this.prisma.platformSupportThread.create({
      data: {
        churchId,
        subject,
        status,
        createdByUserId: actor.userId,
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderUserId: actor.userId,
            senderSide,
            body,
          },
        },
      },
      include: {
        church: { select: { id: true, name: true, slug: true } },
        messages: true,
      },
    });

    await this.notifySupportParticipants(thread.id, senderSide, subject, body);
    return thread;
  }

  async replySupportThread(
    threadId: string,
    actor: { userId: string; churchId: string | null },
    bodyRaw: string,
  ) {
    const body = bodyRaw?.trim();
    if (!body) throw new BadRequestException('Message is required');

    const isPlatform = !actor.churchId;
    const thread = await this.prisma.platformSupportThread.findFirst({
      where: {
        id: threadId,
        ...(isPlatform ? {} : { churchId: actor.churchId ?? undefined }),
      },
    });
    if (!thread) throw new NotFoundException('Support thread not found');
    if (thread.status === 'CLOSED') {
      throw new BadRequestException('This thread is closed');
    }

    const senderSide = isPlatform ? 'PLATFORM' : 'TENANT';
    const status = isPlatform ? 'PENDING_TENANT' : 'PENDING_PLATFORM';

    const [message] = await this.prisma.$transaction([
      this.prisma.platformSupportMessage.create({
        data: {
          threadId,
          senderUserId: actor.userId,
          senderSide,
          body,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.platformSupportThread.update({
        where: { id: threadId },
        data: { status, lastMessageAt: new Date(), closedAt: null },
      }),
    ]);

    await this.notifySupportParticipants(threadId, senderSide, thread.subject, body);
    return message;
  }

  async closeSupportThread(threadId: string, actor: { userId: string; churchId: string | null }) {
    const isPlatform = !actor.churchId;
    const thread = await this.prisma.platformSupportThread.findFirst({
      where: {
        id: threadId,
        ...(isPlatform ? {} : { churchId: actor.churchId ?? undefined }),
      },
    });
    if (!thread) throw new NotFoundException('Support thread not found');
    return this.prisma.platformSupportThread.update({
      where: { id: threadId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  private async notifySupportParticipants(
    threadId: string,
    fromSide: string,
    subject: string,
    preview: string,
  ) {
    const thread = await this.prisma.platformSupportThread.findUnique({
      where: { id: threadId },
      select: { id: true, churchId: true, subject: true },
    });
    if (!thread) return;

    const title = `Support: ${subject}`;
    const body = preview.length > 180 ? `${preview.slice(0, 177)}…` : preview;

    if (fromSide === 'TENANT') {
      // Platform operators see threads in console; email them as a heads-up.
      const admins = await this.platformAdminUsers();
      for (const admin of admins) {
        try {
          await this.email.send({
            churchId: null,
            to: admin.email,
            subject: `[Support] ${thread.subject}`,
            body: `New tenant support message.\n\n${preview}\n\nOpen the platform Support inbox to reply.`,
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }

    // Platform → tenant staff in-app notifications
    const staff = await this.staffUserIdsForChurch(thread.churchId);
    if (!staff.length) return;
    await this.prisma.notification.createMany({
      data: staff.map((u) => ({
        id: randomUUID(),
        churchId: thread.churchId,
        userId: u.id,
        title,
        body,
        type: 'PLATFORM_SUPPORT',
        data: { threadId: thread.id, source: 'platform_support' } as Prisma.InputJsonValue,
      })),
    });
  }

  async registerPushSubscription(
    userId: string,
    input: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    if (!input.endpoint?.trim() || !input.keys?.p256dh || !input.keys?.auth) {
      throw new BadRequestException('Invalid push subscription');
    }
    return this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint: input.endpoint.trim() },
      },
      create: {
        userId,
        endpoint: input.endpoint.trim(),
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent?.slice(0, 255),
      },
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent?.slice(0, 255),
      },
    });
  }

  async unregisterPushSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { success: true };
  }

  async myNotifications(userId: string, churchId: string | null) {
    if (!churchId) {
      // Platform admins: recent support activity summarized via threads
      const threads = await this.listSupportThreads({ status: 'PENDING_PLATFORM' });
      return {
        notifications: [],
        supportPending: threads.length,
        threads: threads.slice(0, 20),
      };
    }
    const notifications = await this.prisma.notification.findMany({
      where: { churchId, userId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    const unread = notifications.filter((n) => !n.readAt).length;
    return { notifications, unread };
  }

  async markMyNotificationRead(userId: string, churchId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, churchId, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllMyNotificationsRead(userId: string, churchId: string) {
    await this.prisma.notification.updateMany({
      where: { churchId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}

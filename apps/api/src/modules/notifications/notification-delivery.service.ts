import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';

export interface FollowUpReminderDelivery {
  churchId: string;
  followUpId: string;
  reminderId: string;
  subject: string;
  body: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  assignedToId?: string | null;
  notifyLeaders?: boolean;
}

const TEAM_ROLES = ['ADMIN', 'PASTOR', 'LEADER'] as const;

/** Follow-up reminders: in-app (+ push flag) for staff; optional contact email/WhatsApp. */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
  ) {}

  async deliverFollowUpReminder(params: FollowUpReminderDelivery): Promise<void> {
    const followUp = await this.prisma.followUp.findFirst({
      where: { id: params.followUpId, churchId: params.churchId },
      select: { archivedAt: true, contactName: true },
    });
    if (!followUp || followUp.archivedAt) {
      await this.prisma.followUpReminder.updateMany({
        where: { id: params.reminderId, sentAt: null },
        data: { sentAt: new Date() },
      });
      return;
    }

    const staffIds = new Set<string>();
    if (params.assignedToId) staffIds.add(params.assignedToId);

    if (params.notifyLeaders) {
      const leaders = await this.prisma.user.findMany({
        where: {
          churchId: params.churchId,
          isActive: true,
          roles: { some: { role: { name: { in: [...TEAM_ROLES] } } } },
        },
        select: { id: true },
      });
      for (const u of leaders) staffIds.add(u.id);
    }

    for (const userId of staffIds) {
      await this.prisma.notification.create({
        data: {
          churchId: params.churchId,
          userId,
          title: params.subject,
          body: params.body,
          type: 'FOLLOW_UP_REMINDER',
          data: {
            followUpId: params.followUpId,
            reminderId: params.reminderId,
            channel: 'push',
          } as Prisma.InputJsonValue,
        },
      });
    }
    if (staffIds.size) {
      this.logger.debug(`In-app/push reminder for ${staffIds.size} staff on ${params.followUpId}`);
    }

    if (params.contactEmail) {
      await this.email.send({
        to: params.contactEmail,
        subject: params.subject,
        body: params.body,
        churchId: params.churchId,
      });
    }

    if (params.contactPhone) {
      await this.sms.sendWhatsApp({
        to: params.contactPhone,
        body: params.body,
        churchId: params.churchId,
      });
    }

    await this.prisma.followUpReminder.update({
      where: { id: params.reminderId },
      data: { sentAt: new Date() },
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
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
}

/** Follow-up reminders: in-app + email + WhatsApp (phone channel is WhatsApp-only). */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
  ) {}

  async deliverFollowUpReminder(params: FollowUpReminderDelivery): Promise<void> {
    if (params.assignedToId) {
      await this.prisma.notification.create({
        data: {
          churchId: params.churchId,
          userId: params.assignedToId,
          title: params.subject,
          body: params.body,
          type: 'FOLLOW_UP_REMINDER',
          data: {
            followUpId: params.followUpId,
            reminderId: params.reminderId,
          },
        },
      });
      this.logger.debug(`In-app reminder for user ${params.assignedToId}`);
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

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE, NotificationJob } from './notifications.constants';
import { NotificationDeliveryService } from './notification-delivery.service';
import { SmsAdapter } from './adapters/sms.adapter';
import { EmailAdapter } from './adapters/email.adapter';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly delivery: NotificationDeliveryService,
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const data = job.data;
    this.logger.log(`Processing ${data.type} job ${job.id}`);

    switch (data.type) {
      case 'FOLLOW_UP_REMINDER':
        if (data.reminderId && data.followUpId) {
          await this.delivery.deliverFollowUpReminder({
            churchId: data.churchId,
            followUpId: data.followUpId,
            reminderId: data.reminderId,
            subject: data.subject ?? 'Follow-up reminder',
            body: data.body,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            assignedToId: data.assignedToId,
          });
        }
        break;
      case 'WHATSAPP':
        if (data.to) {
          await this.sms.sendWhatsApp({ to: data.to, body: data.body, churchId: data.churchId });
        }
        break;
      case 'SMS':
        if (data.to) {
          await this.sms.sendWhatsApp({ to: data.to, body: data.body, churchId: data.churchId });
        }
        break;
      case 'EMAIL':
        if (data.to) {
          await this.email.send({
            to: data.to,
            subject: data.subject ?? 'Church_Hub Notification',
            body: data.body,
            churchId: data.churchId,
          });
        }
        break;
      default:
        this.logger.warn(`Unhandled notification type: ${data.type}`);
    }
  }
}

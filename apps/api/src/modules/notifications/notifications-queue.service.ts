import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE, NotificationJob } from './notifications.constants';
import { NotificationDeliveryService } from './notification-delivery.service';

@Injectable()
export class NotificationsQueueService {
  private readonly logger = new Logger(NotificationsQueueService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly delivery: NotificationDeliveryService,
    @Optional() @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue?: Queue<NotificationJob>,
  ) {}

  async enqueue(job: NotificationJob, delayMs = 0) {
    if (!this.queue) {
      if (job.type === 'FOLLOW_UP_REMINDER' && job.reminderId && job.followUpId) {
        const key = job.reminderId;
        const existing = this.timers.get(key);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          this.timers.delete(key);
          void this.delivery.deliverFollowUpReminder({
            churchId: job.churchId,
            followUpId: job.followUpId!,
            reminderId: job.reminderId!,
            subject: job.subject ?? 'Follow-up reminder',
            body: job.body,
            contactEmail: job.contactEmail,
            contactPhone: job.contactPhone,
            assignedToId: job.assignedToId,
            notifyLeaders: job.notifyLeaders === true,
          });
        }, delayMs);
        this.timers.set(key, timer);
        this.logger.debug(`Redis disabled — scheduled ${job.type} in ${delayMs}ms`);
        return;
      }
      this.logger.debug(`Redis disabled — skipped ${job.type} for church ${job.churchId}`);
      return;
    }

    const opts = delayMs > 0 ? { delay: delayMs } : undefined;
    await this.queue.add(job.type, job, opts);
    this.logger.debug(`Enqueued ${job.type} for church ${job.churchId}`);
  }

  async scheduleFollowUpReminder(params: {
    churchId: string;
    followUpId: string;
    reminderId: string;
    body: string;
    subject?: string;
    remindAt: Date;
    contactEmail?: string | null;
    contactPhone?: string | null;
    assignedToId?: string | null;
    notifyLeaders?: boolean;
  }) {
    const delayMs = Math.max(0, params.remindAt.getTime() - Date.now());
    await this.enqueue(
      {
        type: 'FOLLOW_UP_REMINDER',
        churchId: params.churchId,
        body: params.body,
        subject: params.subject ?? 'Follow-up reminder',
        followUpId: params.followUpId,
        reminderId: params.reminderId,
        contactEmail: params.contactEmail ?? undefined,
        contactPhone: params.contactPhone ?? undefined,
        assignedToId: params.assignedToId ?? undefined,
        notifyLeaders: params.notifyLeaders === true,
      },
      delayMs,
    );
  }
}

import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsQueueService } from './notifications-queue.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { SmsAdapter } from './adapters/sms.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { EmailAdapter } from './adapters/email.adapter';

@Module({})
export class NotificationsModule {
  static forRoot(): DynamicModule {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    return {
      module: NotificationsModule,
      global: true,
      imports: redisEnabled ? [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })] : [],
      providers: [
        NotificationDeliveryService,
        NotificationsQueueService,
        WhatsAppAdapter,
        SmsAdapter,
        EmailAdapter,
        ...(redisEnabled ? [NotificationsProcessor] : []),
      ],
      exports: [
        NotificationsQueueService,
        NotificationDeliveryService,
        EmailAdapter,
        WhatsAppAdapter,
        SmsAdapter,
      ],
    };
  }
}

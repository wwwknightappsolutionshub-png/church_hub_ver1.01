export const NOTIFICATIONS_QUEUE = 'notifications';

export type NotificationJobType = 'SMS' | 'WHATSAPP' | 'EMAIL' | 'FOLLOW_UP_REMINDER' | 'PUSH';

export interface NotificationJob {
  type: NotificationJobType;
  churchId: string;
  to?: string;
  subject?: string;
  body: string;
  followUpId?: string;
  reminderId?: string;
  scheduledAt?: string;
  contactEmail?: string;
  contactPhone?: string;
  assignedToId?: string;
  notifyLeaders?: boolean;
}

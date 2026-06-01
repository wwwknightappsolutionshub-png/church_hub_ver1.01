import { FollowUpStage, OutreachConvertStage } from '@prisma/client';

export const DEFAULT_WELCOME_SMS =
  'Welcome {{name}}! Thank you for connecting with {{church}}. We are praying for you and look forward to staying in touch. God bless you!';

export const DEFAULT_WELCOME_EMAIL_SUBJECT = 'Welcome from {{church}}';

export const DEFAULT_WELCOME_EMAIL_BODY = `Dear {{name}},

Thank you for taking time to speak with our outreach team today. We are delighted to connect with you and would love to see you at our next service.

If you have any questions, simply reply to this message.

Blessings,
{{church}} Evangelism Team`;

/** Convert pipeline order (field evangelism → membership). */
export const OUTREACH_CONVERT_PIPELINE: OutreachConvertStage[] = [
  'CAPTURED',
  'CONTACTED',
  'VISITED',
  'READY_FOR_MEMBERSHIP',
  'CONVERTED',
  'ARCHIVED',
];

/** Map convert stage to follow-up stage when advancing pipeline. */
export const CONVERT_TO_FOLLOW_UP_STAGE: Partial<Record<OutreachConvertStage, FollowUpStage>> = {
  CAPTURED: 'NEW_LEAD',
  CONTACTED: 'CONTACTED',
  VISITED: 'VISITED',
  READY_FOR_MEMBERSHIP: 'ATTENDED',
  CONVERTED: 'JOINED_GROUP',
};

import { FollowUpAutomationTrigger, FollowUpStage } from '@prisma/client';

export const DEFAULT_FOLLOW_UP_AUTOMATION_RULES: Array<{
  name: string;
  trigger: FollowUpAutomationTrigger;
  stage?: FollowUpStage;
  delayHours: number;
  channel: string;
  message: string;
  notifyAssignee: boolean;
}> = [
  {
    name: 'Welcome new lead (WhatsApp)',
    trigger: 'NEW_LEAD',
    delayHours: 0,
    channel: 'WHATSAPP',
    message: 'Hi {{name}}, thank you for connecting with {{church}}. We would love to stay in touch!',
    notifyAssignee: true,
  },
  {
    name: 'Welcome new lead (Email)',
    trigger: 'NEW_LEAD',
    delayHours: 0,
    channel: 'EMAIL',
    message:
      'Dear {{name}},\n\nThank you for connecting with {{church}}. We are glad you reached out and would love to stay in touch.\n\nBlessings,\n{{church}}',
    notifyAssignee: true,
  },
  {
    name: 'Contacted — check-in',
    trigger: 'STAGE_ENTER',
    stage: 'CONTACTED',
    delayHours: 72,
    channel: 'WHATSAPP',
    message: 'Hello {{name}}, just checking in from {{church}}. How can we support you this week?',
    notifyAssignee: true,
  },
  {
    name: 'Overdue follow-up alert',
    trigger: 'OVERDUE',
    delayHours: 0,
    channel: 'WHATSAPP',
    message: 'Reminder: follow-up for {{name}} is overdue. Please reach out soon.',
    notifyAssignee: true,
  },
];

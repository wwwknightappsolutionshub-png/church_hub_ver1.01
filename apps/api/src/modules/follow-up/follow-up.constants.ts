import { FollowUpStage } from '@prisma/client';

export const FOLLOW_UP_STAGE_ORDER: FollowUpStage[] = [
  'NEW_LEAD',
  'CONTACTED',
  'VISITED',
  'ATTENDED',
  'JOINED_GROUP',
];

export const DEFAULT_FOLLOW_UP_TEMPLATES = [
  {
    name: 'Welcome WhatsApp',
    channel: 'WHATSAPP',
    body: 'Hi {{name}}, thank you for visiting us! We would love to stay connected. Reply YES to hear about our next service.',
  },
  {
    name: 'Follow-up WhatsApp',
    channel: 'WHATSAPP',
    body: 'Hello {{name}} 🙏 This is {{church}}. How are you? We are praying for you and would love to see you again this Sunday.',
  },
  {
    name: 'Home visit invite',
    channel: 'EMAIL',
    subject: 'We would love to visit you',
    body: 'Dear {{name}},\n\nThank you for joining us. A member of our follow-up team would like to visit you at a convenient time.\n\nBlessings,\n{{church}} Follow-Up Team',
  },
  {
    name: 'Cell group invitation',
    channel: 'WHATSAPP',
    body: 'Hi {{name}}, you are invited to join a Winners Satellite Fellowship (WSF) cell near you. Reply CALL and we will connect you.',
  },
  {
    name: 'Service reminder',
    channel: 'WHATSAPP',
    body: 'Reminder: {{church}} service this Sunday. We saved a seat for you, {{name}}! Transport help available — reply BUS.',
  },
] as const;

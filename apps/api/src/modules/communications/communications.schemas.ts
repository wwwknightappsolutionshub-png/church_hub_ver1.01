import { z } from 'zod';

export const announcementBodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().optional(),
  category: z.string().max(80).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const sermonBodySchema = z.object({
  title: z.string().min(1).max(200),
  preacher: z.string().max(120).optional(),
  sermonDate: z.string().datetime().optional(),
  videoUrl: z.string().url().max(2000).optional(),
  audioUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(10000).optional(),
});

export const devotionalBodySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  author: z.string().max(120).optional(),
  publishedAt: z.string().datetime().optional(),
});

export const notificationBodySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  userId: z.string().uuid().optional(),
  type: z.string().max(80).optional(),
  sendPush: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
});

export const inAppMessageSchema = z.object({
  recipientId: z.string().uuid(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(10000),
});

export const channelBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  channelType: z.enum(['ANNOUNCEMENT', 'DEPARTMENT', 'DIRECT', 'GROUP']).optional(),
  serviceUnitId: z.string().uuid().optional(),
});

export const channelMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const queueEnqueueSchema = z.object({
  kind: z.string().max(80).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'WHATSAPP'])).optional(),
  scheduledAt: z.string().datetime().optional(),
  serviceUnitId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
});

export const conversationStartSchema = z.object({
  participantId: z.string().uuid(),
  subject: z.string().max(200).optional(),
});

export const conversationMessageSchema = z.object({
  body: z.string().min(1).max(10000),
});

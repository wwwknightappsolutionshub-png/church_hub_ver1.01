import { z } from 'zod';

export const CommChannelSchema = z.enum(['IN_APP', 'EMAIL', 'WHATSAPP']);

export const EnqueueCommunicationSchema = z.object({
  kind: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  channels: z.array(CommChannelSchema).optional(),
  scheduledAt: z.string().datetime().optional(),
  serviceUnitId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
});

export const DepartmentBroadcastSchema = z.object({
  serviceUnitId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  channels: z.array(CommChannelSchema).optional(),
});

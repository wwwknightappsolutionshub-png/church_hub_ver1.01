import { z } from 'zod';

export const createPrayerSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  displayName: z.string().max(120).optional(),
  memberId: z.string().uuid().optional(),
});

export const createPraiseSchema = z.object({
  subject: z.string().min(1).max(200),
  testimony: z.string().min(1).max(5000),
  displayName: z.string().max(120).optional(),
  memberId: z.string().uuid().optional(),
});

export const hubCommentSchema = z.object({
  body: z.string().min(1).max(3000),
});

export const hubPostUpdateSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  testimony: z.string().min(1).max(5000).optional(),
  description: z.string().min(1).max(5000).optional(),
  displayName: z.string().max(120).optional(),
  showDisplayName: z.boolean().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

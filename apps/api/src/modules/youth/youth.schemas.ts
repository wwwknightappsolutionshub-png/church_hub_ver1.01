import { z } from 'zod';

export const youthGroupBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  leaderId: z.string().uuid().optional(),
  minAge: z.number().int().min(0).max(99).optional(),
  maxAge: z.number().int().min(0).max(99).optional(),
  isActive: z.boolean().optional(),
});

export const youthMemberIdSchema = z.object({
  memberId: z.string().uuid(),
});

export const youthEventBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  youthGroupId: z.string().uuid().optional(),
  maxAttendees: z.number().int().positive().optional(),
});

export const youthRsvpSchema = z.object({
  memberId: z.string().uuid().optional(),
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']).optional(),
  visibility: z.enum(['PUBLIC', 'GROUP', 'PRIVATE']).optional(),
});

export const youthMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  attachmentUrl: z.string().url().max(2000).optional(),
  replyToId: z.string().uuid().optional(),
});

export const youthModerateSchema = z.object({
  isHidden: z.boolean(),
  flagReason: z.string().max(500).optional(),
});

export const youthResourceBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url().max(2000).optional(),
  category: z.string().max(80).optional(),
  youthGroupId: z.string().uuid().optional(),
});

export const youthHelpSubmitSchema = z.object({
  category: z.string().max(80).optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  isAnonymous: z.boolean().optional(),
});

export const youthPointsSchema = z.object({
  points: z.number().int().min(-500).max(500),
});

import { z } from 'zod';

export const CounselingCaseStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export const CounselingCategorySchema = z.enum([
  'COUNSELING',
  'PRAYER',
  'CRISIS',
  'MARRIAGE',
  'GRIEF',
  'OTHER',
]);
export const CarePrayerStatusSchema = z.enum(['OPEN', 'PRAYING', 'ANSWERED', 'ARCHIVED']);

export const CreateCounselingCaseSchema = z.object({
  title: z.string().min(1).max(200),
  category: CounselingCategorySchema.optional(),
  memberId: z.string().uuid().optional(),
  followUpId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  summary: z.string().max(2000).optional(),
  isConfidential: z.boolean().optional(),
});

export const CreateCarePrayerSchema = z.object({
  title: z.string().min(1).max(200),
  details: z.string().min(1).max(5000),
  memberId: z.string().uuid().optional(),
  followUpId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  isAnonymous: z.boolean().optional(),
  isConfidential: z.boolean().optional(),
});

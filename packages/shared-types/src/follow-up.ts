import { z } from 'zod';
import { FollowUpStageSchema } from './enums';

export const CreateFollowUpSchema = z.object({
  memberId: z.string().uuid().optional(),
  contactName: z.string().min(1).max(200),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  stage: FollowUpStageSchema.default('NEW_LEAD'),
  assignedToId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;

export const UpdateFollowUpStageSchema = z.object({
  stage: FollowUpStageSchema,
  notes: z.string().max(2000).optional(),
});
export type UpdateFollowUpStageInput = z.infer<typeof UpdateFollowUpStageSchema>;

export const PastoralNoteSchema = z.object({
  memberId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  isConfidential: z.boolean().default(true),
});
export type PastoralNoteInput = z.infer<typeof PastoralNoteSchema>;

import { z } from 'zod';
import { FollowUpStageSchema } from './enums';
import { optionalEmailSchema, optionalPhoneSchema } from './validation';

export const CreateFollowUpSchema = z.object({
  memberId: z.string().uuid().optional(),
  contactName: z.string().min(1).max(200),
  contactPhone: optionalPhoneSchema,
  contactEmail: optionalEmailSchema,
  stage: FollowUpStageSchema.default('NEW_LEAD'),
  assignedToId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;

/**
 * Allow-listed fields for PATCH /follow-up/:id.
 * Stage / archive / church / member linkage must use dedicated endpoints.
 */
export const UpdateFollowUpSchema = z
  .object({
    contactName: z.string().min(1).max(200).optional(),
    contactPhone: optionalPhoneSchema,
    contactEmail: optionalEmailSchema,
    assignedToId: z.string().uuid().nullable().optional(),
    wsfCellBranchId: z.string().uuid().nullable().optional(),
    // Date inputs may be YYYY-MM-DD or ISO datetime; service parses + validates.
    dueAt: z.union([z.string().min(1).max(40), z.literal('')]).nullable().optional(),
    notes: z.string().max(2000).optional(),
    nextAction: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type UpdateFollowUpInput = z.infer<typeof UpdateFollowUpSchema>;

export const UpdateFollowUpStageSchema = z.object({
  stage: FollowUpStageSchema,
  notes: z.string().max(2000).optional(),
  whatWasDone: z.string().max(2000).optional(),
  whatNext: z.string().max(2000).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});
export type UpdateFollowUpStageInput = z.infer<typeof UpdateFollowUpStageSchema>;

export const PastoralNoteSchema = z.object({
  memberId: z.string().uuid().optional(),
  followUpId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
  isConfidential: z.boolean().default(true),
  stageAtTime: FollowUpStageSchema.optional(),
  kind: z
    .enum(['NOTE', 'STAGE_PROGRESS', 'ARCHIVE_REQUEST', 'ARCHIVE', 'ARCHIVE_DECLINED', 'RECONTACT'])
    .optional(),
});
export type PastoralNoteInput = z.infer<typeof PastoralNoteSchema>;

export const ArchiveFollowUpSchema = z.object({
  reason: z.string().trim().min(3, 'Enter a reason').max(2000),
});
export type ArchiveFollowUpInput = z.infer<typeof ArchiveFollowUpSchema>;

export const ArchiveRequestFollowUpSchema = z.object({
  reason: z.string().trim().min(3, 'Explain why this lead should be archived').max(2000),
});
export type ArchiveRequestFollowUpInput = z.infer<typeof ArchiveRequestFollowUpSchema>;

export const DeclineArchiveRequestSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});
export type DeclineArchiveRequestInput = z.infer<typeof DeclineArchiveRequestSchema>;

export const RecontactArchivedLeadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});
export type RecontactArchivedLeadInput = z.infer<typeof RecontactArchivedLeadSchema>;

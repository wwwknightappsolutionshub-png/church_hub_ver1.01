import { z } from 'zod';

export const UpsertMemberFieldPoliciesSchema = z
  .object({
    items: z
      .array(
        z.object({
          fieldKey: z.string().trim().min(1).max(200),
          visibility: z.enum(['VISIBLE', 'RESTRICTED', 'HIDDEN']),
          editability: z.enum(['EDITABLE', 'READ_ONLY', 'LOCKED']),
        }),
      )
      .min(1)
      .max(200),
  })
  .strict();

export type UpsertMemberFieldPoliciesInput = z.infer<typeof UpsertMemberFieldPoliciesSchema>;

export const RequestMemberPrivacyAccessSchema = z
  .object({
    reason: z.string().trim().max(1000).optional(),
    memberId: z.string().trim().uuid().optional(),
  })
  .strict();

export type RequestMemberPrivacyAccessInput = z.infer<
  typeof RequestMemberPrivacyAccessSchema
>;

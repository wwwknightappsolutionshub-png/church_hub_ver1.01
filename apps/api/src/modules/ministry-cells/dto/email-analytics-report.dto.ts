import { z } from 'zod';

const EmailAnalyticsReportObjectSchema = z
  .object({
    from: z.string().trim().min(1).optional(),
    to: z.string().trim().min(1).optional(),
    branchId: z.string().trim().min(1).optional(),
    location: z.string().trim().max(200).optional(),
  })
  .strict();

/** Accepts `{}` or omitted body fields for filtered analytics email. */
export const EmailAnalyticsReportSchema = z.preprocess(
  (value) => (value == null ? {} : value),
  EmailAnalyticsReportObjectSchema,
);

export type EmailAnalyticsReportInput = z.infer<typeof EmailAnalyticsReportObjectSchema>;

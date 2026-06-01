import { z } from 'zod';

export const COMMUNITY_SUPPORT_REQUEST_TYPES = ['JOB_SEARCH', 'BUSINESS_SEARCH'] as const;
export type CommunitySupportRequestType = (typeof COMMUNITY_SUPPORT_REQUEST_TYPES)[number];

export const COMMUNITY_SUPPORT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const landingCommunitySupportSectionSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(500).optional(),
});

export type LandingCommunitySupportSection = z.infer<typeof landingCommunitySupportSectionSchema>;

export const publicCommunitySupportItemSchema = z.object({
  id: z.string(),
  requestType: z.enum(COMMUNITY_SUPPORT_REQUEST_TYPES),
  title: z.string(),
  summary: z.string(),
  location: z.string().optional(),
  contactHint: z.string().optional(),
  submittedAtLabel: z.string().optional(),
  approvedAtLabel: z.string().optional(),
  validUntilLabel: z.string().optional(),
  dateLabel: z.string().optional(),
});

export type PublicCommunitySupportItem = z.infer<typeof publicCommunitySupportItemSchema>;

export function buildDefaultCommunitySupportSection(): LandingCommunitySupportSection {
  return {
    enabled: true,
    title: 'Community Support',
    subtitle: 'Job and business search requests posted by members of the church (shared anonymously after approval).',
  };
}

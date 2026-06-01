import { z } from 'zod';
import { landingSocialFeedSchema } from './landing-page.social-feed';
import {
  landingCommunitySupportSectionSchema,
  type PublicCommunitySupportItem,
} from './landing-page.community-support';

export const LANDING_TEMPLATE_IDS = ['classic', 'modern'] as const;
export type LandingTemplateId = (typeof LANDING_TEMPLATE_IDS)[number];

export const landingLinkSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  href: z.string().max(500),
});

export const landingServiceTimeSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(120),
  schedule: z.string().min(1).max(300),
  note: z.string().max(200).optional(),
});

export const landingAnnouncementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().max(2000),
  dateLabel: z.string().max(80).optional(),
  imageUrl: z.string().max(2048).optional(),
});

export const landingStatSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(40),
});

export const landingHeroSlideSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string().min(1).max(2048),
  eyebrow: z.string().max(120).optional(),
  headline: z.string().max(200).optional(),
  subheadline: z.string().max(600).optional(),
});

export const landingHeroSchema = z.object({
  eyebrow: z.string().max(120).optional(),
  headline: z.string().min(1).max(200),
  subheadline: z.string().max(600).optional(),
  ctaLabel: z.string().max(80).optional(),
  ctaHref: z.string().max(500).optional(),
  secondaryCtaLabel: z.string().max(80).optional(),
  secondaryCtaHref: z.string().max(500).optional(),
  imageUrl: z.string().max(2048).optional(),
});

export const landingAboutSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(3000),
  readMoreHref: z.string().max(500).optional(),
  pastorName: z.string().max(120).optional(),
  pastorTitle: z.string().max(120).optional(),
  pastorImageUrl: z.string().max(2048).optional(),
});

export const landingMandateSchema = z.object({
  title: z.string().min(1).max(120),
  quote: z.string().min(1).max(1000),
  reference: z.string().max(200).optional(),
});

export const landingContactSchema = z.object({
  address: z.string().max(500).optional(),
  phone: z.string().max(80).optional(),
  email: z.string().max(200).optional(),
});

export const landingSocialSchema = z.object({
  facebook: z.string().max(500).optional(),
  youtube: z.string().max(500).optional(),
  instagram: z.string().max(500).optional(),
  whatsapp: z.string().max(500).optional(),
});

export const churchLandingContentSchema = z.object({
  templateId: z.enum(LANDING_TEMPLATE_IDS),
  published: z.boolean(),
  hero: landingHeroSchema,
  heroSlides: z.array(landingHeroSlideSchema).max(8).optional(),
  about: landingAboutSchema,
  mandate: landingMandateSchema.optional(),
  serviceTimes: z.array(landingServiceTimeSchema).max(12),
  quickLinks: z.array(landingLinkSchema).max(16),
  announcements: z.array(landingAnnouncementSchema).max(12),
  stats: z.array(landingStatSchema).max(8),
  contact: landingContactSchema,
  social: landingSocialSchema.optional(),
  socialFeed: landingSocialFeedSchema.optional(),
  communitySupport: landingCommunitySupportSectionSchema.optional(),
  footerTagline: z.string().max(300).optional(),
});

export type ChurchLandingContent = z.infer<typeof churchLandingContentSchema>;
export type LandingHeroSlide = z.infer<typeof landingHeroSlideSchema>;
export type LandingAnnouncement = z.infer<typeof landingAnnouncementSchema>;
export type LandingLink = z.infer<typeof landingLinkSchema>;
export type LandingServiceTime = z.infer<typeof landingServiceTimeSchema>;

export const LANDING_TEMPLATE_META: Record<
  LandingTemplateId,
  { id: LandingTemplateId; name: string; description: string }
> = {
  classic: {
    id: 'classic',
    name: 'Classic Ministry',
    description:
      'Rich sections inspired by large ministry sites: about, service times, stats, membership CTAs, and contact.',
  },
  modern: {
    id: 'modern',
    name: 'Modern Welcome',
    description:
      'Bold welcome layout with mandate, quick-link cards, announcements, and Sunday service focus.',
  },
};

export interface PublicChurchLandingDto {
  churchName: string;
  slug: string;
  logoUrl: string | null;
  /** Resolved hostname visitors should use (custom or default). */
  publicDomain: string;
  /** Default `{slug}.church_hub.org` when no custom domain is set. */
  defaultPublicDomain: string;
  /** Full https URL for the public site. */
  publicSiteUrl: string;
  /** Path-based URL on this app: `/c/{slug}`. */
  publicPath: string;
  city: string | null;
  country: string | null;
  landing: ChurchLandingContent;
  /** Approved anonymous community support requests for the landing ticker. */
  communitySupportItems?: PublicCommunitySupportItem[];
}

export interface ChurchLandingAdminDto extends PublicChurchLandingDto {
  templates: typeof LANDING_TEMPLATE_META;
}

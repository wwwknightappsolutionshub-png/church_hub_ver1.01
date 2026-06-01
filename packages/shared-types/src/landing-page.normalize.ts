import { ensureAnnouncementCarousel } from './landing-page.announcements';
import { buildDefaultCommunitySupportSection } from './landing-page.community-support';
import { ensureSocialFeedWithSamples } from './landing-page.social-feed';
import {
  assertLandingSaveableImages,
  sanitizeLandingImageUrl,
} from './landing-page.images';
import type { ChurchLandingContent, LandingHeroSlide } from './landing-page';

/** Stock worship imagery for new / legacy landings without uploaded slides */
export const DEFAULT_HERO_STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1438234227774-98e995acda46?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1507692049790-de582cf2f655?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1519491050285-c00150e935ec?auto=format&fit=crop&w=1920&q=80',
] as const;

export function buildDefaultHeroSlides(churchName: string): LandingHeroSlide[] {
  return DEFAULT_HERO_STOCK_IMAGES.map((imageUrl, i) => ({
    id: `slide-${i + 1}`,
    imageUrl,
    eyebrow: i === 0 ? 'Welcome' : undefined,
    headline: i === 0 ? `Welcome to ${churchName}` : undefined,
    subheadline:
      i === 0
        ? 'Join us in worship, fellowship, and the transforming power of God’s Word.'
        : undefined,
  }));
}

function normalizeHeroSlides(content: ChurchLandingContent): LandingHeroSlide[] {
  const existing = content.heroSlides?.filter((s) => s.imageUrl?.trim()) ?? [];
  if (existing.length > 0) return existing;

  if (content.hero.imageUrl?.trim()) {
    return [
      {
        id: 'slide-legacy',
        imageUrl: content.hero.imageUrl.trim(),
        eyebrow: content.hero.eyebrow,
        headline: content.hero.headline,
        subheadline: content.hero.subheadline,
      },
    ];
  }

  const churchName =
    content.hero.headline.replace(/^Welcome to\s+/i, '').trim() || 'Our Church';
  return buildDefaultHeroSlides(churchName);
}

/** Ensures carousel slides and six announcement cards (migrates legacy landings). */
export function normalizeChurchLanding(
  content: ChurchLandingContent,
  churchName = 'Our Church',
): ChurchLandingContent {
  const name =
    churchName ||
    content.hero.headline.replace(/^Welcome to\s+/i, '').trim() ||
    'Our Church';
  return {
    ...content,
    heroSlides: normalizeHeroSlides(content),
    announcements: ensureAnnouncementCarousel(content.announcements ?? []),
    socialFeed: ensureSocialFeedWithSamples(content.socialFeed, name),
    communitySupport:
      content.communitySupport ?? buildDefaultCommunitySupportSection(),
  };
}

/** Strips invalid optional sections and fills required fields before PATCH validation. */
export function sanitizeChurchLandingForSave(
  content: ChurchLandingContent,
  churchName = 'Our Church',
): ChurchLandingContent {
  assertLandingSaveableImages(content);
  let next = normalizeChurchLanding({ ...content, published: true });

  const headline =
    next.hero.headline?.trim() ||
    next.heroSlides?.[0]?.headline?.trim() ||
    `Welcome to ${churchName}`;
  const aboutTitle = next.about.title?.trim() || 'About Us';
  const aboutBody =
    next.about.body?.trim() ||
    `${churchName} is a Christ-centered community. Update this section in Church landing settings.`;

  next = {
    ...next,
    hero: {
      ...next.hero,
      headline,
      imageUrl: sanitizeLandingImageUrl(next.hero.imageUrl) ?? undefined,
    },
    about: {
      ...next.about,
      title: aboutTitle,
      body: aboutBody,
      pastorImageUrl: sanitizeLandingImageUrl(next.about.pastorImageUrl) ?? undefined,
    },
    serviceTimes: next.serviceTimes.filter(
      (s) => s.title.trim().length > 0 && s.schedule.trim().length > 0,
    ),
    quickLinks: next.quickLinks.filter((l) => l.title.trim().length > 0),
    announcements: next.announcements
      .filter((a) => a.title.trim().length > 0)
      .map((a) => ({
        ...a,
        imageUrl: sanitizeLandingImageUrl(a.imageUrl) ?? undefined,
      })),
    stats: next.stats.filter((s) => s.label.trim().length > 0 && s.value.trim().length > 0),
    heroSlides: (next.heroSlides ?? [])
      .map((s) => {
        const imageUrl = sanitizeLandingImageUrl(s.imageUrl);
        return imageUrl ? { ...s, imageUrl } : null;
      })
      .filter((s): s is LandingHeroSlide => s !== null),
  };

  if (next.mandate) {
    const title = next.mandate.title?.trim() ?? '';
    const quote = next.mandate.quote?.trim() ?? '';
    if (!title || !quote) {
      const { mandate: _removed, ...withoutMandate } = next;
      next = withoutMandate as ChurchLandingContent;
    } else {
      next = { ...next, mandate: { ...next.mandate, title, quote } };
    }
  }

  if (!next.heroSlides?.length) {
    next = normalizeChurchLanding(next, churchName);
  }

  if (next.socialFeed) {
    next = {
      ...next,
      socialFeed: ensureSocialFeedWithSamples(next.socialFeed, churchName),
    };
  } else {
    next = {
      ...next,
      socialFeed: ensureSocialFeedWithSamples(undefined, churchName),
      communitySupport: next.communitySupport ?? buildDefaultCommunitySupportSection(),
    };
  }

  return next;
}

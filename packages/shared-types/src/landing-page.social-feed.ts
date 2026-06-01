import { z } from 'zod';

export const LANDING_MESSAGE_MEDIA_TYPES = ['youtube', 'mp3', 'spotify'] as const;
export type LandingMessageMediaType = (typeof LANDING_MESSAGE_MEDIA_TYPES)[number];

export const landingGoogleReviewSchema = z.object({
  id: z.string().optional(),
  author: z.string().min(1).max(120),
  rating: z.number().min(1).max(5).optional(),
  text: z.string().min(1).max(2000),
  dateLabel: z.string().max(80).optional(),
});

export const landingMessageItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  mediaType: z.enum(LANDING_MESSAGE_MEDIA_TYPES),
  /** YouTube URL/ID, direct MP3 URL, or Spotify link/embed URL */
  mediaUrl: z.string().min(1).max(2048),
});

/** @deprecated Legacy shape — migrated to `messages` on read */
export const landingYoutubeVideoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  videoId: z.string().min(6).max(500),
});

export const landingSocialFeedSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(500).optional(),
  reviews: z.object({
    enabled: z.boolean(),
    googlePlaceId: z.string().max(200).optional(),
    googleMapsUrl: z.string().max(500).optional(),
    items: z.array(landingGoogleReviewSchema).max(24),
  }),
  messages: z.object({
    enabled: z.boolean(),
    /** @deprecated Use youtubeChannelUrl */
    channelUrl: z.string().max(500).optional(),
    youtubeChannelUrl: z.string().max(500).optional(),
    spotifyChannelUrl: z.string().max(500).optional(),
    items: z.array(landingMessageItemSchema).max(12),
  }),
});

export type LandingGoogleReview = z.infer<typeof landingGoogleReviewSchema>;
export type LandingMessageItem = z.infer<typeof landingMessageItemSchema>;
export type LandingSocialFeed = z.infer<typeof landingSocialFeedSchema>;

export function parseYoutubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  const youtuBe = raw.match(/(?:youtu\.be\/)([\w-]{11})/i);
  if (youtuBe?.[1]) return youtuBe[1];
  const watch = raw.match(/(?:[?&]v=)([\w-]{11})/i);
  if (watch?.[1]) return watch[1];
  const embed = raw.match(/\/embed\/([\w-]{11})/i);
  if (embed?.[1]) return embed[1];
  const shorts = raw.match(/\/shorts\/([\w-]{11})/i);
  if (shorts?.[1]) return shorts[1];
  return null;
}

export function spotifyEmbedUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes('open.spotify.com/embed/')) return raw.split('?')[0] ?? raw;
  const open = raw.match(/open\.spotify\.com\/(episode|track|playlist|album)\/([a-zA-Z0-9]+)/i);
  if (open) return `https://open.spotify.com/embed/${open[1]}/${open[2]}`;
  return null;
}

function migrateLegacyYoutube(feed: Record<string, unknown>): LandingSocialFeed['messages'] | undefined {
  const youtube = feed.youtube as
    | { enabled?: boolean; channelUrl?: string; items?: { title: string; videoId: string; id?: string }[] }
    | undefined;
  if (!youtube) return undefined;
  return {
    enabled: youtube.enabled ?? true,
    channelUrl: youtube.channelUrl,
    items: (youtube.items ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      mediaType: 'youtube' as const,
      mediaUrl: v.videoId,
    })),
  };
}

export function buildDefaultSocialFeed(churchName: string): LandingSocialFeed {
  return {
    enabled: true,
    title: 'What people are saying',
    subtitle: `Community reviews and messages from ${churchName}.`,
    reviews: {
      enabled: true,
      googleMapsUrl: '',
      items: [
        {
          id: 'review-1',
          author: 'Visitor',
          rating: 5,
          text: 'A welcoming church with powerful worship and practical teaching. We felt at home from the first Sunday.',
          dateLabel: '2 weeks ago',
        },
        {
          id: 'review-2',
          author: 'Member',
          rating: 5,
          text: 'The community here genuinely cares for families. Ministries for youth and outreach are thriving.',
          dateLabel: '1 month ago',
        },
        {
          id: 'review-3',
          author: 'Guest',
          rating: 5,
          text: 'Spirit-filled services and friendly ushers. I recommend planning a visit if you are new to the area.',
          dateLabel: '2 months ago',
        },
      ],
    },
    messages: {
      enabled: true,
      youtubeChannelUrl: 'https://www.youtube.com/@churchhubdemo',
      spotifyChannelUrl: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
      items: [
        {
          id: 'msg-1',
          title: 'Sunday Worship Message',
          mediaType: 'youtube',
          mediaUrl: 'https://www.youtube.com/watch?v=1Siqlh8SGCo',
        },
        {
          id: 'msg-2',
          title: 'Faith & Purpose (Sunday)',
          mediaType: 'youtube',
          mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        {
          id: 'msg-3',
          title: 'Midweek Bible Study (Audio)',
          mediaType: 'mp3',
          mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        },
        {
          id: 'msg-4',
          title: 'Prayer & Intercession (Audio)',
          mediaType: 'mp3',
          mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        },
        {
          id: 'msg-5',
          title: 'Worship Playlist',
          mediaType: 'spotify',
          mediaUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        },
        {
          id: 'msg-6',
          title: 'Gospel Classics',
          mediaType: 'spotify',
          mediaUrl: 'https://open.spotify.com/album/1k8qEpw5Q7PaEpRQvKCduO',
        },
      ],
    },
  };
}

export function normalizeMessageItem(item: LandingMessageItem): LandingMessageItem | null {
  if (!item.title?.trim() || !item.mediaUrl?.trim()) return null;
  const title = item.title.trim();
  const mediaUrl = item.mediaUrl.trim();
  if (item.mediaType === 'youtube') {
    const id = parseYoutubeVideoId(mediaUrl);
    if (!id) return null;
    return { ...item, title, mediaType: 'youtube', mediaUrl: id };
  }
  if (item.mediaType === 'spotify') {
    const embed = spotifyEmbedUrl(mediaUrl);
    if (!embed) return null;
    return { ...item, title, mediaType: 'spotify', mediaUrl: embed };
  }
  if (item.mediaType === 'mp3') {
    if (!/^https?:\/\//i.test(mediaUrl)) return null;
    return { ...item, title, mediaType: 'mp3', mediaUrl };
  }
  return null;
}

export function normalizeSocialFeed(
  feed: LandingSocialFeed | (Record<string, unknown> & { enabled?: boolean }) | undefined,
  churchName: string,
): LandingSocialFeed | undefined {
  if (!feed) return undefined;

  const raw = feed as Record<string, unknown>;
  const messagesBlock =
    (raw.messages as LandingSocialFeed['messages'] | undefined) ?? migrateLegacyYoutube(raw);

  const items = (messagesBlock?.items ?? [])
    .map((m) => normalizeMessageItem(m as LandingMessageItem))
    .filter((m): m is LandingMessageItem => m !== null);

  const reviewItems = ((raw.reviews as LandingSocialFeed['reviews'])?.items ?? [])
    .filter((r) => r.author?.trim() && r.text?.trim())
    .map((r) => ({
      ...r,
      author: r.author.trim(),
      text: r.text.trim(),
      rating: r.rating ?? 5,
    }));

  const normalized: LandingSocialFeed = {
    enabled: Boolean(raw.enabled),
    title: (raw.title as string)?.trim() || 'What people are saying',
    subtitle:
      (raw.subtitle as string)?.trim() ||
      `Read community reviews and messages from ${churchName}.`,
    reviews: {
      enabled: (raw.reviews as LandingSocialFeed['reviews'])?.enabled ?? true,
      googlePlaceId: (raw.reviews as LandingSocialFeed['reviews'])?.googlePlaceId?.trim() || undefined,
      googleMapsUrl: (raw.reviews as LandingSocialFeed['reviews'])?.googleMapsUrl?.trim() || undefined,
      items: reviewItems,
    },
    messages: {
      enabled: messagesBlock?.enabled ?? true,
      youtubeChannelUrl:
        (messagesBlock as { youtubeChannelUrl?: string })?.youtubeChannelUrl?.trim() ||
        messagesBlock?.channelUrl?.trim() ||
        undefined,
      spotifyChannelUrl:
        (messagesBlock as { spotifyChannelUrl?: string })?.spotifyChannelUrl?.trim() || undefined,
      channelUrl:
        (messagesBlock as { youtubeChannelUrl?: string })?.youtubeChannelUrl?.trim() ||
        messagesBlock?.channelUrl?.trim() ||
        undefined,
      items,
    },
  };

  if (
    !normalized.enabled ||
    ((!normalized.reviews.enabled || reviewItems.length === 0) &&
      (!normalized.messages.enabled || items.length === 0))
  ) {
    return { ...normalized, enabled: false };
  }

  return normalized;
}

export function sanitizeSocialFeedForSave(
  feed: LandingSocialFeed | undefined,
  churchName: string,
): LandingSocialFeed | undefined {
  if (!feed) return undefined;
  return normalizeSocialFeed(feed, churchName);
}

/** Safe for public/admin UI — migrates legacy `youtube` and fills missing `messages`. */
export function resolveLandingSocialFeed(
  feed: LandingSocialFeed | (Record<string, unknown> & { enabled?: boolean }) | undefined,
  churchName: string,
): LandingSocialFeed | undefined {
  return ensureSocialFeedWithSamples(feed, churchName);
}

/** Migrates legacy data and fills sample messages when the column would otherwise be empty. */
export function ensureSocialFeedWithSamples(
  feed: LandingSocialFeed | (Record<string, unknown> & { enabled?: boolean }) | undefined,
  churchName: string,
): LandingSocialFeed | undefined {
  const defaults = buildDefaultSocialFeed(churchName);
  const normalized = normalizeSocialFeed(feed, churchName) ?? defaults;

  const messageItems =
    normalized.messages.items.length > 0 ? normalized.messages.items : defaults.messages.items;

  const hasReviews = normalized.reviews.items.length > 0;
  const hasMessages = messageItems.length > 0;
  if (!hasReviews && !hasMessages) {
    return { ...defaults, enabled: normalized.enabled };
  }

  return {
    ...normalized,
    enabled: normalized.enabled !== false,
    messages: {
      ...normalized.messages,
      enabled: normalized.messages.enabled !== false,
      youtubeChannelUrl:
        normalized.messages.youtubeChannelUrl ?? defaults.messages.youtubeChannelUrl,
      spotifyChannelUrl:
        normalized.messages.spotifyChannelUrl ?? defaults.messages.spotifyChannelUrl,
      channelUrl: normalized.messages.channelUrl ?? defaults.messages.youtubeChannelUrl,
      items: messageItems,
    },
  };
}

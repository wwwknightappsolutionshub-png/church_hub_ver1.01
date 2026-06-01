'use client';

import { ExternalLink, Headphones, Music2, Star, Youtube } from 'lucide-react';
import type { LandingMessageItem, LandingSocialFeed } from '@church-hub/shared-types';
import { parseYoutubeVideoId, resolveLandingSocialFeed } from '@church-hub/shared-types';
import { LandingSectionHeader } from './LandingSectionHeader';
import { churchSectionClass, landingCard, landingContainer } from './church-landing-classes';
import { cn } from '@/lib/utils';

function StarRow({ rating = 5 }: { rating?: number }) {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
            i < n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: LandingSocialFeed['reviews']['items'][number] }) {
  return (
    <article className={cn(landingCard, 'shrink-0')}>
      <StarRow rating={review.rating} />
      <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">
        &ldquo;{review.text}&rdquo;
      </p>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{review.author}</span>
        {review.dateLabel ? <span>{review.dateLabel}</span> : null}
      </footer>
    </article>
  );
}

function MessageMediaCard({ item }: { item: LandingMessageItem }) {
  const title = item.title;
  if (item.mediaType === 'youtube') {
    const videoId = parseYoutubeVideoId(item.mediaUrl) ?? item.mediaUrl;
    return (
      <div className={cn(landingCard, 'shrink-0 overflow-hidden p-0')}>
        <div className="aspect-video w-full bg-muted">
          <iframe
            title={title}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <p className="px-4 py-3 text-sm font-semibold sm:px-5">{title}</p>
      </div>
    );
  }
  if (item.mediaType === 'spotify') {
    return (
      <div className={cn(landingCard, 'shrink-0 overflow-hidden p-0')}>
        <iframe
          title={title}
          src={item.mediaUrl}
          className="h-[152px] w-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
        <p className="px-4 py-3 text-sm font-semibold sm:px-5">{title}</p>
      </div>
    );
  }
  return (
    <div className={cn(landingCard, 'shrink-0')}>
      <div className="flex items-center gap-2 text-primary">
        <Headphones className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Local audio</span>
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <audio controls preload="none" className="mt-4 w-full" src={item.mediaUrl}>
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}

function ScrollingColumn({
  children,
  className,
  trackClassName,
}: {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
}) {
  return (
    <div
      className={cn(
        'landing-scroll-column relative overflow-hidden rounded-2xl border border-border/70 bg-card/50 shadow-inner',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-card/95 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-card/95 to-transparent" />
      <div className={cn('landing-scroll-track flex flex-col gap-4 p-4 sm:p-5', trackClassName)}>
        {children}
        {children}
      </div>
    </div>
  );
}

export function LandingSocialFeedSection({
  feed: rawFeed,
  churchName,
}: {
  feed: LandingSocialFeed | (Record<string, unknown> & { enabled?: boolean });
  churchName: string;
}) {
  const feed = resolveLandingSocialFeed(rawFeed, churchName);
  if (!feed?.enabled) return null;

  const reviews = feed.reviews ?? { enabled: false, items: [] };
  const messages = feed.messages ?? { enabled: false, items: [] };

  const showReviews = reviews.enabled && reviews.items.length > 0;
  const showMessages = messages.enabled && messages.items.length > 0;
  if (!showReviews && !showMessages) return null;

  const googleHref =
    reviews.googleMapsUrl?.trim() ||
    (reviews.googlePlaceId
      ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(reviews.googlePlaceId)}`
      : null);

  const hasYoutube = messages.items.some((m) => m.mediaType === 'youtube');
  const youtubeChannelUrl = messages.youtubeChannelUrl ?? messages.channelUrl;
  const spotifyChannelUrl = messages.spotifyChannelUrl;

  return (
    <section id="reviews-messages" className={churchSectionClass('brand', { rule: true })}>
      <div className={landingContainer}>
        <LandingSectionHeader
          title={feed.title ?? 'What people are saying'}
          description={
            feed.subtitle ?? `Community reviews and messages from ${churchName}.`
          }
          align="center"
          tone="brand"
        />

        <div
          className={cn(
            'mt-8 grid gap-6 sm:mt-10 lg:gap-8',
            showReviews && showMessages ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto',
          )}
        >
          {showReviews ? (
            <div className="flex min-h-0 flex-col">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold text-white sm:text-xl">
                  Google reviews
                </h3>
                {googleHref ? (
                  <a
                    href={googleHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-amber-200 hover:text-white"
                  >
                    View on Google
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              <ScrollingColumn
                className="h-[min(28rem,70vh)] sm:h-[32rem]"
                trackClassName="landing-scroll-track-reviews"
              >
                {reviews.items.map((review) => (
                  <ReviewCard
                    key={review.id ?? `${review.author}-${review.text.slice(0, 24)}`}
                    review={review}
                  />
                ))}
              </ScrollingColumn>
            </div>
          ) : null}

          {showMessages ? (
            <div className="flex min-h-0 flex-col">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold text-white sm:text-xl">
                  Messages
                </h3>
                <div className="flex flex-wrap gap-3">
                  {youtubeChannelUrl && hasYoutube ? (
                    <a
                      href={youtubeChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-amber-200 hover:text-white"
                    >
                      <Youtube className="h-4 w-4" />
                      YouTube
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {spotifyChannelUrl ? (
                    <a
                      href={spotifyChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-amber-200 hover:text-white"
                    >
                      <Music2 className="h-4 w-4" />
                      Spotify
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
              <ScrollingColumn
                className="h-[min(28rem,70vh)] sm:h-[32rem]"
                trackClassName="landing-scroll-track-messages"
              >
                {messages.items.map((item) => (
                  <MessageMediaCard key={item.id ?? `${item.mediaType}-${item.mediaUrl}`} item={item} />
                ))}
              </ScrollingColumn>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

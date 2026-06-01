'use client';

import type { ChurchLandingContent, LandingMessageItem, LandingSocialFeed } from '@church-hub/shared-types';
import {
  LANDING_MESSAGE_MEDIA_TYPES,
  buildDefaultSocialFeed,
  resolveLandingSocialFeed,
} from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LandingMessageMp3Field } from './LandingMessageMp3Field';

function ensureFeed(draft: ChurchLandingContent, churchName: string): LandingSocialFeed {
  return (
    resolveLandingSocialFeed(draft.socialFeed, churchName) ??
    buildDefaultSocialFeed(churchName)
  );
}

export function ChurchLandingSocialFeedTab({
  draft,
  churchName,
  onChange,
}: {
  draft: ChurchLandingContent;
  churchName: string;
  onChange: (next: ChurchLandingContent) => void;
}) {
  const feed = ensureFeed(draft, churchName);

  const patchFeed = (patch: Partial<LandingSocialFeed>) => {
    onChange({ ...draft, socialFeed: { ...feed, ...patch } });
  };

  const patchReviews = (patch: Partial<LandingSocialFeed['reviews']>) => {
    patchFeed({ reviews: { ...feed.reviews, ...patch } });
  };

  const patchMessages = (patch: Partial<LandingSocialFeed['messages']>) => {
    patchFeed({ messages: { ...feed.messages, ...patch } });
  };

  const updateMessage = (index: number, patch: Partial<LandingMessageItem>) => {
    const items = [...feed.messages.items];
    items[index] = { ...items[index], ...patch };
    patchMessages({ items });
  };

  return (
    <div className="space-y-6">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={feed.enabled}
          onChange={(e) => patchFeed({ enabled: e.target.checked })}
        />
        Show full-width reviews & messages section on landing page
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Section title</Label>
          <Input value={feed.title ?? ''} onChange={(e) => patchFeed({ title: e.target.value })} />
        </div>
        <div>
          <Label>Section subtitle</Label>
          <Input value={feed.subtitle ?? ''} onChange={(e) => patchFeed({ subtitle: e.target.value })} />
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={feed.reviews.enabled}
            onChange={(e) => patchReviews({ enabled: e.target.checked })}
          />
          Google reviews column
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Add reviews from your Google Business Profile. They scroll automatically on the public page.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Google Place ID (optional)</Label>
            <Input
              value={feed.reviews.googlePlaceId ?? ''}
              placeholder="ChIJ…"
              onChange={(e) => patchReviews({ googlePlaceId: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label>Google Maps reviews URL (optional)</Label>
            <Input
              value={feed.reviews.googleMapsUrl ?? ''}
              placeholder="https://maps.google.com/…"
              onChange={(e) => patchReviews({ googleMapsUrl: e.target.value || undefined })}
            />
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {feed.reviews.items.map((review, index) => (
            <div key={review.id ?? index} className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Author</Label>
                  <Input
                    value={review.author}
                    onChange={(e) => {
                      const items = [...feed.reviews.items];
                      items[index] = { ...review, author: e.target.value };
                      patchReviews({ items });
                    }}
                  />
                </div>
                <div>
                  <Label>Rating (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={review.rating ?? 5}
                    onChange={(e) => {
                      const items = [...feed.reviews.items];
                      items[index] = {
                        ...review,
                        rating: Math.min(5, Math.max(1, Number(e.target.value) || 5)),
                      };
                      patchReviews({ items });
                    }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label>Review</Label>
                <Textarea
                  rows={3}
                  value={review.text}
                  onChange={(e) => {
                    const items = [...feed.reviews.items];
                    items[index] = { ...review, text: e.target.value };
                    patchReviews({ items });
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive"
                onClick={() => patchReviews({ items: feed.reviews.items.filter((_, i) => i !== index) })}
              >
                Remove review
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              patchReviews({
                items: [
                  ...feed.reviews.items,
                  {
                    id: `review-${Date.now()}`,
                    author: 'Guest',
                    rating: 5,
                    text: 'Share what visitors say about your church.',
                    dateLabel: 'Recently',
                  },
                ],
              })
            }
          >
            Add review
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={feed.messages.enabled}
            onChange={(e) => patchMessages({ enabled: e.target.checked })}
          />
          Messages column (YouTube, MP3, or Spotify)
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Add sermon videos, local MP3 files (hosted URL), or Spotify links. They appear in a scrolling feed.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>YouTube channel URL (optional)</Label>
            <Input
              value={feed.messages.youtubeChannelUrl ?? feed.messages.channelUrl ?? ''}
              placeholder="https://www.youtube.com/@YourChurch"
              onChange={(e) =>
                patchMessages({
                  youtubeChannelUrl: e.target.value || undefined,
                  channelUrl: e.target.value || undefined,
                })
              }
            />
          </div>
          <div>
            <Label>Spotify channel / show URL (optional)</Label>
            <Input
              value={feed.messages.spotifyChannelUrl ?? ''}
              placeholder="https://open.spotify.com/show/…"
              onChange={(e) => patchMessages({ spotifyChannelUrl: e.target.value || undefined })}
            />
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {feed.messages.items.map((item, index) => (
            <div key={item.id ?? index} className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title} onChange={(e) => updateMessage(index, { title: e.target.value })} />
                </div>
                <div>
                  <Label>Media type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={item.mediaType}
                    onChange={(e) =>
                      updateMessage(index, {
                        mediaType: e.target.value as LandingMessageItem['mediaType'],
                      })
                    }
                  >
                    {LANDING_MESSAGE_MEDIA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === 'mp3' ? 'Local MP3 (URL)' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                {item.mediaType === 'mp3' ? (
                  <LandingMessageMp3Field
                    mediaUrl={item.mediaUrl}
                    onMediaUrlChange={(url) => updateMessage(index, { mediaUrl: url })}
                  />
                ) : (
                  <>
                    <Label>
                      {item.mediaType === 'youtube' ? 'YouTube URL or video ID' : 'Spotify link'}
                    </Label>
                    <Input
                      value={item.mediaUrl}
                      placeholder={
                        item.mediaType === 'youtube'
                          ? 'https://www.youtube.com/watch?v=…'
                          : 'https://open.spotify.com/playlist/…'
                      }
                      onChange={(e) => updateMessage(index, { mediaUrl: e.target.value })}
                    />
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive"
                onClick={() => patchMessages({ items: feed.messages.items.filter((_, i) => i !== index) })}
              >
                Remove message
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              patchMessages({
                items: [
                  ...feed.messages.items,
                  {
                    id: `msg-${Date.now()}`,
                    title: 'Sunday message',
                    mediaType: 'youtube',
                    mediaUrl: '',
                  },
                ],
              })
            }
          >
            Add message
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ensureAnnouncementCarousel,
  stockAnnouncementImage,
  type LandingAnnouncement,
} from '@church-hub/shared-types';
import { Badge } from '@/components/ui/badge';
import { useCarouselAutoplay } from '@/lib/hooks/use-carousel-autoplay';
import { LandingModal } from './LandingModal';
import {
  churchSectionClass,
  landingCard,
  landingContainer,
  landingTouchControl,
  type ChurchSectionTone,
} from './church-landing-classes';
import { LandingSectionHeader } from './LandingSectionHeader';
import { cn } from '@/lib/utils';

const AUTO_SCROLL_MS = 4500;
const CARD_PREVIEW_CHARS = 140;

function useVisibleColumns() {
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setCols(3);
      else if (window.matchMedia('(min-width: 640px)').matches) setCols(2);
      else setCols(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return cols;
}

function announcementImage(item: LandingAnnouncement, index: number) {
  return item.imageUrl?.trim() || stockAnnouncementImage(index);
}

function previewBody(body: string) {
  if (body.length <= CARD_PREVIEW_CHARS) return body;
  const slice = body.slice(0, CARD_PREVIEW_CHARS);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 60 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function LandingAnnouncementsSection({
  announcements,
  sectionId = 'announcements',
  tone = 'elevated',
  className,
}: {
  announcements: LandingAnnouncement[];
  sectionId?: string;
  tone?: ChurchSectionTone;
  className?: string;
}) {
  const items = ensureAnnouncementCarousel(announcements);
  const visibleCols = useVisibleColumns();
  const maxIndex = Math.max(0, items.length - visibleCols);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<{
    item: LandingAnnouncement;
    index: number;
  } | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return maxIndex;
        if (next > maxIndex) return 0;
        return next;
      });
    },
    [maxIndex],
  );

  const advance = useCallback(() => go(1), [go]);

  const autoplayEnabled = items.length > visibleCols && maxIndex > 0;
  const { pauseProps } = useCarouselAutoplay({
    enabled: autoplayEnabled,
    intervalMs: AUTO_SCROLL_MS,
    onAdvance: advance,
  });

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  if (items.length === 0) return null;

  const showControls = items.length > visibleCols;
  const trackWidthPercent = (items.length / visibleCols) * 100;
  const cardWidthPercent = 100 / items.length;

  return (
    <>
      <section
        id={sectionId}
        className={cn(churchSectionClass(tone), className)}
        aria-roledescription="carousel"
        aria-label="Announcements"
      >
        <div className={landingContainer}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <LandingSectionHeader
              eyebrow="Updates"
              title="Announcements"
              align="left"
              tone={tone}
              className="flex-1"
            />
            {showControls && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className={cn(
                    landingTouchControl,
                    'border border-border bg-card text-foreground shadow-sm transition hover:bg-muted',
                  )}
                  aria-label="Previous announcements"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className={cn(
                    landingTouchControl,
                    'border border-border bg-card text-foreground shadow-sm transition hover:bg-muted',
                  )}
                  aria-label="Next announcements"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div
            className="relative mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-1 shadow-inner sm:mt-8 sm:p-2"
            {...pauseProps}
          >
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                width: `${trackWidthPercent}%`,
                transform: `translateX(-${(index * 100) / items.length}%)`,
              }}
            >
              {items.map((item, i) => (
                <article
                  key={item.id ?? `${item.title}-${i}`}
                  className={cn(
                    landingCard,
                    'flex shrink-0 flex-col overflow-hidden px-2 first:pl-0 last:pr-0 sm:px-3',
                  )}
                  style={{ width: `${cardWidthPercent}%` }}
                >
                  <button
                    type="button"
                    className="group flex w-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => setSelected({ item, index: i })}
                    aria-label={`Read announcement: ${item.title}`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={announcementImage(item, i)}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        Read more
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      {item.dateLabel && (
                        <Badge variant="outline" className="mb-3 w-fit text-xs">
                          {item.dateLabel}
                        </Badge>
                      )}
                      <h3 className="font-heading text-lg font-semibold leading-snug group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {previewBody(item.body)}
                      </p>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          </div>

          {showControls && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: maxIndex + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className="min-h-11 min-w-11 touch-manipulation rounded-full p-2"
                  onClick={() => setIndex(i)}
                  aria-label={`Show announcement group ${i + 1}`}
                  aria-current={i === index}
                >
                  <span
                    className={cn(
                      'block h-2 rounded-full transition-all',
                      i === index ? 'w-8 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50',
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <LandingModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.item.title ?? 'Announcement'}
        className="sm:max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selected.item.imageUrl?.trim() ||
                  stockAnnouncementImage(selected.index)
                }
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            {selected.item.dateLabel && (
              <Badge variant="outline" className="text-xs">
                {selected.item.dateLabel}
              </Badge>
            )}
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {selected.item.body}
            </p>
          </div>
        )}
      </LandingModal>
    </>
  );
}

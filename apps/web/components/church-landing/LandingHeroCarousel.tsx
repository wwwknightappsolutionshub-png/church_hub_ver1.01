'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChurchLandingContent, LandingHeroSlide } from '@church-hub/shared-types';
import { normalizeChurchLanding } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCarouselAutoplay } from '@/lib/hooks/use-carousel-autoplay';
import { landingTouchControl } from './church-landing-classes';
import { cn } from '@/lib/utils';

const AUTO_SCROLL_MS = 5500;

type HeroCopy = ChurchLandingContent['hero'];

function slideCopy(slide: LandingHeroSlide, hero: HeroCopy) {
  return {
    eyebrow: slide.eyebrow ?? hero.eyebrow,
    headline: slide.headline ?? hero.headline,
    subheadline: slide.subheadline ?? hero.subheadline,
  };
}

export function LandingHeroCarousel({
  landing,
  loginHref,
  variant = 'classic',
}: {
  landing: ChurchLandingContent;
  loginHref: string;
  variant?: 'classic' | 'modern';
}) {
  const normalized = normalizeChurchLanding(landing);
  const slides = normalized.heroSlides ?? [];
  const hero = normalized.hero;
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (delta: number) => {
      if (count < 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  const advance = useCallback(() => go(1), [go]);

  const { pauseProps } = useCarouselAutoplay({
    enabled: count > 1,
    intervalMs: AUTO_SCROLL_MS,
    onAdvance: advance,
  });

  if (count === 0) return null;

  const copy = slideCopy(slides[index], hero);
  const isModern = variant === 'modern';

  return (
    <section
      className="relative w-full overflow-hidden border-b border-border"
      aria-roledescription="carousel"
      aria-label="Featured highlights"
      {...pauseProps}
    >
      <div className="relative h-[min(56dvh,520px)] w-full sm:h-[min(68dvh,600px)] lg:h-[min(78dvh,720px)]">
        {slides.map((slide, i) => (
          <div
            key={slide.id ?? slide.imageUrl}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-in-out',
              i === index ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none',
            )}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ))}

        <div
          aria-hidden
          className={cn(
            'absolute inset-0 z-10',
            isModern
              ? 'bg-gradient-to-r from-black/75 via-black/50 to-black/30'
              : 'bg-gradient-to-t from-black/80 via-black/45 to-black/25',
          )}
        />

        <div className="absolute inset-0 z-20 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 pb-14 sm:px-6 sm:py-16 sm:pb-16 lg:px-8 lg:py-20">
            <div key={index} className="max-w-3xl animate-fade-up text-white">
              {copy.eyebrow && (
                isModern ? (
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
                    {copy.eyebrow}
                  </p>
                ) : (
                  <Badge className="mb-4 border-white/30 bg-white/15 text-white hover:bg-white/20">
                    {copy.eyebrow}
                  </Badge>
                )
              )}
              <h1
                className={cn(
                  'font-heading font-bold leading-[1.1] text-white',
                  isModern
                    ? 'mt-3 text-3xl sm:mt-4 sm:text-5xl lg:text-6xl'
                    : 'text-3xl sm:text-5xl lg:text-[3.25rem]',
                )}
              >
                {copy.headline}
              </h1>
              {copy.subheadline && (
                <p
                  className={cn(
                    'mt-4 max-w-2xl text-base text-white/90 sm:mt-5 sm:text-lg',
                    isModern && 'lg:text-xl',
                  )}
                >
                  {copy.subheadline}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  variant={isModern ? 'secondary' : 'default'}
                  className={cn(
                    'h-12 w-full touch-manipulation sm:w-auto',
                    !isModern && 'shadow-lg',
                  )}
                  asChild
                >
                  <Link href={hero.ctaHref || loginHref}>
                    {hero.ctaLabel ?? 'Member sign in'}
                  </Link>
                </Button>
                {hero.secondaryCtaLabel && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full touch-manipulation border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
                    asChild
                  >
                    <Link href={hero.secondaryCtaHref ?? '#visit'}>
                      {hero.secondaryCtaLabel}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className={cn(
                landingTouchControl,
                'absolute left-2 top-1/2 z-30 -translate-y-1/2 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:left-6',
              )}
              onClick={() => go(-1)}
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              className={cn(
                landingTouchControl,
                'absolute right-2 top-1/2 z-30 -translate-y-1/2 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:right-6',
              )}
              onClick={() => go(1)}
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-0 right-0 z-30 flex justify-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id ?? slide.imageUrl}
                  type="button"
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === index ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80',
                  )}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          </>
        )}
        <div className="church-hero-fade" aria-hidden />
      </div>
    </section>
  );
}

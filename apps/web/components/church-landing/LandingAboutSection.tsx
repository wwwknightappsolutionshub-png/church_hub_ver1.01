'use client';

import { useMemo, useState } from 'react';
import type { ChurchLandingContent } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { LandingModal } from './LandingModal';
import {
  churchSectionClass,
  landingContainer,
  landingEyebrow,
  landingHeading,
  type ChurchSectionTone,
} from './church-landing-classes';
import { LandingSectionHeader } from './LandingSectionHeader';
import { cn } from '@/lib/utils';

const DEFAULT_PASTOR_IMAGE =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80';

const PREVIEW_MAX_CHARS = 280;

function truncateBody(text: string, max: number) {
  if (text.length <= max) return { preview: text, isTruncated: false };
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const preview = `${(lastSpace > 120 ? slice.slice(0, lastSpace) : slice).trim()}…`;
  return { preview, isTruncated: true };
}

export function LandingAboutSection({
  about,
  showEyebrow = true,
  tone = 'surface',
  className,
}: {
  about: ChurchLandingContent['about'];
  showEyebrow?: boolean;
  tone?: ChurchSectionTone;
  className?: string;
}) {
  const [readMoreOpen, setReadMoreOpen] = useState(false);
  const imageUrl = about.pastorImageUrl?.trim() || DEFAULT_PASTOR_IMAGE;
  const { preview, isTruncated } = useMemo(
    () => truncateBody(about.body, PREVIEW_MAX_CHARS),
    [about.body],
  );

  return (
    <>
      <section id="about" className={cn(churchSectionClass(tone, { rule: true }), className)}>
        <div className={landingContainer}>
          {showEyebrow ? (
            <LandingSectionHeader
              eyebrow="About"
              title={about.title}
              align="left"
              tone={tone}
              className="mb-8 lg:hidden"
            />
          ) : null}
          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="relative">
              <div className="overflow-hidden rounded-2xl bg-muted shadow-[0_20px_50px_-12px_hsl(222_47%_11%/0.18)] ring-1 ring-border/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={about.pastorName ? `Photo of ${about.pastorName}` : 'Senior pastor'}
                  className="aspect-[4/5] w-full object-cover object-top"
                />
              </div>
              {(about.pastorName || about.pastorTitle) && (
                <div className="mt-4 text-center lg:text-left">
                  {about.pastorName && (
                    <p className="font-heading text-lg font-semibold text-foreground">
                      {about.pastorName}
                    </p>
                  )}
                  {about.pastorTitle && (
                    <p className="text-sm font-medium text-primary">{about.pastorTitle}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              {showEyebrow ? (
                <div className="hidden lg:block">
                  <p className={landingEyebrow}>About</p>
                  <h2 className={cn(landingHeading, 'mt-2 sm:text-4xl')}>{about.title}</h2>
                  <div
                    className="church-section-divider mt-5 h-1 w-14 rounded-full bg-gradient-to-r from-primary to-[hsl(43_74%_49%)]"
                    aria-hidden
                  />
                </div>
              ) : (
                <h2 className={cn(landingHeading, 'sm:text-4xl')}>{about.title}</h2>
              )}
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
                {preview}
              </p>
              {isTruncated && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 h-11 touch-manipulation sm:mt-6"
                  onClick={() => setReadMoreOpen(true)}
                >
                  Read more
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <LandingModal
        open={readMoreOpen}
        onClose={() => setReadMoreOpen(false)}
        title={about.title}
      >
        <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {about.body}
        </p>
      </LandingModal>
    </>
  );
}

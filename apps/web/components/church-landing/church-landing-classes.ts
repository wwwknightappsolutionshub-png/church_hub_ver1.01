import { cn } from '@/lib/utils';

/** Alternating section surfaces for enterprise-grade visual rhythm */
export type ChurchSectionTone =
  | 'surface'
  | 'elevated'
  | 'accent'
  | 'brand'
  | 'muted'
  | 'inset';

const toneMap: Record<ChurchSectionTone, string> = {
  surface: 'church-section-surface',
  elevated: 'church-section-elevated',
  accent: 'church-section-accent',
  brand: 'church-section-brand',
  muted: 'church-section-muted',
  inset: 'church-section-inset',
};

export function churchSectionClass(
  tone: ChurchSectionTone,
  options?: { rule?: boolean; compact?: boolean },
) {
  return cn(
    'church-landing-section relative border-b border-border/40',
    toneMap[tone],
    options?.rule && 'church-section-has-rule',
    options?.compact ? 'py-8 sm:py-10' : 'py-10 sm:py-14 lg:py-16',
  );
}

/** @deprecated Use churchSectionClass('surface') */
export const landingSection = churchSectionClass('surface');

/** @deprecated Use churchSectionClass('elevated') */
export const landingSectionMuted = churchSectionClass('elevated');

export const landingContainer = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';

export const landingEyebrow =
  'church-section-eyebrow text-xs font-semibold uppercase tracking-[0.14em] text-primary sm:text-sm';

export const landingHeading =
  'church-section-title font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl';

export const landingSubheading =
  'church-section-desc mt-2 text-base text-muted-foreground sm:mt-3 sm:text-lg';

/** Elevated content cards on banded sections */
export const landingCard =
  'rounded-2xl border border-border/70 bg-card p-5 shadow-[0_4px_24px_-6px_hsl(222_47%_11%/0.08)] ring-1 ring-black/[0.04] transition duration-300 sm:p-6 hover:border-primary/30 hover:shadow-[0_12px_40px_-8px_hsl(222_47%_11%/0.14)]';

export const landingCardFlat =
  'rounded-xl border border-border/60 bg-card/95 px-5 py-4 shadow-sm backdrop-blur-sm';

export const landingTouchControl =
  'flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full';

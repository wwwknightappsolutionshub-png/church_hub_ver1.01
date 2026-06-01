'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Loader2 } from 'lucide-react';
import type { LandingCommunitySupportSection, PublicCommunitySupportItem } from '@church-hub/shared-types';
import {
  isRegisteredMember,
  KONNECT_JOB_BOARD_PATH,
  landingMembershipSignupUrl,
} from '@/lib/landing-member-gate';
import { LandingSectionHeader } from './LandingSectionHeader';
import { churchSectionClass } from './church-landing-classes';
import { cn } from '@/lib/utils';

function SupportCard({
  item,
  disabled,
  checking,
  onOpen,
}: {
  item: PublicCommunitySupportItem;
  disabled: boolean;
  checking: boolean;
  onOpen: () => void;
}) {
  const Icon = item.requestType === 'JOB_SEARCH' ? Briefcase : Building2;
  const typeLabel = item.requestType === 'JOB_SEARCH' ? 'Job search' : 'Business search';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      className={cn(
        'landing-community-card shrink-0 rounded-2xl border border-border/70 bg-card/90 p-4 text-left shadow-sm transition',
        'hover:border-primary/40 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:pointer-events-none disabled:opacity-70',
        'w-[min(85vw,18rem)] sm:w-[22rem]',
      )}
      aria-label={`View ${item.title} on the job board`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {checking ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Icon className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{typeLabel}</p>
          <h4 className="mt-1 font-heading text-base font-semibold leading-snug">{item.title}</h4>
          <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{item.summary}</p>
          {item.location ? (
            <p className="mt-2 text-xs text-muted-foreground">{item.location}</p>
          ) : null}
          {item.submittedAtLabel ? (
            <p className="mt-2 text-[10px] text-muted-foreground/80">
              Posted {item.submittedAtLabel}
              {item.approvedAtLabel ? ` · Approved ${item.approvedAtLabel}` : ''}
              {item.validUntilLabel ? ` · Valid until ${item.validUntilLabel}` : ''}
            </p>
          ) : item.dateLabel ? (
            <p className="mt-2 text-xs text-muted-foreground/80">{item.dateLabel}</p>
          ) : null}
          <p className="mt-3 text-xs font-medium text-primary">Tap to view on Job Board →</p>
        </div>
      </div>
    </button>
  );
}

export function LandingCommunitySupportSection({
  churchSlug,
  section,
  items,
}: {
  churchSlug: string;
  section?: LandingCommunitySupportSection;
  items: PublicCommunitySupportItem[];
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const handleOpen = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const member = await isRegisteredMember();
      if (member) {
        router.push(KONNECT_JOB_BOARD_PATH);
      } else {
        router.push(landingMembershipSignupUrl(churchSlug));
      }
    } finally {
      setChecking(false);
    }
  }, [checking, churchSlug, router]);

  if (section?.enabled === false || items.length === 0) return null;

  const title = section?.title ?? 'Community Support';
  const subtitle =
    section?.subtitle ??
    'Job and business search requests posted by members of the church (shared anonymously after approval).';

  const duplicated = [...items, ...items];

  return (
    <section id="community-support" className={churchSectionClass('elevated', { rule: true })}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <LandingSectionHeader title={title} description={subtitle} align="center" tone="elevated" />

        <div className="landing-community-ticker relative mt-8 overflow-hidden sm:mt-10">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
          <div className="landing-community-track flex gap-4 sm:gap-5">
            {duplicated.map((item, i) => (
              <SupportCard
                key={`${item.id}-${i}`}
                item={item}
                disabled={checking}
                checking={checking}
                onOpen={() => void handleOpen()}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Posted anonymously · Members can tap a card to open the Job Board ·{' '}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => void handleOpen()}
          >
            Sign up to view listings
          </button>
        </p>
      </div>
    </section>
  );
}

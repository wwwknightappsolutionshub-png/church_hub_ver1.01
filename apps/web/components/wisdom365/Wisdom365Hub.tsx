'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Wisdom365EntitlementDto, Wisdom365MeResponse } from '@church-hub/shared-types';
import { Wisdom365Hero } from '@/components/wisdom365/Wisdom365Hero';
import { Wisdom365JourneyPanel } from '@/components/wisdom365/Wisdom365JourneyPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WISDOM365_TAGLINE } from '@/lib/wisdom365';
import { Wisdom365RenewalBanner } from '@/components/wisdom365/Wisdom365RenewalBanner';

export function Wisdom365Hub({
  me,
  onRefresh,
  licensePricePence,
}: {
  me: Wisdom365MeResponse;
  onRefresh: () => void;
  licensePricePence?: number;
}) {
  const [active, setActive] = useState<Wisdom365EntitlementDto | null>(
    me.entitlements.length === 1 ? me.entitlements[0] : null,
  );

  if (active) {
    return (
      <Wisdom365JourneyPanel
        variant={active.variant}
        subscriptions={me.subscriptions ?? []}
        licensePricePence={licensePricePence}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Wisdom365RenewalBanner
        subscriptions={me.subscriptions ?? []}
        licensePricePence={licensePricePence}
      />
      <Wisdom365Hero description={WISDOM365_TAGLINE} streakLabel="Your provisioned journeys" />

      {me.unassignedLicenses > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-center text-sm">
            You have {me.unassignedLicenses} unassigned license(s).{' '}
            <Link href="/dashboard/wisdom365/assign" className="font-semibold text-amber-700 underline">
              Assign journeys
            </Link>
          </p>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <h2 className="font-heading text-lg font-bold">My journeys</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {me.entitlements.map((e) => (
            <button
              key={e.assignmentId}
              type="button"
              onClick={() => setActive(e)}
              className="overflow-hidden rounded-xl border text-left transition hover:border-amber-500/60 hover:shadow-md"
            >
              <div className="relative h-32">
                <Image src={e.variant.imageUrl} alt="" fill className="object-cover" sizes="300px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <p className="font-semibold text-white">{e.variant.name}</p>
                    <p className="text-xs text-white/80">{e.variant.bibleTranslationLabel}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add another journey</CardTitle>
            <CardDescription>Purchase more licenses to unlock additional life journeys.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/wisdom365?buy=1">
                <Plus className="h-4 w-4" /> Buy licenses
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

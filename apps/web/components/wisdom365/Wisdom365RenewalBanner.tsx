'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { Wisdom365SubscriptionSummary } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { formatPence } from '@/lib/wisdom365-api';

export function Wisdom365RenewalBanner({
  subscriptions,
  licensePricePence = 1000,
}: {
  subscriptions: Wisdom365SubscriptionSummary[];
  licensePricePence?: number;
}) {
  const due = subscriptions.filter((s) => s.needsRenewal || s.isExpired);
  if (due.length === 0) return null;

  const sub = due[0];
  const expired = sub.isExpired;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            {expired ? (
              <p className="font-medium">Your Wisdom365+ subscription has expired.</p>
            ) : (
              <p className="font-medium">
                Renewal in {sub.daysRemaining} day{sub.daysRemaining !== 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {sub.licenseCount} license(s)
              {sub.periodEnd
                ? ` · was valid until ${new Date(sub.periodEnd).toLocaleDateString('en-GB')}`
                : ''}
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="bg-amber-500 text-slate-950 hover:bg-amber-400">
          <Link href="/dashboard/wisdom365?buy=1">Renew — from {formatPence(licensePricePence)}</Link>
        </Button>
      </div>
    </div>
  );
}

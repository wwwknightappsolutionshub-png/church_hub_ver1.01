'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, Sparkles, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { Wisdom365CatalogResponse } from '@/lib/wisdom365-api';
import {
  createWisdom365Checkout,
  completeDevCheckout,
  formatPence,
} from '@/lib/wisdom365-api';
import { WISDOM365_TAGLINE } from '@/lib/wisdom365';
import { Wisdom365Hero } from '@/components/wisdom365/Wisdom365Hero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function quoteForCount(catalog: Wisdom365CatalogResponse, count: number) {
  const unit = catalog.product?.licensePricePence ?? 1000;
  const min = catalog.product?.multiLicenseMinCount ?? 2;
  const pct = catalog.product?.multiLicenseDiscountPercent ?? 20;
  const subtotal = unit * count;
  const discountPence = count >= min ? Math.round(subtotal * (pct / 100)) : 0;
  return {
    licenseCount: count,
    unitPricePence: unit,
    subtotalPence: subtotal,
    discountPercent: count >= min ? pct : 0,
    discountPence,
    totalPence: subtotal - discountPence,
    currency: catalog.product?.currency ?? 'GBP',
  };
}

export function Wisdom365Landing({
  catalog,
  onRefresh,
}: {
  catalog: Wisdom365CatalogResponse;
  onRefresh: () => void;
}) {
  const [licenseCount, setLicenseCount] = useState(1);
  const [busy, setBusy] = useState(false);

  const quote = quoteForCount(catalog, licenseCount);

  const handleCheckout = async () => {
    setBusy(true);
    try {
      const result = await createWisdom365Checkout(licenseCount);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.devMode) {
        await completeDevCheckout(result.subscriptionId);
        toast.success('Subscription activated (dev mode)');
        onRefresh();
        window.location.href = `/dashboard/wisdom365/assign?subscriptionId=${result.subscriptionId}`;
        return;
      }
      toast.error('Checkout could not be started');
    } catch (e) {
      toast.error('Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Wisdom365Hero description={WISDOM365_TAGLINE} />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h2 className="font-heading text-xl font-bold sm:text-2xl">Choose your life journey</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Wisdom365+ offers tailored daily scripture for different seasons of life. Subscribe
            annually, buy one or more licenses, then assign each license to the journey that fits
            you.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.variants.map((v) => (
            <Card
              key={v.id}
              className="overflow-hidden border-border/80 transition hover:shadow-md"
            >
              <div className="relative h-36 w-full">
                <Image src={v.imageUrl} alt="" fill className="object-cover" sizes="400px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="font-semibold text-white">{v.name}</p>
                  <p className="text-[11px] text-white/80">{v.bibleTranslationLabel}</p>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{v.name}</CardTitle>
                <CardDescription className="line-clamp-3 text-sm">{v.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {v.requiresParentalConsent && (
                  <Badge variant="outline" className="text-xs">
                    Parent-managed
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-card dark:border-amber-900/40 dark:from-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Annual subscription
            </CardTitle>
            <CardDescription>
              {formatPence(quote.unitPricePence)} per license / year ·{' '}
              {catalog.product?.multiLicenseDiscountPercent ?? 20}% off when you buy{' '}
              {catalog.product?.multiLicenseMinCount ?? 2}+ licenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLicenseCount(n)}
                  className={cn(
                    'min-h-11 min-w-[3rem] rounded-lg border px-4 text-sm font-semibold transition',
                    licenseCount === n
                      ? 'border-amber-500 bg-amber-500 text-slate-950'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                >
                  {n}
                </button>
              ))}
              <span className="self-center text-sm text-muted-foreground">license(s)</span>
            </div>

            <div className="rounded-lg border bg-background/80 p-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPence(quote.subtotalPence)}</span>
              </div>
              {quote.discountPence > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Multi-license discount ({quote.discountPercent}%)</span>
                  <span>−{formatPence(quote.discountPence)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Total (annual)</span>
                <span>{formatPence(quote.totalPence)}</span>
              </div>
            </div>

            <Button
              className="h-12 w-full gap-2 bg-amber-500 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              onClick={handleCheckout}
              disabled={busy || catalog.checkoutAvailable === false}
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Buy {licenseCount} license{licenseCount > 1 ? 's' : ''} & continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {catalog.checkoutAvailable === false
                ? 'Subscriptions are paused by your platform operator. Contact support to enable checkout.'
                : 'After payment you&apos;ll assign each license to a journey variant.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { Loader2, MapPin } from 'lucide-react';
import type { MembershipFamilyMapDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FamilyMapCanvas = dynamic(
  () => import('@/components/membership/FamilyMapCanvas').then((m) => m.FamilyMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,520px)] items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export function CongregantsFamilyMapView() {
  const { data, isLoading, error, refetch } = useApiQuery<MembershipFamilyMapDto>(
    ['membership-family-map'],
    '/membership/family-map',
  );

  const pins = data?.pins ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" data-testid="congregants-family-map">
      <div className="text-center sm:text-left">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Family Map</h2>
        <p className="text-sm text-muted-foreground">
          Household locations pinned from post codes on active family records.
        </p>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center justify-center gap-2 text-base sm:justify-start">
              <MapPin className="h-4 w-4" />
              Membership map
            </CardTitle>
            <CardDescription className="text-center sm:text-left">
              Add a post code on each family record to appear on the map.
            </CardDescription>
          </div>
          {!isLoading && data ? (
            <div className="flex justify-center gap-2 sm:justify-end">
              <Badge variant="secondary">{pins.length} pinned</Badge>
              {data.skipped > 0 ? (
                <Badge variant="outline">{data.skipped} without coordinates</Badge>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[min(70vh,520px)] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm">
              <p className="text-destructive">Could not load family map data.</p>
              <p className="mt-2 text-muted-foreground">
                Restart the API server if you recently added this module, then refresh.
              </p>
              <button
                type="button"
                className="mt-3 font-semibold text-primary underline"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          ) : pins.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No families with a post code yet. Edit a family and add a post code to see pins here.
            </p>
          ) : (
            <FamilyMapCanvas pins={pins} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

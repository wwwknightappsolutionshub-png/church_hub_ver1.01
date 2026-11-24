'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { OutreachMapPointDto } from '@church-hub/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const OutreachMapInner = dynamic(
  () => import('@/components/outreach/OutreachMapInner').then((m) => m.OutreachMapInner),
  { ssr: false, loading: () => <Loader2 className="mx-auto h-8 w-8 animate-spin" /> },
);

export function OutreachMapPanel({
  campaignId,
  dateFrom,
  dateTo,
}: {
  campaignId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString();
  const to = dateTo || new Date().toISOString();
  const params = new URLSearchParams({ from, to });
  if (campaignId) params.set('campaignId', campaignId);

  const { data, isLoading } = useApiQuery<OutreachMapPointDto[]>(
    ['outreach-map', from, to, campaignId],
    `/outreach/map-points?${params.toString()}`,
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Territory map</CardTitle>
        <CardDescription>Geo-tagged captures (leaders).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No geo-tagged captures in this range.</p>
        ) : (
          <OutreachMapInner points={data} />
        )}
      </CardContent>
    </Card>
  );
}
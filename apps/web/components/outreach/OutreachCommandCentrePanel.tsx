'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { OutreachCommandCentreDto } from '@church-hub/shared-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function queryUrl(from: string, to: string, campaignId: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (campaignId) params.set('campaignId', campaignId);
  return `/outreach/command-centre?${params.toString()}`;
}

export function OutreachCommandCentrePanel({
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
  const { data, isLoading } = useApiQuery<OutreachCommandCentreDto>(
    ['outreach-command-centre', from, to, campaignId],
    queryUrl(from, to, campaignId),
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Command centre</CardTitle>
        <CardDescription>Capture source, Establishment handoff, and stuck leads.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{data.summary.total} captures</Badge>
              <Badge variant="outline">{data.summary.withFollowUp} in Establishment</Badge>
              <Badge variant="destructive">{data.summary.stuck} stuck</Badge>
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-2 py-1.5">Contact</th>
                    <th className="px-2 py-1.5">Source</th>
                    <th className="px-2 py-1.5">Stage</th>
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-1.5">
                        {r.firstName} {r.lastName ?? ''}
                        {r.stuck ? (
                          <span className="ml-1 text-destructive">• stuck</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.captureSource}</td>
                      <td className="px-2 py-1.5">{r.establishmentStage ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right">
                        {r.followUpId ? (
                          <Link
                            href={`/dashboard/establishment?followUpId=${encodeURIComponent(r.followUpId)}`}
                            className="font-medium text-primary hover:underline"
                          >
                            Open
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
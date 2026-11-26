'use client';

import { Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useOutreachRange } from '@/components/outreach/use-outreach-range';
import type { OutreachTeamScorecardDto } from '@church-hub/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function OutreachScorecardPanel({
  campaignId,
  dateFrom,
  dateTo,
}: {
  campaignId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const { from, to } = useOutreachRange(dateFrom, dateTo);
  const params = new URLSearchParams({ from, to });
  if (campaignId) params.set('campaignId', campaignId);

  const { data, isLoading, isError, refetch } = useApiQuery<OutreachTeamScorecardDto>(
    ['outreach-scorecard', from, to, campaignId],
    `/outreach/team-scorecard?${params.toString()}`,
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Team scorecard</CardTitle>
        <CardDescription>Evangelist captures, handoffs, and 72h first progress.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : isError || !data ? (
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Team scorecard could not be loaded. Retry
          </button>
        ) : (
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/80 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="px-2 py-1.5">Team</th>
                  <th className="px-2 py-1.5">Captures</th>
                  <th className="px-2 py-1.5">QR</th>
                  <th className="px-2 py-1.5">Handoff</th>
                  <th className="px-2 py-1.5">72h progress</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.evangelistId ?? r.label} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{r.label}</td>
                    <td className="px-2 py-1.5">{r.captures}</td>
                    <td className="px-2 py-1.5">{r.qrAttributed}</td>
                    <td className="px-2 py-1.5">{r.withFollowUp}</td>
                    <td className="px-2 py-1.5">
                      {Math.round(r.firstProgressRate * 100)}% ({r.firstProgressWithin72h})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import { Loader2 } from 'lucide-react';
import { MINISTRY_CELLS_DESKTOP_MQ } from '@/components/ministry-cells/layout';
import type { BranchRow } from '@/components/ministry-cells/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface BranchMetric {
  branchId: string;
  name: string;
  location: string | null;
  memberCount: number;
  leader: string | null;
  avgAttendance: number;
  reportCompliance: number;
  incidentCount: number;
  openIncidents: number;
  prayerCount: number;
  messageCount: number;
}

export function MinistryCellsAnalyticsPanel({
  branches,
  analyticsFrom,
  analyticsTo,
  filterBranchId,
  filterLocation,
  onAnalyticsFrom,
  onAnalyticsTo,
  onFilterBranchId,
  onFilterLocation,
  analytics,
  loading,
}: {
  branches: BranchRow[];
  analyticsFrom: string;
  analyticsTo: string;
  filterBranchId: string;
  filterLocation: string;
  onAnalyticsFrom: (v: string) => void;
  onAnalyticsTo: (v: string) => void;
  onFilterBranchId: (v: string) => void;
  onFilterLocation: (v: string) => void;
  analytics: { totals: Record<string, number>; branchMetrics: BranchMetric[] } | undefined;
  loading: boolean;
}) {
  const { matches: isDesktopLayout, ready: layoutReady } = useMediaQuery(MINISTRY_CELLS_DESKTOP_MQ);
  const useDesktopComparison = layoutReady && isDesktopLayout;
  const thClass =
    'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground';

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)]">
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-2.5 pb-0">
            <CardTitle className="text-sm font-semibold">Performance filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 pb-3 pt-2 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <Label htmlFor="analytics-from" className="text-xs">
                From
              </Label>
              <Input
                id="analytics-from"
                type="date"
                className="mt-0.5 h-9"
                value={analyticsFrom}
                onChange={(e) => onAnalyticsFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="analytics-to" className="text-xs">
                To
              </Label>
              <Input
                id="analytics-to"
                type="date"
                className="mt-0.5 h-9"
                value={analyticsTo}
                onChange={(e) => onAnalyticsTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-branch" className="text-xs">
                Branch
              </Label>
              <select
                id="filter-branch"
                className="mt-0.5 flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={filterBranchId}
                onChange={(e) => onFilterBranchId(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="filter-location" className="text-xs">
                Location
              </Label>
              <Input
                id="filter-location"
                className="mt-0.5 h-9"
                value={filterLocation}
                onChange={(e) => onFilterLocation(e.target.value)}
                placeholder="Filter by area"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="flex items-center justify-center shadow-sm">
            <CardContent className="py-8">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : analytics ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(analytics.totals).map(([key, val]) => (
              <Card key={key} className="min-w-[calc(50%-0.25rem)] flex-1 shadow-sm sm:min-w-[8rem]">
                <CardContent className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {key}
                    </p>
                    <p className="font-heading text-xl font-bold tabular-nums leading-tight">{val}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {!loading && analytics && layoutReady ? (
        useDesktopComparison ? (
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-2.5 pb-0">
              <CardTitle className="text-sm font-semibold">Branch comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-1">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className={thClass}>Branch</th>
                      <th className={thClass}>Leader</th>
                      <th className={cn(thClass, 'text-center')}>Members</th>
                      <th className={cn(thClass, 'text-center')}>Avg attendance</th>
                      <th className={cn(thClass, 'text-center')}>Report compliance</th>
                      <th className={cn(thClass, 'text-center')}>Incidents</th>
                      <th className={cn(thClass, 'text-center')}>Prayers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.branchMetrics.map((m) => (
                      <tr key={m.branchId} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.leader ?? '—'}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{m.memberCount}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{m.avgAttendance}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{m.reportCompliance}%</td>
                        <td className="px-3 py-2 text-center tabular-nums">{m.incidentCount}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{m.prayerCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Branch comparison</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {analytics.branchMetrics.map((m) => (
                <Card key={m.branchId} className="shadow-sm">
                  <CardContent className="space-y-1.5 px-3 py-2.5 text-sm">
                    <p className="font-heading font-semibold leading-tight">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.leader ?? 'No leader'}</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Members </span>
                        {m.memberCount}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg attendance </span>
                        {m.avgAttendance}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Compliance </span>
                        {m.reportCompliance}%
                      </div>
                      <div>
                        <span className="text-muted-foreground">Incidents </span>
                        {m.incidentCount}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

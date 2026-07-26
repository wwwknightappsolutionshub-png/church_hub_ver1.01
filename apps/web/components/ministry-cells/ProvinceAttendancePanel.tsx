'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProvinceAttendanceReport {
  province: { id: string; name: string; leader: { id: string; name: string; email: string } };
  from: string;
  to: string;
  branchCount: number;
  totals: {
    present: number;
    male: number;
    female: number;
    boys: number;
    girls: number;
    testifiers: number;
    firstTimers: number;
  };
  branches: {
    branchId: string;
    name: string;
    postcode: string | null;
    weeksRecorded: number;
    avgPresent: number;
    totals: {
      present: number;
      male: number;
      female: number;
      boys: number;
      girls: number;
      testifiers: number;
      firstTimers: number;
    };
  }[];
}

export function ProvinceAttendancePanel({ provinceId }: { provinceId: string }) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const path = useMemo(() => {
    const q = new URLSearchParams({ from, to });
    return `/ministry-cells/provinces/${provinceId}/attendance-report?${q}`;
  }, [provinceId, from, to]);

  const { data, isLoading } = useApiQuery<ProvinceAttendanceReport>(
    ['ministry-cells', 'province-attendance', provinceId, from, to],
    path,
    { enabled: !!provinceId },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}

      {data && (
        <>
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-2.5">
              <CardTitle className="text-sm font-semibold">
                {data.province.name} — attendance demography
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {data.branchCount} cells · Leader {data.province.leader.name}
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 px-4 pb-3 pt-0 sm:grid-cols-4">
              {(
                [
                  ['Present', data.totals.present],
                  ['Male', data.totals.male],
                  ['Female', data.totals.female],
                  ['Boys', data.totals.boys],
                  ['Girls', data.totals.girls],
                  ['Testifiers', data.totals.testifiers],
                  ['First timers', data.totals.firstTimers],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {data.branches.map((b) => (
              <Card key={b.branchId} className="shadow-sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.postcode ?? 'No postcode'} · {b.weeksRecorded} weeks · avg{' '}
                      {b.avgPresent} present
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>M {b.totals.male}</span>
                    <span>F {b.totals.female}</span>
                    <span>Boys {b.totals.boys}</span>
                    <span>Girls {b.totals.girls}</span>
                    <span>1st {b.totals.firstTimers}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {data.branches.length === 0 && (
              <p className="text-sm text-muted-foreground">No cells in this province yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

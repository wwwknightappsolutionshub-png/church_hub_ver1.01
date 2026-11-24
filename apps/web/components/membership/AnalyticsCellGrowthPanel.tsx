'use client';

import type { MembershipAnalyticsCellGrowthDto } from '@church-hub/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsCellGrowthPanel({ cell }: { cell: MembershipAnalyticsCellGrowthDto }) {
  const maxPresent = Math.max(1, ...cell.weeklyAttendance.map((w) => w.present));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cell growth</CardTitle>
        <CardDescription>
          {cell.activeBranches} active branches · {cell.membersInCells} members in cells
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cell.weeklyAttendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cell attendance in this period.</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {cell.weeklyAttendance.map((w) => (
              <div key={w.period} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${Math.max(8, (w.present / maxPresent) * 100)}%` }}
                  title={`${w.period}: ${w.present} present`}
                />
                <span className="text-[9px] text-muted-foreground">{w.period.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
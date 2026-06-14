'use client';

import type { UsheringWeeklyAttendanceFlowDto } from '@church-hub/shared-types';
import { ArrowRight, Users } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CongregantsWeeklyAttendanceFlow() {
  const { data, isLoading } = useApiQuery<UsheringWeeklyAttendanceFlowDto>(
    ['membership-weekly-attendance-flow'],
    '/membership/weekly-attendance-flow?weeks=6',
  );
  const weeks = data?.weeks ?? [];

  if (isLoading) {
    return <DashboardPageSkeleton cards={1} />;
  }

  return (
    <Card className="border-slate-200/80 dark:border-slate-800" data-testid="weekly-attendance-flow">
      <CardHeader>
        <CardTitle className="text-base">Weekly attendance flow</CardTitle>
        <CardDescription>
          Sanctuary headcounts submitted by the Ushering service unit admin—Male, Female, Babies, Children, and total
          attendees over the last six weeks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {weeks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No ushering headcounts yet. Ushering unit admins can record weekly totals from the Ushering department
            Attendance tab.
          </p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-stretch gap-2">
              {weeks.map((week, index) => (
                <div key={week.period} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex w-[160px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60',
                      week.totalAttendees >= 100 && 'border-emerald-300 dark:border-emerald-800',
                      week.totalAttendees > 0 && week.totalAttendees < 30 && 'border-amber-300 dark:border-amber-800',
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {week.period}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-lg font-bold tabular-nums">
                      <Users className="h-4 w-4 text-primary" aria-hidden />
                      {week.totalAttendees}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      M {week.male} · F {week.female}
                      <br />
                      Babies {week.babies} · Children {week.children}
                    </p>
                  </div>
                  {index < weeks.length - 1 ? (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

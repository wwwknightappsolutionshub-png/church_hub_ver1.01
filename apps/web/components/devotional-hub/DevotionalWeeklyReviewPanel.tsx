'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import type { DevotionalWeeklyReviewDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function DevotionalWeeklyReviewPanel() {
  const queryClient = useQueryClient();
  const [weekKey, setWeekKey] = useState('');

  const review = useApiQuery<DevotionalWeeklyReviewDto>(
    ['devotional-weekly-review', weekKey],
    `/devotional-hub/weekly-review${weekKey ? `?weekKey=${weekKey}` : ''}`,
  );

  const r = review.data;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Weekly review
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Week {r?.weekKey ?? '…'} — what you finished, what you skipped, and suggested adjustments.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-[140px]"
              placeholder="e.g. 2026-W22"
              value={weekKey}
              onChange={(e) => setWeekKey(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['devotional-weekly-review'] })
              }
            >
              Load week
            </Button>
          </div>

          {review.isLoading && (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          )}

          {r && (
            <>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-md border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                  <p className="text-2xl font-semibold text-emerald-700">{r.stats.completedCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="rounded-md border bg-amber-50/50 p-3 dark:bg-amber-950/20">
                  <p className="text-2xl font-semibold text-amber-700">{r.stats.skippedCount}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-2xl font-semibold">{r.stats.pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Still open</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ReviewList title="Completed" items={r.completed.map((i) => i.title)} empty="Nothing marked complete yet." />
                <ReviewList title="Skipped" items={r.skipped.map((i) => i.title)} empty="No skipped items." />
              </div>

              {r.pending.length > 0 && (
                <ReviewList title="Still pending" items={r.pending.map((i) => i.title)} />
              )}

              {r.planProgress.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold">Reading progress</h4>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {r.planProgress.map((p) => (
                      <li key={p.planId}>
                        {p.planTitle} — day {p.lastDay}, streak {p.streakDays}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-md border border-dashed p-4">
                <h4 className="text-sm font-semibold">Suggested adjustments</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {r.suggestedAdjustments.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Track devotional challenges, badges, and weekly progress in the{' '}
        <strong className="font-medium text-foreground">Challenges</strong> tab.
      </p>
    </div>
  );
}

function ReviewList({
  title,
  items,
  empty = 'None',
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

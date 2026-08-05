'use client';

import { useMemo, useState } from 'react';
import {
  filterOutreachItems,
  OutreachAdvancedFiltersPanel,
} from '@/components/reports/outreach-advanced-filters';
import { formatAttendanceDate } from '@/components/reports/month-grouped-attendance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiQuery } from '@/lib/hooks/use-api-query';

type OutreachContactRow = {
  id: string;
  firstName: string;
  lastName?: string | null;
  convertStage: string;
  capturedAt: string;
  phone?: string | null;
};

export function AnalyticsOutreachFiltersSection() {
  const { data, isLoading } = useApiQuery<OutreachContactRow[]>(
    ['analytics-outreach-contacts'],
    '/outreach/contacts',
  );
  const [stage, setStage] = useState('all');
  const [monthKey, setMonthKey] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');

  const all = useMemo(() => data ?? [], [data]);
  const dateScoped = useMemo(
    () => filterOutreachItems(all, { stage: 'all', monthKey: 'all', dateFrom, dateTo }),
    [all, dateFrom, dateTo],
  );
  const filtered = useMemo(
    () => filterOutreachItems(dateScoped, { stage, monthKey, dateFrom: '', dateTo: '' }),
    [dateScoped, stage, monthKey],
  );

  const draftDirty = draftFrom !== dateFrom || draftTo !== dateTo;

  return (
    <section className="membership-hub-section space-y-4" aria-labelledby="outreach-filters-heading">
      <h2 id="outreach-filters-heading" className="text-lg font-semibold">
        Outreach advanced filters
      </h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Journey, month & totals</CardTitle>
          <CardDescription>
            Set dates and filters, then press Apply / Go to update the list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading outreach contacts…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="sr-only" htmlFor="analytics-outreach-from">
                    From
                  </label>
                  <input
                    id="analytics-outreach-from"
                    type="date"
                    className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">to</span>
                  <label className="sr-only" htmlFor="analytics-outreach-to">
                    To
                  </label>
                  <input
                    id="analytics-outreach-to"
                    type="date"
                    className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2.5 text-[11px]"
                    disabled={!draftDirty}
                    onClick={() => {
                      setDateFrom(draftFrom);
                      setDateTo(draftTo);
                    }}
                  >
                    Apply
                  </Button>
                  {(dateFrom || dateTo || draftFrom || draftTo) && (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-primary hover:underline"
                      onClick={() => {
                        setDraftFrom('');
                        setDraftTo('');
                        setDateFrom('');
                        setDateTo('');
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <OutreachAdvancedFiltersPanel
                  items={dateScoped}
                  stage={stage}
                  monthKey={monthKey}
                  onApply={(nextStage, nextMonth) => {
                    setStage(nextStage);
                    setMonthKey(nextMonth);
                  }}
                  onReset={() => {
                    setStage('all');
                    setMonthKey('all');
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {all.length} contacts
                </p>
                <Badge variant="outline" className="tabular-nums">
                  {filtered.length}
                </Badge>
              </div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No contacts match these filters.
                  </p>
                ) : (
                  filtered.slice(0, 40).map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-medium">
                        {c.firstName}
                        {c.lastName ? ` ${c.lastName}` : ''}
                      </span>
                      <span className="text-muted-foreground">
                        {c.convertStage.replace(/_/g, ' ')} · {formatAttendanceDate(c.capturedAt)}
                      </span>
                    </div>
                  ))
                )}
                {filtered.length > 40 ? (
                  <p className="text-[11px] text-muted-foreground">
                    +{filtered.length - 40} more not listed
                  </p>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

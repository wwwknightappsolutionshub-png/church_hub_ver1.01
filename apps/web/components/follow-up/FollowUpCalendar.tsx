'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { STAGE_LABELS, formatDue } from '@/lib/follow-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarLead {
  id: string;
  contactName: string;
  stage: string;
  dueAt: string | null;
  nextAction?: string | null;
  assignedTo?: { firstName: string; lastName: string } | null;
  archiveRequestedAt?: string | null;
}

interface FollowUpCalendarProps {
  onSelect: (id: string) => void;
  selectedId: string | null;
}

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function FollowUpCalendar({ onSelect, selectedId }: FollowUpCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const range = monthRange(cursor.year, cursor.month);

  const { data, isLoading } = useApiQuery<CalendarLead[]>(
    ['follow-up-calendar', String(cursor.year), String(cursor.month)],
    `/follow-up/calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<number, CalendarLead[]>();
    for (const item of data ?? []) {
      if (!item.dueAt) continue;
      const d = new Date(item.dueAt);
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue;
      const day = d.getDate();
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return map;
  }, [data, cursor.year, cursor.month]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const firstDow = new Date(cursor.year, cursor.month, 1).getDay();
  const totalDays = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayItems = useMemo(() => {
    if (!selectedId) return data ?? [];
    return (data ?? []).filter((i) => i.id === selectedId);
  }, [data, selectedId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold">Next-action calendar</h3>
          <p className="text-sm text-muted-foreground">
            All active leads with a due date and the action to take
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCursor((c) => {
                const m = c.month - 1;
                return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
              })
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-semibold">{monthLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCursor((c) => {
                const m = c.month + 1;
                return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
              })
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 rounded-xl border border-border bg-card p-2 text-sm">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="px-1 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((day, idx) => {
            const items = day ? itemsByDay.get(day) ?? [] : [];
            const isToday =
              day != null &&
              today.getFullYear() === cursor.year &&
              today.getMonth() === cursor.month &&
              today.getDate() === day;
            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[5.5rem] rounded-lg border border-transparent p-1',
                  day ? 'bg-muted/20' : 'bg-transparent',
                  isToday && 'border-primary/40 bg-primary/5',
                )}
              >
                {day != null && (
                  <>
                    <p className="text-[11px] font-semibold text-muted-foreground">{day}</p>
                    <div className="mt-1 space-y-1">
                      {items.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className={cn(
                            'block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium',
                            item.archiveRequestedAt
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100',
                            selectedId === item.id && 'ring-1 ring-primary',
                          )}
                          title={`${item.contactName}: ${item.nextAction || STAGE_LABELS[item.stage]}`}
                        >
                          {item.contactName}
                        </button>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{items.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Actions this month</h4>
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No due dates set for this month.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {(selectedId ? selectedDayItems : data ?? []).map((item) => {
              const due = formatDue(item.dueAt);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => onSelect(item.id)}
                  >
                    <div>
                      <p className="font-medium">{item.contactName}</p>
                      <p className="text-xs text-muted-foreground">
                        {STAGE_LABELS[item.stage] ?? item.stage}
                        {item.nextAction ? ` · ${item.nextAction}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.archiveRequestedAt && (
                        <Badge variant="destructive" className="text-[10px]">
                          Archive requested
                        </Badge>
                      )}
                      {due && (
                        <span
                          className={cn(
                            'text-xs font-medium',
                            due.overdue ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {due.overdue ? 'Overdue' : 'Due'} {due.label}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

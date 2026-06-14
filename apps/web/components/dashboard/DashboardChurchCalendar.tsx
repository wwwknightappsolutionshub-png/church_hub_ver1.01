'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CalendarItem {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  allDay: boolean;
  kind: string;
  isPinned: boolean;
  highlightColor?: string | null;
  source: string;
  editable: boolean;
}

function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function DashboardChurchCalendar() {
  const queryClient = useQueryClient();
  const { userRoles } = useModuleAccess();
  const canManage = isChurchLeadershipRole(userRoles);
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(today.toISOString().slice(0, 10));
  const [newHighlight, setNewHighlight] = useState('#1e3a5f');
  const [showAdd, setShowAdd] = useState(false);

  const range = monthRange(cursor.year, cursor.month);
  const { data, isLoading } = useApiQuery<{ items: CalendarItem[] }>(
    ['church-calendar', String(cursor.year), String(cursor.month)],
    `/church-calendar/feed?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<number, CalendarItem[]>();
    for (const item of data?.items ?? []) {
      const d = new Date(item.startsAt);
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue;
      const day = d.getDate();
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return map;
  }, [data?.items, cursor.year, cursor.month]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const firstDow = new Date(cursor.year, cursor.month, 1).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month);
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const addEvent = async () => {
    if (!newTitle.trim()) {
      toast.error('Event title is required');
      return;
    }
    try {
      await api.post('/church-calendar/events', {
        title: newTitle.trim(),
        startsAt: new Date(newDate).toISOString(),
        allDay: true,
        highlightColor: newHighlight,
      });
      toast.success('Event added');
      setNewTitle('');
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['church-calendar'] });
    } catch {
      toast.error('Could not add event');
    }
  };

  const togglePin = async (item: CalendarItem) => {
    if (!item.editable) return;
    try {
      await api.patch(`/church-calendar/events/${item.id}`, { isPinned: !item.isPinned });
      queryClient.invalidateQueries({ queryKey: ['church-calendar'] });
    } catch {
      toast.error('Could not update event');
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-sm" data-testid="dashboard-church-calendar">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">Church Calendar</CardTitle>
          <CardDescription>Events, birthdays, anniversaries, and pinned highlights</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() =>
              setCursor((c) =>
                c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-medium">{monthLabel}</span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() =>
              setCursor((c) =>
                c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            {showAdd ? (
              <>
                <Input
                  className="max-w-[200px]"
                  placeholder="Event title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Input
                  type="date"
                  className="max-w-[160px]"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <Input
                  type="color"
                  className="h-9 w-12 cursor-pointer p-1"
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  title="Highlight color"
                />
                <Button type="button" size="sm" onClick={addEvent}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add event
              </Button>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading calendar…</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[4.5rem]" />;
              const dayItems = itemsByDay.get(day) ?? [];
              const isToday =
                day === today.getDate() &&
                cursor.month === today.getMonth() &&
                cursor.year === today.getFullYear();
              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[4.5rem] rounded-lg border p-1 text-left sm:min-h-[5.5rem]',
                    isToday ? 'border-primary bg-primary/5' : 'border-border/60 bg-background',
                  )}
                >
                  <span className="text-[11px] font-medium tabular-nums">{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.title}
                        onClick={() => canManage && item.editable && togglePin(item)}
                        className={cn(
                          'block w-full truncate rounded px-1 py-0.5 text-left text-[9px] leading-tight sm:text-[10px]',
                          item.isPinned && 'ring-1 ring-amber-400',
                        )}
                        style={{
                          backgroundColor: item.highlightColor
                            ? `${item.highlightColor}22`
                            : undefined,
                          color: item.highlightColor ?? undefined,
                        }}
                      >
                        {item.isPinned ? '★ ' : ''}
                        {item.title}
                      </button>
                    ))}
                    {dayItems.length > 2 ? (
                      <span className="text-[9px] text-muted-foreground">+{dayItems.length - 2}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px]">
            Events
          </Badge>
          <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">
            Birthdays
          </Badge>
          <Badge variant="outline" className="border-violet-300 text-[10px] text-violet-700">
            Anniversaries
          </Badge>
          {canManage ? (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Pin className="h-3 w-3" /> Tap editable events to pin
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

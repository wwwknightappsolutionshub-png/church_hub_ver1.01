'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pin, Plus, X } from 'lucide-react';
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

function toDateInputValue(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function kindLabel(kind: string) {
  if (kind === 'birthday') return 'Birthday';
  if (kind === 'anniversary') return 'Anniversary';
  return 'Event';
}

export function DashboardChurchCalendar() {
  const queryClient = useQueryClient();
  const { userRoles } = useModuleAccess();
  const canManage = isChurchLeadershipRole(userRoles);
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
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

  const selectedDayLabel =
    selectedDay != null
      ? new Date(cursor.year, cursor.month, selectedDay).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  const selectedDayItems =
    selectedDay != null ? (itemsByDay.get(selectedDay) ?? []) : [];

  /** First empty day in the month — shows the double-click hint. */
  const hintDay = useMemo(() => {
    const total = daysInMonth(cursor.year, cursor.month);
    for (let day = 1; day <= total; day += 1) {
      if (!(itemsByDay.get(day)?.length)) return day;
    }
    return 1;
  }, [cursor.year, cursor.month, itemsByDay]);

  const firstDow = new Date(cursor.year, cursor.month, 1).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month);
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const openDayModal = (day: number, opts?: { startAdd?: boolean }) => {
    const dateValue = toDateInputValue(cursor.year, cursor.month, day);
    setSelectedDay(day);
    setNewDate(dateValue);
    setDayModalOpen(true);
    setShowAdd(Boolean(opts?.startAdd && canManage));
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    setShowAdd(false);
    setNewTitle('');
  };

  const shiftMonth = (delta: -1 | 1) => {
    closeDayModal();
    setSelectedDay(null);
    setCursor((c) => {
      if (delta < 0) {
        return c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 };
      }
      return c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 };
    });
  };

  const addEvent = async () => {
    if (!newTitle.trim()) {
      toast.error('Event title is required');
      return;
    }
    try {
      await api.post('/church-calendar/events', {
        title: newTitle.trim(),
        startsAt: new Date(`${newDate}T12:00:00`).toISOString(),
        allDay: true,
        highlightColor: newHighlight,
      });
      toast.success('Event added');
      setNewTitle('');
      setShowAdd(false);
      const parts = newDate.split('-').map(Number);
      if (parts[0] === cursor.year && parts[1] === cursor.month + 1 && parts[2]) {
        setSelectedDay(parts[2]);
        setDayModalOpen(true);
      }
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
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-medium">{monthLabel}</span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const day = selectedDay ?? today.getDate();
                openDayModal(
                  cursor.year === today.getFullYear() && cursor.month === today.getMonth()
                    ? Math.min(day, totalDays)
                    : 1,
                  { startAdd: true },
                );
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add event
            </Button>
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
              const isSelected = selectedDay === day && dayModalOpen;
              const showHint = day === hintDay && dayItems.length === 0;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => openDayModal(day)}
                  aria-pressed={isSelected}
                  title="Double-click to view or add events"
                  aria-label={`${toDateInputValue(cursor.year, cursor.month, day)}${
                    dayItems.length ? `, ${dayItems.length} item${dayItems.length === 1 ? '' : 's'}` : ''
                  }. Double-click to open`}
                  className={cn(
                    'min-h-[4.5rem] rounded-lg border p-1 text-left transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-[5.5rem]',
                    isToday && 'border-primary bg-primary/5',
                    isSelected && 'border-primary bg-primary/10 ring-2 ring-primary/30',
                    !isToday && !isSelected && 'border-border/60 bg-background',
                  )}
                >
                  <span className="text-[11px] font-medium tabular-nums">{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        title={item.title}
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
                      </span>
                    ))}
                    {dayItems.length > 2 ? (
                      <span className="text-[9px] text-muted-foreground">+{dayItems.length - 2}</span>
                    ) : null}
                    {showHint ? (
                      <span className="block px-0.5 text-[8px] leading-snug text-muted-foreground/80 sm:text-[9px]">
                        double click to add events
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {dayModalOpen && selectedDay != null ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
            onClick={closeDayModal}
          >
            <div
              className="flex max-h-[min(94vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-day-modal-title"
              data-testid="calendar-day-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <h2 id="calendar-day-modal-title" className="text-base font-semibold">
                    {selectedDayLabel}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedDayItems.length === 0
                      ? 'No events on this day'
                      : `${selectedDayItems.length} item${selectedDayItems.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="Close"
                  onClick={closeDayModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {selectedDayItems.length === 0 ? (
                  <p className="rounded-lg bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                    Nothing scheduled
                    {canManage ? '. Add an event below.' : '.'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedDayItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.isPinned ? '★ ' : ''}
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {kindLabel(item.kind)}
                            {item.description ? ` · ${item.description}` : ''}
                          </p>
                        </div>
                        {canManage && item.editable ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            onClick={() => togglePin(item)}
                            title={item.isPinned ? 'Unpin event' : 'Pin event'}
                          >
                            <Pin
                              className={cn(
                                'h-3.5 w-3.5',
                                item.isPinned && 'fill-current text-amber-500',
                              )}
                            />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {canManage ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    {showAdd ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Event title"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          autoFocus
                        />
                        <div className="flex flex-wrap items-center gap-2">
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
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={addEvent}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowAdd(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewDate(toDateInputValue(cursor.year, cursor.month, selectedDay));
                          setShowAdd(true);
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add for this day
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

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
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Double-click a day to view or add events
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

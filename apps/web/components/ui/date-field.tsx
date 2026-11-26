'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DateFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
};

function parseValue(value: string): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export function DateField({
  id,
  value,
  onChange,
  className,
  placeholder = 'Select date',
  min,
  max,
  disabled = false,
  'aria-label': ariaLabel,
  panelExtra,
  closeOnSelect = true,
}: DateFieldProps & {
  panelExtra?: React.ReactNode;
  closeOnSelect?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseValue(value), [value]);
  const [cursor, setCursor] = useState<Date>(() => selected ?? new Date());
  const minDate = useMemo(() => parseValue(min ?? ''), [min]);
  const maxDate = useMemo(() => parseValue(max ?? ''), [max]);

  useEffect(() => {
    if (selected) setCursor(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (target && !rootRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const isDisabled = (day: Date) => {
    if (minDate && day < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
      return true;
    }
    if (maxDate && day > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) {
      return true;
    }
    return false;
  };

  const pick = (day: Date) => {
    if (isDisabled(day)) return;
    onChange(toIsoDate(day));
    if (closeOnSelect) setOpen(false);
  };

  return (
    <div className={cn('relative min-w-0', className)} ref={rootRef}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm transition-colors',
          'hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          open && 'border-primary/50 ring-2 ring-primary/20',
          disabled && 'cursor-not-allowed opacity-50 hover:border-border',
        )}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-muted-foreground')}>
          {selected
            ? value.includes('T')
              ? `${format(selected, 'dd MMM yyyy')}, ${value.slice(11, 16)}`
              : format(selected, 'dd MMM yyyy')
            : placeholder}
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Date calendar'}
          className="absolute left-0 top-[calc(100%+0.4rem)] z-40 w-[18.5rem] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]"
        >
          <div className="border-b border-border/70 bg-gradient-to-br from-slate-50 via-white to-slate-50/40 px-3 py-3 dark:from-slate-900 dark:via-card dark:to-slate-900/40">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                aria-label="Previous month"
                onClick={() => setCursor((d) => addMonths(d, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-heading text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {format(cursor, 'MMMM yyyy')}
              </p>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                aria-label="Next month"
                onClick={() => setCursor((d) => addMonths(d, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-3 pb-2 pt-3">
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const inMonth = isSameMonth(day, cursor);
                const selectedDay = selected ? isSameDay(day, selected) : false;
                const today = isToday(day);
                const disabled = isDisabled(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(day)}
                    className={cn(
                      'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                      !inMonth && 'text-slate-300 dark:text-slate-600',
                      inMonth && !selectedDay && 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                      today && !selectedDay && 'font-semibold text-primary ring-1 ring-inset ring-primary/30',
                      selectedDay &&
                        'bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary',
                      disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          {panelExtra}
          <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-slate-500"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={() => {
                const today = new Date();
                if (!isDisabled(today)) {
                  onChange(toIsoDate(today));
                  setCursor(today);
                  setOpen(false);
                }
              }}
            >
              Today
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

/** Date and time picker that matches the app calendar, instead of the browser control. */
export function DateTimeField({
  id,
  value,
  onChange,
  className,
  placeholder = 'Select date and time',
  disabled = false,
  'aria-label': ariaLabel,
}: DateFieldProps) {
  const datePart = value.includes('T') ? value.slice(0, 10) : value.slice(0, 10);
  const timePart = value.includes('T') ? value.slice(11, 16) : '09:00';
  const [hour, minute] = (timePart || '09:00').split(':');

  const commit = (nextDate: string, nextHour: string, nextMinute: string) => {
    if (!nextDate) {
      onChange('');
      return;
    }
    onChange(`${nextDate}T${nextHour || '09'}:${nextMinute || '00'}`);
  };

  return (
    <DateField
      id={id}
      className={className}
      value={value}
      onChange={(d) => commit(d, hour || '09', minute || '00')}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      closeOnSelect={false}
      panelExtra={
        <div className="border-t border-border/70 px-3 py-2">
          <p className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Time
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'w-full rounded-md px-2 py-1 text-left text-xs tabular-nums',
                    (hour || '09') === h ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => commit(datePart.length === 10 ? datePart : '', h, minute || '00')}
                >
                  {h}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'w-full rounded-md px-2 py-1 text-left text-xs tabular-nums',
                    (minute || '00') === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => commit(datePart.length === 10 ? datePart : '', hour || '09', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}

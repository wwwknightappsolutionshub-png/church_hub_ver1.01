'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type AttendanceRecord = {
  id: string;
  weekStart: string;
  meetingDate: string | null;
  presentCount: number;
  maleCount: number;
  femaleCount: number;
  boysCount: number;
  girlsCount: number;
  testifiersCount: number;
  firstTimersCount: number;
  createdAt: string;
};

type WeeklyForm = {
  meetingDate: string;
  maleCount: string;
  femaleCount: string;
  childrenCount: string;
  testifiersCount: string;
  firstTimersCount: string;
};

const emptyForm = (): WeeklyForm => ({
  meetingDate: new Date().toISOString().slice(0, 10),
  maleCount: '',
  femaleCount: '',
  childrenCount: '',
  testifiersCount: '',
  firstTimersCount: '',
});

const FIELDS: {
  key: keyof Omit<WeeklyForm, 'meetingDate'>;
  label: string;
}[] = [
  { key: 'maleCount', label: 'Male' },
  { key: 'femaleCount', label: 'Female' },
  { key: 'childrenCount', label: 'Children' },
  { key: 'testifiersCount', label: 'Testifiers' },
  { key: 'firstTimersCount', label: 'First Timers' },
];

/** Digits only — whole numbers; empty string allowed while typing. */
function sanitizeWholeNumberInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

function parseWholeOrEmpty(raw: string): number | null {
  if (raw.trim() === '') return null;
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function toDateInput(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function childrenTotal(row: Pick<AttendanceRecord, 'boysCount' | 'girlsCount'>) {
  return (row.boysCount ?? 0) + (row.girlsCount ?? 0);
}

function formatMeetingLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BranchWeeklyAttendancePanel({
  branchId,
  canManage,
  onChanged,
}: {
  branchId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<WeeklyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof WeeklyForm, string>>>({});

  const { data: records = [], isLoading, refetch } = useApiQuery<AttendanceRecord[]>(
    ['ministry-cells', 'attendance', branchId],
    `/ministry-cells/branches/${branchId}/attendance`,
    { enabled: !!branchId },
  );

  useEffect(() => {
    setForm(emptyForm());
    setEditingId(null);
    setFieldErrors({});
  }, [branchId]);

  const counts = useMemo(() => {
    const male = parseWholeOrEmpty(form.maleCount) ?? 0;
    const female = parseWholeOrEmpty(form.femaleCount) ?? 0;
    const children = parseWholeOrEmpty(form.childrenCount) ?? 0;
    const testifiers = parseWholeOrEmpty(form.testifiersCount) ?? 0;
    const firstTimers = parseWholeOrEmpty(form.firstTimersCount) ?? 0;
    return {
      male,
      female,
      children,
      testifiers,
      firstTimers,
      present: male + female + children,
    };
  }, [form]);

  const recentAvg = useMemo(() => {
    if (!records.length) return null;
    const sample = records.slice(0, 4);
    const sum = sample.reduce((s, r) => s + (r.presentCount ?? 0), 0);
    return Math.round((sum / sample.length) * 10) / 10;
  }, [records]);

  const patchCount = (key: keyof Omit<WeeklyForm, 'meetingDate'>, raw: string) => {
    const next = sanitizeWholeNumberInput(raw);
    setForm((prev) => ({ ...prev, [key]: next }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof WeeklyForm, string>> = {};
    if (!form.meetingDate) next.meetingDate = 'Choose a meeting date';
    for (const { key, label } of FIELDS) {
      const raw = form[key];
      if (raw.trim() === '') continue;
      if (!/^\d+$/.test(raw.trim())) {
        next[key] = `${label} must be a whole number`;
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const startEdit = (row: AttendanceRecord) => {
    setEditingId(row.id);
    setFieldErrors({});
    setForm({
      meetingDate: toDateInput(row.meetingDate ?? row.weekStart),
      maleCount: String(row.maleCount ?? 0),
      femaleCount: String(row.femaleCount ?? 0),
      childrenCount: String(childrenTotal(row)),
      testifiersCount: String(row.testifiersCount ?? 0),
      firstTimersCount: String(row.firstTimersCount ?? 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFieldErrors({});
    setForm(emptyForm());
  };

  const buildPayload = () => {
    const meetingDate = form.meetingDate
      ? new Date(`${form.meetingDate}T12:00:00`)
      : new Date();
    const weekStart = new Date(meetingDate);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
    weekStart.setHours(0, 0, 0, 0);
    const children = parseWholeOrEmpty(form.childrenCount) ?? 0;
    return {
      weekStart: weekStart.toISOString(),
      meetingDate: meetingDate.toISOString(),
      maleCount: parseWholeOrEmpty(form.maleCount) ?? 0,
      femaleCount: parseWholeOrEmpty(form.femaleCount) ?? 0,
      boysCount: children,
      girlsCount: 0,
      testifiersCount: parseWholeOrEmpty(form.testifiersCount) ?? 0,
      firstTimersCount: parseWholeOrEmpty(form.firstTimersCount) ?? 0,
      presentCount: counts.present,
    };
  };

  const save = async () => {
    if (!validateForm()) {
      toast.error('Fix the highlighted fields — counts must be whole numbers');
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await api.patch(`/ministry-cells/branches/${branchId}/attendance/${editingId}`, payload);
        toast.success('Attendance updated — pastors and admins notified');
      } else {
        await api.post(`/ministry-cells/branches/${branchId}/attendance`, payload);
        toast.success('Attendance recorded — pastors and admins notified');
      }
      cancelEdit();
      await refetch();
      onChanged();
    } catch (e) {
      toast.error(
        apiErrorMessage(
          e,
          editingId ? 'Failed to update attendance' : 'Failed to record attendance',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Report header */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Weekly cell report
            </p>
            <h3 className="mt-1 font-heading text-xl font-bold tracking-tight">
              {editingId ? 'Edit attendance' : 'Submit attendance'}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Record meeting headcount for{' '}
              <span className="font-medium text-white">
                {form.meetingDate ? formatMeetingLabel(form.meetingDate) : 'today'}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[14rem]">
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Present</p>
              <p className="font-heading text-2xl font-bold tabular-nums">{counts.present}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Recent avg</p>
              <p className="font-heading text-2xl font-bold tabular-nums">
                {recentAvg == null ? '—' : recentAvg}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Entry form */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border/70 px-4 py-3 sm:px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            Meeting details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 py-4 sm:px-5">
          <div className="max-w-xs">
            <Label htmlFor="meeting-date" className="inline-flex items-center gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              Meeting date
            </Label>
            <div className="mt-1">
              <DateField
                id="meeting-date"
                aria-label="Meeting date"
                value={form.meetingDate}
                disabled={!canManage}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, meetingDate: v }));
                  setFieldErrors((prev) => {
                    if (!prev.meetingDate) return prev;
                    const copy = { ...prev };
                    delete copy.meetingDate;
                    return copy;
                  });
                }}
                placeholder="Select meeting date"
                className={cn(fieldErrors.meetingDate && '[&_button]:border-destructive')}
              />
            </div>
            {fieldErrors.meetingDate ? (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.meetingDate}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Headcount
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 xl:grid-cols-5">
              {FIELDS.map(({ key, label }) => (
                <div key={key} className="min-w-0">
                  <Label htmlFor={`weekly-${key}`} className="text-xs text-slate-600">
                    {label}
                  </Label>
                  <Input
                    id={`weekly-${key}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    placeholder="0"
                    className={cn(
                      'mt-1 h-9 tabular-nums',
                      fieldErrors[key] && 'border-destructive',
                    )}
                    value={form[key]}
                    onChange={(e) => patchCount(key, e.target.value)}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw !== '' && !/^\d+$/.test(raw)) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          [key]: `${label} must be a whole number`,
                        }));
                      }
                    }}
                    disabled={!canManage}
                    aria-invalid={Boolean(fieldErrors[key])}
                  />
                  {fieldErrors[key] ? (
                    <p className="mt-1 text-[11px] text-destructive">{fieldErrors[key]}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {canManage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <div className="text-sm text-muted-foreground">
                Total present{' '}
                <span className="font-heading text-lg font-bold tabular-nums text-foreground">
                  {counts.present}
                </span>
                <span className="ml-2 text-xs">
                  (M {counts.male} · F {counts.female} · C {counts.children})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId ? (
                  <Button type="button" variant="ghost" className="h-10" onClick={cancelEdit}>
                    Cancel
                  </Button>
                ) : null}
                <Button type="button" className="h-10" onClick={() => void save()} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? 'Save changes' : 'Record attendance'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border/70 px-4 py-3 sm:px-5">
          <CardTitle className="text-sm font-semibold">Attendance history</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Saved weekly reports for this cell
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
              No attendance recorded yet. Submit the first weekly report above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-center">M</th>
                    <th className="px-3 py-2.5 text-center">F</th>
                    <th className="px-3 py-2.5 text-center">C</th>
                    <th className="px-3 py-2.5 text-center">T</th>
                    <th className="px-3 py-2.5 text-center">FT</th>
                    <th className="px-3 py-2.5 text-center">Total</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => {
                    const dateLabel = toDateInput(row.meetingDate ?? row.weekStart);
                    const children = childrenTotal(row);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{formatMeetingLabel(dateLabel)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Saved {new Date(row.createdAt).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.maleCount}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.femaleCount}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{children}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.testifiersCount}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {row.firstTimersCount}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                          {row.presentCount}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {canManage ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

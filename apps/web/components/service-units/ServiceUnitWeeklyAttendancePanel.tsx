'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type WeeklyAttendanceForm = {
  meetingDate: string;
  maleCount: string;
  femaleCount: string;
  boysCount: string;
  girlsCount: string;
  testifiersCount: string;
  firstTimersCount: string;
};

export type ServiceUnitAttendanceRecord = {
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

const emptyForm = (): WeeklyAttendanceForm => ({
  meetingDate: new Date().toISOString().slice(0, 10),
  maleCount: '',
  femaleCount: '',
  boysCount: '',
  girlsCount: '',
  testifiersCount: '',
  firstTimersCount: '',
});

const FIELDS: { key: keyof WeeklyAttendanceForm; label: string }[] = [
  { key: 'maleCount', label: 'Male' },
  { key: 'femaleCount', label: 'Female' },
  { key: 'boysCount', label: 'Boys' },
  { key: 'girlsCount', label: 'Girls' },
  { key: 'testifiersCount', label: 'Testifiers' },
  { key: 'firstTimersCount', label: 'First Timers' },
];

function toDateInput(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function ServiceUnitWeeklyAttendancePanel({
  unitId,
  unitName,
  canManage,
}: {
  unitId: string;
  unitName: string;
  canManage: boolean;
}) {
  const [form, setForm] = useState<WeeklyAttendanceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: records = [], isLoading, refetch } = useApiQuery<ServiceUnitAttendanceRecord[]>(
    ['service-unit-attendance', unitId],
    `/service-units/${unitId}/attendance`,
    { enabled: !!unitId },
  );

  useEffect(() => {
    setForm(emptyForm());
    setEditingId(null);
  }, [unitId]);

  const demoTotal =
    (Number(form.maleCount) || 0) +
    (Number(form.femaleCount) || 0) +
    (Number(form.boysCount) || 0) +
    (Number(form.girlsCount) || 0);

  const patchForm = (patch: Partial<WeeklyAttendanceForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const startEdit = (row: ServiceUnitAttendanceRecord) => {
    setEditingId(row.id);
    setForm({
      meetingDate: toDateInput(row.meetingDate ?? row.weekStart),
      maleCount: String(row.maleCount ?? 0),
      femaleCount: String(row.femaleCount ?? 0),
      boysCount: String(row.boysCount ?? 0),
      girlsCount: String(row.girlsCount ?? 0),
      testifiersCount: String(row.testifiersCount ?? 0),
      firstTimersCount: String(row.firstTimersCount ?? 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
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
    return {
      weekStart: weekStart.toISOString(),
      meetingDate: meetingDate.toISOString(),
      maleCount: Number(form.maleCount) || 0,
      femaleCount: Number(form.femaleCount) || 0,
      boysCount: Number(form.boysCount) || 0,
      girlsCount: Number(form.girlsCount) || 0,
      testifiersCount: Number(form.testifiersCount) || 0,
      firstTimersCount: Number(form.firstTimersCount) || 0,
    };
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await api.patch(`/service-units/${unitId}/attendance/${editingId}`, payload);
        toast.success('Attendance updated — pastors and admins notified');
      } else {
        await api.post(`/service-units/${unitId}/attendance`, payload);
        toast.success('Attendance recorded — pastors and admins notified');
      }
      cancelEdit();
      await refetch();
    } catch {
      toast.error(editingId ? 'Failed to update attendance' : 'Failed to record attendance');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly attendance — {unitName}</CardTitle>
        <CardDescription>
          Record demographic attendance. Reports appear on Pastor and Admin reports dashboards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4">
          <div>
            <Label htmlFor="unit-meeting-date">Date</Label>
            <Input
              id="unit-meeting-date"
              type="date"
              className="mt-1 h-10 max-w-xs"
              value={form.meetingDate}
              onChange={(e) => patchForm({ meetingDate: e.target.value })}
              disabled={!canManage}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FIELDS.map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={`unit-weekly-${key}`}>{label}</Label>
                <Input
                  id={`unit-weekly-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="mt-1 h-10"
                  value={form[key]}
                  onChange={(e) => patchForm({ [key]: e.target.value })}
                  disabled={!canManage}
                />
              </div>
            ))}
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Total present:{' '}
                <span className="font-semibold text-foreground tabular-nums">{demoTotal}</span>
              </p>
              <Button type="button" variant="outline" className="h-10" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? 'Save changes' : 'Record attendance'}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" className="h-10" onClick={cancelEdit}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Saved attendance</p>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {records.map((row) => {
                const dateLabel = new Date(row.meetingDate ?? row.weekStart).toLocaleDateString(
                  undefined,
                  { year: 'numeric', month: 'short', day: 'numeric' },
                );
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{dateLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Total {row.presentCount} · M {row.maleCount} · F {row.femaleCount} · B{' '}
                        {row.boysCount} · G {row.girlsCount} · FT {row.firstTimersCount}
                      </p>
                    </div>
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

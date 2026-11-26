'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';

type ScheduleKind = 'departmentDigest' | 'cellDigest' | 'sundayAttendance' | 'membershipWeekly';

type Schedule = {
  enabled: boolean;
  weekday: number;
  hour: number;
  timeZone: string;
};

type ChurchSchedules = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  schedules: Record<ScheduleKind, Schedule>;
};

const KINDS: Array<{ id: ScheduleKind; label: string }> = [
  { id: 'departmentDigest', label: 'Department digest' },
  { id: 'cellDigest', label: 'Cell digest' },
  { id: 'sundayAttendance', label: 'Sunday attendance reminder' },
  { id: 'membershipWeekly', label: 'Membership weekly workflows' },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function OperationalEmailSchedulesPage() {
  const query = useApiQuery<ChurchSchedules[]>(
    ['platform-operational-email-schedules'],
    '/platform/operational-email-schedules',
  );
  const [drafts, setDrafts] = useState<Record<string, ChurchSchedules['schedules']>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows = query.data ?? [];

  function schedulesFor(church: ChurchSchedules) {
    return drafts[church.id] ?? church.schedules;
  }

  function update(church: ChurchSchedules, kind: ScheduleKind, patch: Partial<Schedule>) {
    const current = schedulesFor(church);
    setDrafts((prev) => ({
      ...prev,
      [church.id]: {
        ...current,
        [kind]: { ...current[kind], ...patch },
      },
    }));
  }

  async function save(church: ChurchSchedules) {
    setSavingId(church.id);
    try {
      await api.patch(`/platform/churches/${church.id}/operational-email-schedules`, schedulesFor(church));
      toast.success(`Saved schedules for ${church.name}`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[church.id];
        return next;
      });
      await query.refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save schedules'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <PlatformConsoleShell
      title="Email schedules"
      description="Department and cell digests send during the chosen hour. Attendance reminders and weekly workflows send from that hour through the rest of the day. The server still checks on its existing interval."
    >
      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((church) => {
            const schedules = schedulesFor(church);
            return (
              <section key={church.id} className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{church.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {church.slug} · church timezone {church.timezone || 'UTC'}
                    </p>
                  </div>
                  <Button size="sm" disabled={savingId === church.id} onClick={() => save(church)}>
                    {savingId === church.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                <div className="space-y-3">
                  {KINDS.map((kind) => {
                    const row = schedules[kind.id];
                    return (
                      <div key={kind.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.2fr_auto_auto_1fr]">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => update(church, kind.id, { enabled: e.target.checked })}
                          />
                          {kind.label}
                        </label>
                        <FormSelect
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                          value={String(row.weekday)}
                          onChange={(e) => update(church, kind.id, { weekday: Number(e.target.value) })}
                          aria-label={`${kind.label} weekday`}
                        >
                          {WEEKDAYS.map((label, index) => (
                            <option key={label} value={index}>
                              {label}
                            </option>
                          ))}
                        </FormSelect>
                        <FormSelect
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                          value={String(row.hour)}
                          onChange={(e) => update(church, kind.id, { hour: Number(e.target.value) })}
                          aria-label={`${kind.label} hour`}
                        >
                          {Array.from({ length: 24 }, (_, hour) => (
                            <option key={hour} value={hour}>
                              {String(hour).padStart(2, '0')}:00
                            </option>
                          ))}
                        </FormSelect>
                        <Input
                          value={row.timeZone}
                          onChange={(e) => update(church, kind.id, { timeZone: e.target.value })}
                          aria-label={`${kind.label} timezone`}
                          placeholder="Timezone"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PlatformConsoleShell>
  );
}

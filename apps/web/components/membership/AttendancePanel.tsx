'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useChurchServices } from '@/lib/hooks/use-membership-hub';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AttendancePanelProps {
  members: Array<{ id: string; firstName: string; lastName: string; familyId?: string | null }>;
}

export function AttendancePanel({ members }: AttendancePanelProps) {
  const queryClient = useQueryClient();
  const { data: services, isLoading: svcLoading } = useChurchServices();
  const [churchServiceId, setChurchServiceId] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const summaryUrl =
    churchServiceId && serviceDate
      ? `/membership/attendance/summary/service?churchServiceId=${churchServiceId}&serviceDate=${serviceDate}`
      : '';

  const { data: summary } = useApiQuery<{
    present: number;
    absent: number;
    recorded: number;
    unmarked: number;
  }>(['attendance-summary', churchServiceId, serviceDate], summaryUrl, {
    enabled: !!churchServiceId && !!serviceDate,
  });

  const activeMembers = useMemo(
    () => members.filter((m) => m.id),
    [members],
  );

  const submitRoll = async () => {
    if (!churchServiceId) {
      toast.error('Select a church service');
      return;
    }
    setBusy(true);
    try {
      await api.post('/membership/attendance/bulk', {
        scope: 'SERVICE',
        serviceDate,
        churchServiceId,
        entries: activeMembers.map((m) => ({
          memberId: m.id,
          present: presence[m.id] ?? true,
        })),
      });
      toast.success('Attendance saved');
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['membership-timeline'] });
    } catch {
      toast.error('Could not save attendance');
    } finally {
      setBusy(false);
    }
  };

  if (svcLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4" />
            Service attendance roll
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={churchServiceId}
              onChange={(e) => setChurchServiceId(e.target.value)}
            >
              <option value="">Church service</option>
              {services?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.startTime ? ` · ${s.startTime}` : ''}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
          {summary && (
            <p className="text-xs text-muted-foreground">
              Recorded: {summary.present} present, {summary.absent} absent · {summary.unmarked}{' '}
              unmarked
            </p>
          )}
        </CardContent>
      </Card>

      <div className="max-h-[min(50vh,400px)] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {activeMembers.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
          >
            <span className="text-sm">
              {m.firstName} {m.lastName}
            </span>
            <input
              type="checkbox"
              checked={presence[m.id] ?? true}
              onChange={(e) =>
                setPresence((prev) => ({ ...prev, [m.id]: e.target.checked }))
              }
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <Button className="w-full sm:w-auto" onClick={submitRoll} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save service attendance'}
      </Button>
    </div>
  );
}

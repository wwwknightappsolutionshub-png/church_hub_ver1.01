'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  FileText,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMemberName } from '@/lib/service-unit-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
}

interface DepartmentDashboard {
  unit: { id: string; name: string; departmentCode: string; departmentLabel: string };
  memberCount: number;
  attendanceSessions: Array<{
    serviceDate: string;
    present: number;
    absent: number;
    total: number;
  }>;
  latestAbsent: MemberRef[];
  volunteerConsistency: Array<{
    memberId: string;
    member: MemberRef;
    presentSessions: number;
    totalSessions: number;
    consistencyPercent: number;
    status: 'consistent' | 'moderate' | 'needs_attention';
  }>;
  weeklyReports: Array<{ id: string; weekStart: string; body: string; emailedAt?: string | null }>;
}

interface DepartmentDashboardPanelProps {
  unitId: string;
  canManage: boolean;
  /** Unit members may record roll call without being unit admin */
  canRecordAttendance?: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
  /** Hide top summary cards when parent already shows them */
  showSummaryCards?: boolean;
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-1">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-6 w-12 animate-pulse rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function DepartmentDashboardPanel({
  unitId,
  canManage,
  canRecordAttendance,
  members,
  showSummaryCards = true,
}: DepartmentDashboardPanelProps) {
  const queryClient = useQueryClient();
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const { data: dashboard, isLoading, isError, refetch } = useApiQuery<DepartmentDashboard>(
    ['department-dashboard', unitId],
    `/service-units/departments/${unitId}/dashboard`,
  );

  const rollMembers = useMemo(() => members.map((m) => m.member), [members]);
  const canRoll = canRecordAttendance ?? canManage;

  const summary = useMemo((): DepartmentDashboard => {
    if (dashboard) return dashboard;
    return {
      unit: {
        id: unitId,
        name: 'Department',
        departmentCode: '',
        departmentLabel: 'Department',
      },
      memberCount: rollMembers.length,
      attendanceSessions: [],
      latestAbsent: [],
      volunteerConsistency: rollMembers.map((m) => ({
        memberId: m.id,
        member: m,
        presentSessions: 0,
        totalSessions: 0,
        consistencyPercent: 0,
        status: 'needs_attention' as const,
      })),
      weeklyReports: [],
    };
  }, [dashboard, unitId, rollMembers]);

  const saveRoll = async () => {
    setBusy(true);
    try {
      await api.post(`/service-units/departments/${unitId}/attendance/bulk`, {
        serviceDate,
        entries: rollMembers.map((m) => ({
          memberId: m.id,
          present: presence[m.id] ?? true,
        })),
      });
      toast.success('Department attendance saved');
      queryClient.invalidateQueries({ queryKey: ['department-dashboard', unitId] });
    } catch {
      toast.error('Could not save attendance');
    } finally {
      setBusy(false);
    }
  };

  const notifyAbsent = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ notified: number }>(
        `/service-units/departments/${unitId}/notify-absentees`,
        { serviceDate },
      );
      toast.success(`Notified ${res.data.notified} absent member(s)`);
    } catch {
      toast.error('Could not send absentee notifications');
    } finally {
      setBusy(false);
    }
  };

  const generateReport = async () => {
    setBusy(true);
    try {
      await api.post(`/service-units/departments/${unitId}/weekly-reports/generate`, {});
      toast.success('Weekly report saved (in-app). Email digests from Admin/Pastor Reports.');
      queryClient.invalidateQueries({ queryKey: ['department-dashboard', unitId] });
    } catch {
      toast.error('Could not generate report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {isError && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>Could not load full attendance stats. You can still record roll call below.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {showSummaryCards &&
        (isLoading ? (
          <SummaryCardsSkeleton />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Department</CardDescription>
                <CardTitle className="text-lg">{summary.unit.departmentLabel}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Members
                </CardDescription>
                <CardTitle className="text-lg">{summary.memberCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" /> Sessions (4 wk)
                </CardDescription>
                <CardTitle className="text-lg">{summary.attendanceSessions.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        ))}

      {canRoll && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4" />
              Department roll call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {rollMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{formatMemberName(m)}</span>
                  <label className="flex items-center gap-2">
                    <span className="text-muted-foreground">Present</span>
                    <input
                      type="checkbox"
                      checked={presence[m.id] ?? true}
                      onChange={(e) =>
                        setPresence((p) => ({ ...p, [m.id]: e.target.checked }))
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveRoll} disabled={busy || rollMembers.length === 0}>
                Save roll
              </Button>
              {canManage && (
                <>
                  <Button variant="outline" onClick={notifyAbsent} disabled={busy}>
                    <Bell className="mr-1 h-4 w-4" />
                    Notify absentees
                  </Button>
                  <Button variant="secondary" onClick={generateReport} disabled={busy}>
                    <FileText className="mr-1 h-4 w-4" />
                    Weekly report
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attendance sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : summary.attendanceSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No department rolls recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.attendanceSessions.map((s) => (
                <li
                  key={s.serviceDate}
                  className="flex justify-between rounded-md border px-3 py-2"
                >
                  <span>{s.serviceDate}</span>
                  <span>
                    {s.present} present · {s.absent} absent
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!isLoading && summary.latestAbsent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest session — absent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.latestAbsent.map((m) => (
              <Badge key={m.id} variant="outline">
                {formatMemberName(m)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Volunteer consistency</CardTitle>
          <CardDescription>Based on department roll calls in the last 4 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <ul className="space-y-2">
            {summary.volunteerConsistency.map((v) => (
              <li
                key={v.memberId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{formatMemberName(v.member)}</span>
                <span
                  className={cn(
                    'font-medium',
                    v.status === 'consistent' && 'text-emerald-600',
                    v.status === 'moderate' && 'text-amber-600',
                    v.status === 'needs_attention' && 'text-red-600',
                  )}
                >
                  {v.consistencyPercent}%
                </span>
              </li>
            ))}
          </ul>
          )}
        </CardContent>
      </Card>

      {!isLoading && summary.weeklyReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.weeklyReports.map((r) => (
              <pre
                key={r.id}
                className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs"
              >
                {r.body}
              </pre>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

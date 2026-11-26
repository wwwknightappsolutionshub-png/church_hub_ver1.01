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
import { DateField } from '@/components/ui/date-field';
import { apiErrorMessage } from '@/lib/api-errors';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  /** Current service unit name shown on the roll-call card. */
  unitName?: string;
  /** Hide top summary cards when parent already shows them */
  showSummaryCards?: boolean;
  /** home hides membership consistency; consistency and report show only that section */
  view?: 'all' | 'home' | 'consistency' | 'report';
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
  unitName,
  showSummaryCards = true,
  view = 'all',
}: DepartmentDashboardPanelProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [serviceDate, setServiceDate] = useState(() => today);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportWeekStart, setReportWeekStart] = useState(() => today);
  const [reportWeekEnd, setReportWeekEnd] = useState(() => today);
  const [previewBody, setPreviewBody] = useState<string | null>(null);

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
        name: unitName || 'This unit',
        departmentCode: '',
        departmentLabel: unitName || 'This unit',
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
  }, [dashboard, unitId, unitName, rollMembers]);

  const saveRoll = async () => {
    setBusy(true);
    try {
      await api.post(`/service-units/departments/${unitId}/attendance/bulk`, {
        serviceDate,
        entries: rollMembers.map((m) => ({
          memberId: m.id,
          present: presence[m.id] ?? false,
        })),
      });
      toast.success('Attendance marked');
      queryClient.invalidateQueries({ queryKey: ['department-dashboard', unitId] });
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Attendance could not be saved. Check the date and try again.'));
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

  const reportRange = () => {
    if (!reportWeekStart || !reportWeekEnd) {
      toast.error('Select the start and end of the week range');
      return null;
    }
    if (reportWeekEnd < reportWeekStart) {
      toast.error('The end week must be the same week or a later week');
      return null;
    }
    return { weekStart: reportWeekStart, weekEnd: reportWeekEnd };
  };

  const previewReport = async () => {
    const range = reportRange();
    if (!range) return;
    setBusy(true);
    try {
      const res = await api.post<{ body: string }>(
        `/service-units/departments/${unitId}/weekly-reports/generate`,
        { ...range, preview: true },
      );
      setPreviewBody(res.data.body);
    } catch (err) {
      toast.error(
        apiErrorMessage(err as AxiosError, 'The report could not be previewed for that week range.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async () => {
    const range = reportRange();
    if (!range) return;
    setBusy(true);
    try {
      await api.post(`/service-units/departments/${unitId}/weekly-reports/generate`, {
        ...range,
        preview: false,
      });
      toast.success('Report sent to the church admin and pastor.');
      setPreviewBody(null);
      setReportOpen(false);
      queryClient.invalidateQueries({ queryKey: ['department-dashboard', unitId] });
    } catch (err) {
      toast.error(
        apiErrorMessage(
          err as AxiosError,
          'The report could not be sent. Mark attendance first, then try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const monthPrefix = today.slice(0, 7);
  const sessionsThisMonth = summary.attendanceSessions.filter((s) =>
    s.serviceDate.startsWith(monthPrefix),
  ).length;
  const chartSessions = [...summary.attendanceSessions].sort((a, b) =>
    a.serviceDate.localeCompare(b.serviceDate),
  );

  const reportForm = canManage ? (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Select the week range</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          aria-label="Week range start"
          value={reportWeekStart}
          onChange={(value) => {
            setReportWeekStart(value);
            setPreviewBody(null);
          }}
        />
        <DateField
          aria-label="Week range end"
          value={reportWeekEnd}
          onChange={(value) => {
            setReportWeekEnd(value);
            setPreviewBody(null);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={previewReport} disabled={busy}>
          Preview report
        </Button>
        <Button variant="secondary" onClick={sendReport} disabled={busy}>
          Send Report
        </Button>
      </div>
      {previewBody && (
        <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{previewBody}</pre>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {view === 'report' && reportForm}
      {(view === 'all' || view === 'home') && (<>
      {isError && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>
              Attendance history could not be loaded. You can still mark who was present below.
            </span>
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
                <CardDescription>Weekly Roll Call</CardDescription>
                <CardTitle className="text-lg">{unitName || summary.unit.name || summary.unit.departmentLabel}</CardTitle>
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
                  <BarChart3 className="h-3.5 w-3.5" /> This Month
                </CardDescription>
                <CardTitle className="text-lg">{sessionsThisMonth}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        ))}

      {canRoll && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4" />
              Weekly Roll Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DateField
              aria-label="Roll call date"
              value={serviceDate}
              onChange={setServiceDate}
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
                      checked={presence[m.id] ?? false}
                      onChange={(e) =>
                        setPresence((p) => ({ ...p, [m.id]: e.target.checked }))
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {canManage && view === 'all' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReportOpen((open) => !open);
                    setPreviewBody(null);
                  }}
                  disabled={busy}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  Send Report
                </Button>
              )}
              <Button onClick={saveRoll} disabled={busy || rollMembers.length === 0}>
                Mark Attendance
              </Button>
              {canManage && (
                <Button variant="outline" onClick={notifyAbsent} disabled={busy}>
                  <Bell className="mr-1 h-4 w-4" />
                  Notify absentees
                </Button>
              )}
            </div>
            {view === 'all' && reportOpen && reportForm}
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
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartSessions.map((s) => ({
                    date: new Date(`${s.serviceDate}T00:00:00`).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    }),
                    present: s.present,
                    absent: s.absent,
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="present" name="Present" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
      </>)}

      {view !== 'home' && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Membership Consistency</CardTitle>
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
      )}

      {view !== 'consistency' && !isLoading && summary.weeklyReports.length > 0 && (
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

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  CheckCircle2,
  Database,
  Download,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { cn } from '@/lib/utils';

type BackupStatus = {
  fullDb: { status: string; lastAt: string | null; job: BackupJob | null };
  lastTenant: { status: string; lastAt: string | null; job: BackupJob | null };
  pendingRequests: number;
  schedules: BackupSchedule[];
  recentJobs: BackupJob[];
};

type BackupJob = {
  id: string;
  scope: 'FULL_DB' | 'TENANT';
  status: string;
  trigger: string;
  church?: { id: string; name: string; slug: string } | null;
  churchId?: string | null;
  errorSummary?: string | null;
  warningSummary?: string | null;
  bytesTotal?: number;
  createdAt: string;
  finishedAt?: string | null;
  artifacts: Array<{ id: string; fileName: string; byteSize: number; type: string }>;
};

type BackupSchedule = {
  id: string;
  scope: 'FULL_DB' | 'TENANT';
  churchId: string | null;
  church?: { id: string; name: string } | null;
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  hourUtc: number;
  minuteUtc: number;
  dayOfPeriod: number | null;
  retentionDays: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
};

type BackupRequest = {
  id: string;
  churchId: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  church?: { id: string; name: string; slug: string } | null;
  requestedBy?: { firstName: string; lastName: string; email: string } | null;
  job?: BackupJob | null;
};

type ChurchRow = { id: string; name: string; slug: string };

function apiErr(err: unknown) {
  if (err instanceof AxiosError) {
    const m = err.response?.data?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return 'Request failed';
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'SUCCESS'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'PARTIAL'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : status === 'FAILED'
          ? 'bg-red-50 text-red-800 border-red-200'
          : status === 'RUNNING' || status === 'QUEUED'
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', tone)}>
      {status}
    </span>
  );
}

export default function PlatformBackupsPage() {
  const qc = useQueryClient();
  const { isPlatformOperator, hasPlatformPermission, isLoading: accessLoading } = useModuleAccess();
  const canRead = isPlatformOperator && hasPlatformPermission('platform.backups:read');
  const canWrite = isPlatformOperator && hasPlatformPermission('platform.backups:write');
  const canDownload = isPlatformOperator && hasPlatformPermission('platform.backups:download');

  const [tenantId, setTenantId] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    scope: 'FULL_DB' as 'FULL_DB' | 'TENANT',
    churchId: '',
    frequency: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    hourUtc: 2,
    minuteUtc: 0,
    dayOfPeriod: 0,
    enabled: true,
    retentionDays: 30,
  });

  const statusQ = useQuery({
    queryKey: ['platform-backups-status'],
    queryFn: async () => (await api.get<BackupStatus>('/platform/backups/status')).data,
    enabled: canRead,
    refetchInterval: 15_000,
  });

  const requestsQ = useQuery({
    queryKey: ['platform-backups-requests'],
    queryFn: async () => (await api.get<BackupRequest[]>('/platform/backups/requests')).data,
    enabled: canRead,
    refetchInterval: 20_000,
  });

  const churchesQ = useQuery({
    queryKey: ['platform-churches-lite'],
    queryFn: async () => {
      const res = await api.get<{ data?: ChurchRow[] } | ChurchRow[]>('/platform/churches');
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      return raw.data ?? [];
    },
    enabled: canWrite,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['platform-backups-status'] });
    void qc.invalidateQueries({ queryKey: ['platform-backups-requests'] });
  };

  const runFull = useMutation({
    mutationFn: async () => (await api.post('/platform/backups/full')).data,
    onSuccess: () => {
      toast.success('Full database backup queued');
      refresh();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const runTenant = useMutation({
    mutationFn: async () => (await api.post('/platform/backups/tenant', { churchId: tenantId })).data,
    onSuccess: () => {
      toast.success('Tenant backup queued');
      refresh();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const review = useMutation({
    mutationFn: async (p: { id: string; approve: boolean }) =>
      (await api.post(`/platform/backups/requests/${p.id}/review`, { approve: p.approve })).data,
    onSuccess: (_, p) => {
      toast.success(p.approve ? 'Request approved — export started' : 'Request rejected');
      refresh();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const saveSchedule = useMutation({
    mutationFn: async () =>
      (
        await api.post('/platform/backups/schedules', {
          scope: scheduleForm.scope,
          churchId: scheduleForm.scope === 'TENANT' ? scheduleForm.churchId : undefined,
          frequency: scheduleForm.frequency,
          hourUtc: scheduleForm.hourUtc,
          minuteUtc: scheduleForm.minuteUtc,
          dayOfPeriod:
            scheduleForm.frequency === 'DAILY' ? null : scheduleForm.dayOfPeriod,
          enabled: scheduleForm.enabled,
          retentionDays: scheduleForm.retentionDays,
        })
      ).data,
    onSuccess: () => {
      toast.success('Schedule saved');
      refresh();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  async function downloadArtifact(artifactId: string) {
    if (!canDownload) {
      toast.error('Missing download permission');
      return;
    }
    try {
      const tokenRes = await api.post<{
        token: string;
        fileName: string;
        downloadPath: string;
      }>(`/platform/backups/artifacts/${artifactId}/download-token`);
      const access = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const base = api.defaults.baseURL?.replace(/\/$/, '') ?? '';
      const path = tokenRes.data.downloadPath.startsWith('/')
        ? tokenRes.data.downloadPath
        : `/${tokenRes.data.downloadPath}`;
      const res = await fetch(`${base}${path}`, {
        headers: {
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
          'X-Backup-Download-Token': tokenRes.data.token,
        },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = tokenRes.data.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Download started');
    } catch (e) {
      toast.error(apiErr(e));
    }
  }

  const pending = useMemo(
    () => (requestsQ.data ?? []).filter((r) => r.status === 'PENDING'),
    [requestsQ.data],
  );

  if (accessLoading) {
    return (
      <PlatformConsoleShell title="Backups" description="Loading…">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </PlatformConsoleShell>
    );
  }

  if (!canRead) {
    return (
      <PlatformConsoleShell title="Backups" description="Access denied">
        <p className="text-sm text-muted-foreground">You do not have backup permissions.</p>
      </PlatformConsoleShell>
    );
  }

  const status = statusQ.data;

  return (
    <PlatformConsoleShell
      title="Backups"
      description="Hybrid full-database and per-tenant backups, requests, and schedules."
      actions={
        <Button size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MonitorCard
            title="Full database"
            status={status?.fullDb.status ?? '…'}
            lastAt={status?.fullDb.lastAt}
            icon={<Database className="h-4 w-4" />}
          />
          <MonitorCard
            title="Last tenant export"
            status={status?.lastTenant.status ?? '…'}
            lastAt={status?.lastTenant.lastAt}
            detail={status?.lastTenant.job?.church?.name}
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <MonitorCard
            title="Pending requests"
            status={String(status?.pendingRequests ?? 0)}
            lastAt={null}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </section>

        {canWrite ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-base font-semibold">Manual backup</h2>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Button
                size="sm"
                onClick={() => runFull.mutate()}
                disabled={runFull.isPending}
              >
                {runFull.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Run full DB backup
              </Button>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-muted-foreground">
                  Tenant
                  <select
                    className="mt-1 block h-9 min-w-[14rem] rounded-md border border-input bg-background px-2 text-sm"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                  >
                    <option value="">Select church…</option>
                    {(churchesQ.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!tenantId || runTenant.isPending}
                  onClick={() => runTenant.mutate()}
                >
                  Backup & export tenant
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-base font-semibold">
            Tenant requests {pending.length ? `(${pending.length} pending)` : ''}
          </h2>
          <div className="mt-3 space-y-2">
            {(requestsQ.data ?? []).slice(0, 30).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.church?.name ?? r.church?.id ?? r.churchId} · <StatusBadge status={r.status} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.requestedBy
                      ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}`
                      : 'Unknown'}{' '}
                    · {new Date(r.createdAt).toLocaleString()}
                    {r.reason ? ` · ${r.reason}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'PENDING' && canWrite ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ id: r.id, approve: true })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review.mutate({ id: r.id, approve: false })}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {r.job?.artifacts?.[0] && canDownload ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadArtifact(r.job!.artifacts[0].id)}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Export
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!requestsQ.data?.length ? (
              <p className="text-sm text-muted-foreground">No backup requests yet.</p>
            ) : null}
          </div>
        </section>

        {canWrite ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-base font-semibold">Schedules</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-muted-foreground">
                Scope
                <select
                  className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={scheduleForm.scope}
                  onChange={(e) =>
                    setScheduleForm((s) => ({
                      ...s,
                      scope: e.target.value as 'FULL_DB' | 'TENANT',
                    }))
                  }
                >
                  <option value="FULL_DB">Global full DB</option>
                  <option value="TENANT">Tenant export</option>
                </select>
              </label>
              {scheduleForm.scope === 'TENANT' ? (
                <label className="text-xs text-muted-foreground">
                  Church
                  <select
                    className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={scheduleForm.churchId}
                    onChange={(e) =>
                      setScheduleForm((s) => ({ ...s, churchId: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    {(churchesQ.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-xs text-muted-foreground">
                Frequency
                <select
                  className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={scheduleForm.frequency}
                  onChange={(e) =>
                    setScheduleForm((s) => ({
                      ...s,
                      frequency: e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY',
                    }))
                  }
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Hour (UTC)
                <Input
                  type="number"
                  min={0}
                  max={23}
                  className="mt-1 h-9"
                  value={scheduleForm.hourUtc}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, hourUtc: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Minute (UTC)
                <Input
                  type="number"
                  min={0}
                  max={59}
                  className="mt-1 h-9"
                  value={scheduleForm.minuteUtc}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, minuteUtc: Number(e.target.value) }))
                  }
                />
              </label>
              {scheduleForm.frequency !== 'DAILY' ? (
                <label className="text-xs text-muted-foreground">
                  {scheduleForm.frequency === 'WEEKLY' ? 'Day of week (0=Sun)' : 'Day of month'}
                  <Input
                    type="number"
                    min={0}
                    max={28}
                    className="mt-1 h-9"
                    value={scheduleForm.dayOfPeriod}
                    onChange={(e) =>
                      setScheduleForm((s) => ({ ...s, dayOfPeriod: Number(e.target.value) }))
                    }
                  />
                </label>
              ) : null}
              <label className="text-xs text-muted-foreground">
                Retention (days)
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="mt-1 h-9"
                  value={scheduleForm.retentionDays}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, retentionDays: Number(e.target.value) }))
                  }
                />
              </label>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending}>
                Save schedule
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {(status?.schedules ?? []).map((s) => (
                <div key={s.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-medium">
                    {s.scope === 'FULL_DB' ? 'Global FULL_DB' : `Tenant · ${s.church?.name ?? s.churchId}`}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {s.frequency} @ {String(s.hourUtc).padStart(2, '0')}:
                    {String(s.minuteUtc).padStart(2, '0')} UTC ·{' '}
                    {s.enabled ? 'enabled' : 'disabled'} · next{' '}
                    {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-base font-semibold">Recent jobs</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Scope</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Trigger</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2">Export</th>
                </tr>
              </thead>
              <tbody>
                {(status?.recentJobs ?? []).map((j) => (
                  <tr key={j.id} className="border-t border-border">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(j.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {j.scope}
                      {j.church ? ` · ${j.church.name}` : ''}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={j.status} />
                      {j.errorSummary ? (
                        <p className="mt-1 max-w-xs truncate text-xs text-red-600" title={j.errorSummary}>
                          {j.errorSummary}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">{j.trigger}</td>
                    <td className="py-2 pr-3">{formatBytes(j.bytesTotal ?? 0)}</td>
                    <td className="py-2">
                      {j.artifacts?.[0] && canDownload ? (
                        <Button size="sm" variant="outline" onClick={() => downloadArtifact(j.artifacts[0].id)}>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download
                        </Button>
                      ) : j.status === 'FAILED' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!status?.recentJobs?.length ? (
              <p className="text-sm text-muted-foreground">No backup jobs yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </PlatformConsoleShell>
  );
}

function MonitorCard({
  title,
  status,
  lastAt,
  detail,
  icon,
}: {
  title: string;
  status: string;
  lastAt: string | null | undefined;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{status}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {detail ? `${detail} · ` : ''}
        {lastAt ? `Last: ${new Date(lastAt).toLocaleString()}` : 'No runs yet'}
      </p>
    </div>
  );
}

function formatBytes(n: number) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

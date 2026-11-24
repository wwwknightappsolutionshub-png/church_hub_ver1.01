'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
} from '@/components/layout/EnterpriseModuleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tab = 'security' | 'activity' | 'stage';

type AuditItem = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  ip?: string | null;
  createdAt: string;
  actor?: { firstName?: string; lastName?: string; email?: string } | null;
};

type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  member?: { firstName?: string; lastName?: string } | null;
  actor?: { firstName?: string; lastName?: string; email?: string } | null;
};

type StageItem = {
  id: string;
  fromStage: string;
  toStage: string;
  note?: string | null;
  createdAt: string;
  followUpId: string;
  actor?: { firstName?: string; lastName?: string; email?: string } | null;
};

const HIGH_RISK = new Set([
  'READ_PASTORAL_NOTE',
  'STAFF_ROLE_CHANGED',
  'STAFF_DEACTIVATED',
  'STAFF_PASSWORD_CHANGED',
  'SOFT_DELETE_MEMBER',
  'RESTORE_MEMBER',
  'AUTHZ_DENIED',
  'AUTHZ_ABUSE_DETECTED',
  'GDPR_ERASURE',
  'AUDIT_LOG_EXPORTED',
]);

export default function AuditLogsSettingsPage() {
  const { userRoles, isLoading } = useModuleAccess();
  const allowed = isChurchLeadershipRole(userRoles);
  const [tab, setTab] = useState<Tab>('security');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const queryKey = useMemo(
    () => ['audit-logs', tab, action, search, dateFrom, dateTo, cursor],
    [tab, action, search, dateFrom, dateTo, cursor],
  );

  const path =
    tab === 'security'
      ? '/audit-logs'
      : tab === 'activity'
        ? '/audit-logs/member-activity'
        : '/audit-logs/follow-up-stage';

  const params = new URLSearchParams();
  if (action && tab === 'security') params.set('action', action);
  if (search) params.set('search', search);
  if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString());
  if (dateTo) params.set('dateTo', new Date(dateTo).toISOString());
  if (cursor) params.set('cursor', cursor);
  params.set('take', '50');

  const { data, isFetching, refetch } = useApiQuery<{
    items: Array<AuditItem | ActivityItem | StageItem>;
    nextCursor: string | null;
  }>(queryKey, `${path}?${params.toString()}`, { enabled: allowed });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const exportParams = new URLSearchParams(params);
      exportParams.set('format', 'csv');
      exportParams.set('take', '5000');
      const res = await api.post(`/audit-logs/export?${exportParams.toString()}`, null, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'church-audit.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit export downloaded');
      void refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <EnterpriseShell>
        <EnterpriseHero eyebrow="Settings" title="Audit & Activity Logs" description="Leadership only." />
        <EnterpriseContent>
          <p className="text-sm text-muted-foreground">
            Only Church Admins and Pastors can view audit logs.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/settings">Back to Settings</Link>
          </Button>
        </EnterpriseContent>
      </EnterpriseShell>
    );
  }

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Settings"
        title="Audit & Activity Logs"
        description="Immutable security events, member activity, and follow-up stage history."
        actions={
          <Button asChild variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20">
            <Link href="/dashboard/settings">Settings</Link>
          </Button>
        }
      />
      <EnterpriseContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ['security', 'Security'],
              ['activity', 'Member activity'],
              ['stage', 'Follow-up stage'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? 'default' : 'outline'}
              onClick={() => {
                setTab(id);
                setCursor(null);
              }}
            >
              {id === 'security' ? <Shield className="mr-1.5 h-3.5 w-3.5" /> : null}
              {label}
            </Button>
          ))}
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {tab === 'security' ? (
            <Input
              placeholder="Action filter"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setCursor(null);
              }}
            />
          ) : null}
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(null);
            }}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCursor(null);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCursor(null);
            }}
          />
          {tab === 'security' ? (
            <Button disabled={exporting} onClick={() => void exportCsv()}>
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Export CSV
            </Button>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border">
          {isFetching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (data?.items?.length ?? 0) === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">No log entries.</p>
          ) : (
            <ul className="divide-y">
              {tab === 'security'
                ? (data!.items as AuditItem[]).map((row) => (
                    <li key={row.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={HIGH_RISK.has(row.action) ? 'destructive' : 'secondary'}
                          className={cn(!HIGH_RISK.has(row.action) && 'font-normal')}
                        >
                          {row.action}
                        </Badge>
                        <span className="text-muted-foreground">{row.targetType}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          row.actor
                            ? `${row.actor.firstName ?? ''} ${row.actor.lastName ?? ''}`.trim() ||
                              row.actor.email
                            : 'System',
                          row.ip ? `IP ${row.ip}` : null,
                          row.targetId ? `target ${row.targetId.slice(0, 8)}…` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </li>
                  ))
                : tab === 'activity'
                  ? (data!.items as ActivityItem[]).map((row) => (
                      <li key={row.id} className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{row.type}</Badge>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {new Date(row.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1">{row.summary}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Member:{' '}
                          {row.member
                            ? `${row.member.firstName ?? ''} ${row.member.lastName ?? ''}`.trim()
                            : '—'}
                          {row.actor
                            ? ` · by ${row.actor.firstName ?? ''} ${row.actor.lastName ?? ''}`.trim()
                            : ''}
                        </p>
                      </li>
                    ))
                  : (data!.items as StageItem[]).map((row) => (
                      <li key={row.id} className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {row.fromStage} → {row.toStage}
                          </Badge>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {new Date(row.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {row.note ? <p className="mt-1 text-xs">{row.note}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.actor
                            ? `${row.actor.firstName ?? ''} ${row.actor.lastName ?? ''}`.trim()
                            : '—'}{' '}
                          · follow-up {row.followUpId.slice(0, 8)}…
                        </p>
                      </li>
                    ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!cursor}
            onClick={() => setCursor(null)}
          >
            Newest
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.nextCursor}
            onClick={() => setCursor(data?.nextCursor ?? null)}
          >
            Older
          </Button>
        </div>
      </EnterpriseContent>
    </EnterpriseShell>
  );
}

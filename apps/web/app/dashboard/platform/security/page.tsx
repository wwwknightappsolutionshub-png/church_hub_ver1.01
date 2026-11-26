'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormSelect } from '@/components/ui/form-select';

type AuditItem = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  churchId?: string | null;
  ip?: string | null;
  createdAt: string;
  actor?: { firstName?: string; lastName?: string; email?: string } | null;
  church?: { name?: string; slug?: string } | null;
};

const HIGH_RISK = new Set([
  'AUTHZ_DENIED',
  'AUTHZ_ABUSE_DETECTED',
  'READ_PASTORAL_NOTE',
  'STAFF_ROLE_CHANGED',
  'STAFF_PASSWORD_CHANGED',
  'GDPR_ERASURE',
  'AUDIT_LOG_EXPORTED',
  'BACKUP_DOWNLOADED',
  'DSAR_EXPORT',
  'RLS_TOGGLED',
]);

export default function PlatformSecurityAuditPage() {
  const [churchId, setChurchId] = useState('');
  const [action, setAction] = useState('');
  const [ip, setIp] = useState('');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: churches } = useApiQuery<Array<{ id: string; name: string }>>(
    ['platform-churches'],
    '/platform/churches',
  );

  const queryKey = useMemo(
    () => ['platform-audit', churchId, action, ip, search, cursor ?? ''],
    [churchId, action, ip, search, cursor],
  );

  const params = new URLSearchParams();
  if (churchId) params.set('churchId', churchId);
  if (action) params.set('action', action);
  if (ip) params.set('ip', ip);
  if (search) params.set('search', search);
  if (cursor) params.set('cursor', cursor);
  params.set('take', '50');

  const { data, isFetching, refetch } = useApiQuery<{
    items: AuditItem[];
    nextCursor: string | null;
  }>(queryKey, `/platform/audit-logs?${params.toString()}`);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const exportParams = new URLSearchParams(params);
      exportParams.set('format', 'csv');
      exportParams.set('exportTake', '5000');
      const res = await api.post(`/platform/audit-logs/export?${exportParams.toString()}`, null, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'platform-audit.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Platform audit export downloaded');
      void refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <PlatformConsoleShell
      title="Global Security Audit"
      description="Cross-tenant security events, abuse detections, and compliance exports."
      actions={
        <Button
          size="sm"
          className="bg-white text-slate-900 hover:bg-slate-100"
          disabled={exporting}
          onClick={() => void exportCsv()}
        >
          {exporting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Export CSV
        </Button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FormSelect
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={churchId}
          onChange={(e) => {
            setChurchId(e.target.value);
            setCursor(null);
          }}
        >
          <option value="">All tenants</option>
          {(churches ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FormSelect>
        <Input
          placeholder="Action (e.g. AUTHZ_ABUSE_DETECTED)"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setCursor(null);
          }}
        />
        <Input
          placeholder="IP"
          value={ip}
          onChange={(e) => {
            setIp(e.target.value);
            setCursor(null);
          }}
        />
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor(null);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isFetching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">No audit events.</p>
        ) : (
          <ul className="divide-y">
            {data!.items.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {HIGH_RISK.has(row.action) ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  ) : null}
                  <Badge
                    variant={HIGH_RISK.has(row.action) ? 'destructive' : 'secondary'}
                    className={cn(!HIGH_RISK.has(row.action) && 'font-normal')}
                  >
                    {row.action}
                  </Badge>
                  <span className="text-muted-foreground">{row.targetType}</span>
                  {row.church?.name ? (
                    <Badge variant="outline">{row.church.name}</Badge>
                  ) : null}
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
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <Button variant="outline" size="sm" disabled={!cursor} onClick={() => setCursor(null)}>
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
    </PlatformConsoleShell>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Download, HardDriveDownload, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type BackupRequest = {
  id: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  reviewNote?: string | null;
  job?: {
    status: string;
    artifacts?: Array<{ id: string; fileName: string }>;
  } | null;
};

function apiErr(err: unknown) {
  if (err instanceof AxiosError) {
    const m = err.response?.data?.message;
    if (typeof m === 'string') return m;
  }
  return 'Request failed';
}

export function TenantBackupRequestPanel({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const listQ = useQuery({
    queryKey: ['tenant-backup-requests'],
    queryFn: async () => (await api.get<BackupRequest[]>('/backups/requests')).data,
    enabled,
    refetchInterval: 20_000,
  });

  const create = useMutation({
    mutationFn: async () =>
      (await api.post('/backups/requests', { reason: reason.trim() || undefined })).data,
    onSuccess: () => {
      toast.success('Backup request submitted for platform approval');
      setReason('');
      void qc.invalidateQueries({ queryKey: ['tenant-backup-requests'] });
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  async function download(artifactId: string) {
    try {
      const tokenRes = await api.post<{
        token: string;
        fileName: string;
        downloadPath: string;
      }>(`/backups/artifacts/${artifactId}/download-token`);
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

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDriveDownload className="h-4 w-4" />
          Data backup request
        </CardTitle>
        <CardDescription>
          Request a secure export of this church&apos;s data. A platform administrator must approve
          before the backup is generated and available to download.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs text-muted-foreground">
            Reason (optional)
            <Input
              className="mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Offboarding archive, compliance export"
              maxLength={2000}
            />
          </label>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="shrink-0"
          >
            {create.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Request backup
          </Button>
        </div>

        <div className="space-y-2">
          {(listQ.data ?? []).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {r.status}
                  {r.job?.status ? ` · job ${r.job.status}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.reason ? ` · ${r.reason}` : ''}
                  {r.reviewNote ? ` · Note: ${r.reviewNote}` : ''}
                </p>
              </div>
              {r.status === 'APPROVED' &&
              r.job &&
              (r.job.status === 'SUCCESS' || r.job.status === 'PARTIAL') &&
              r.job.artifacts?.[0] ? (
                <Button size="sm" variant="outline" onClick={() => download(r.job!.artifacts![0].id)}>
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download export
                </Button>
              ) : null}
            </div>
          ))}
          {!listQ.data?.length ? (
            <p className="text-sm text-muted-foreground">No backup requests yet.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

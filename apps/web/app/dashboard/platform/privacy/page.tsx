'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DsarRow = {
  id: string;
  type: string;
  status: string;
  requesterEmail: string;
  requesterName: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  church: { id: string; name: string; slug: string } | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    anonymizedAt: string | null;
  } | null;
};

export default function PlatformPrivacyPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isPlatformOperator, hasPlatformPermission, isLoading: accessLoading } = useModuleAccess();
  const canAccess = isPlatformOperator && hasPlatformPermission('platform.privacy:read');
  const canWrite = hasPlatformPermission('platform.privacy:write');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: rows = [], isLoading } = useApiQuery<DsarRow[]>(
    ['platform-dsar', statusFilter],
    `/platform/privacy/dsar${statusFilter ? `?status=${statusFilter}` : ''}`,
    { enabled: canAccess },
  );

  useEffect(() => {
    if (!accessLoading && !canAccess) router.replace('/dashboard/platform');
  }, [accessLoading, canAccess, router]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: string;
      executeErasure?: boolean;
      notes?: string;
    }) => {
      const { data } = await api.patch(`/platform/privacy/dsar/${payload.id}`, {
        status: payload.status,
        executeErasure: payload.executeErasure,
        notes: payload.notes,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Request updated');
      qc.invalidateQueries({ queryKey: ['platform-dsar'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not update request')),
  });

  if (accessLoading || !canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <PlatformConsoleShell
      title="Privacy requests"
      description="Data subject access and erasure requests (DSAR). Complete erasure anonymizes the linked account."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Badge variant="outline">{rows.length} requests</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">DSAR queue</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading…' : 'Newest first. Erasure permanently anonymizes PII.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-semibold">Type</th>
                <th className="px-2 py-2 font-semibold">Requester</th>
                <th className="px-2 py-2 font-semibold">Church</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Created</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-2 py-3 font-medium">{r.type}</td>
                  <td className="px-2 py-3">
                    <div>{r.requesterName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.requesterEmail}</div>
                  </td>
                  <td className="px-2 py-3">{r.church?.name ?? '—'}</td>
                  <td className="px-2 py-3">
                    <Badge variant="outline">{r.status}</Badge>
                    {r.user?.anonymizedAt ? (
                      <span className="ml-2 text-xs text-muted-foreground">anonymized</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-3">
                    {canWrite ? (
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === 'OPEN' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({ id: r.id, status: 'IN_PROGRESS' })
                            }
                          >
                            Start
                          </Button>
                        ) : null}
                        {r.type === 'ERASURE' && r.status !== 'COMPLETED' && r.user && !r.user.anonymizedAt ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updateMutation.isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Anonymize ${r.requesterEmail}? This cannot be undone.`,
                                )
                              ) {
                                return;
                              }
                              updateMutation.mutate({ id: r.id, executeErasure: true });
                            }}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Erase & complete'
                            )}
                          </Button>
                        ) : null}
                        {r.type !== 'ERASURE' &&
                        r.status !== 'COMPLETED' &&
                        r.status !== 'REJECTED' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({ id: r.id, status: 'COMPLETED' })
                            }
                          >
                            Complete
                          </Button>
                        ) : null}
                        {r.type === 'ERASURE' &&
                        r.status !== 'COMPLETED' &&
                        r.status !== 'REJECTED' &&
                        r.user?.anonymizedAt ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({ id: r.id, status: 'COMPLETED' })
                            }
                          >
                            Mark complete
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                    No privacy requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PlatformConsoleShell>
  );
}

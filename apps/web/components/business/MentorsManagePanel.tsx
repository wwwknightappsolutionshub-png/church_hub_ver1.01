'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MentorRow {
  id: string;
  memberName: string;
  memberEmail?: string | null;
  specialty: string;
  missionStatement: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  mentees: Array<{
    id: string;
    name: string;
    status: string;
    goals?: string | null;
    focusArea?: string | null;
  }>;
}

export function MentorsManagePanel() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading } = useApiQuery<MentorRow[]>(
    ['mentors-manage'],
    '/business/mentor-applications/manage',
  );

  const rows = data ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['mentors-manage', 'konnect-mentor-apps'] });

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/business/mentor-applications/${id}/approve`);
      toast.success('Mentor approved');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed'));
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/business/mentor-applications/${id}/reject`, {
        note: 'Application declined',
      });
      toast.success('Application declined');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Decline failed'));
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Mentor</th>
              <th className="px-4 py-3 font-semibold">Specialty</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Mentees</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.memberName}</p>
                  {row.memberEmail && (
                    <p className="text-xs text-muted-foreground">{row.memberEmail}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.missionStatement}</p>
                </td>
                <td className="px-4 py-3">{row.specialty}</td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleDateString()}
                  {row.approvedAt && (
                    <>
                      <br />
                      Approved {new Date(row.approvedAt).toLocaleDateString()}
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      row.status === 'APPROVED'
                        ? 'success'
                        : row.status === 'REJECTED'
                          ? 'outline'
                          : 'secondary'
                    }
                  >
                    {row.statusLabel}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.mentees.length ? (
                    <ul className="space-y-1">
                      {row.mentees.map((m) => (
                        <li key={m.id}>
                          {m.name} · {m.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => approve(row.id)}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => decline(row.id)}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No mentor applications yet.
          </p>
        )}
      </div>

      {rows.some((r) => r.status === 'PENDING') && (
        <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows
              .filter((r) => r.status === 'PENDING')
              .map((row) => (
                <div key={row.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {row.memberName} — {row.specialty}
                    </p>
                    <p className="text-muted-foreground">{row.missionStatement}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === row.id} onClick={() => approve(row.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => decline(row.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

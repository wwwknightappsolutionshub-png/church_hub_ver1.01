'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DepartmentReportsSection({
  unitId,
  canEdit,
  onSubmitted,
}: {
  unitId: string;
  canEdit: boolean;
  onSubmitted?: () => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: reports = [], refetch } = useApiQuery<
    Array<{ id: string; title: string; submittedAt: string }>
  >(['dept-reports', unitId], `${deptToolsApiBase(unitId)}/reports`);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ report: { id: string }; notified: number }>(
        `${deptToolsApiBase(unitId)}/reports/quick`,
      );
      const count = data?.notified ?? 0;
      toast.success(
        count > 0
          ? `Report sent to pastors (${count} notified via email and in-app)`
          : 'Report saved (no pastor accounts found to notify)',
      );
      await refetch();
      qc.invalidateQueries({ queryKey: ['dept-reports', unitId] });
      onSubmitted?.();
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not submit report'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick report for pastors</CardTitle>
          <CardDescription>
            Compiles attendance (4 weeks), meeting summaries, activity log, and inventory needs,
            then notifies pastors by email and in-app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Button size="sm" onClick={submit} disabled={busy} className="gap-1">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              Submit quick report
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Unit leader or unit admin access required to submit.
            </p>
          )}
        </CardContent>
      </Card>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg border px-3 py-2 text-sm">
            {r.title} · {new Date(r.submittedAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

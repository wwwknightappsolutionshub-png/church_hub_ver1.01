'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffUnitFeedbackCompose } from '@/components/departments/DepartmentFeedbacksSection';
import { showDepartmentToolsTab } from '@/lib/dept-module-catalog';

interface JoinRequest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  motivation?: string | null;
  status: string;
  createdAt: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

export function ServiceUnitAdminPanel({
  unitId,
  unitName,
  departmentCode,
  isChurchStaff,
}: {
  unitId: string;
  unitName: string;
  departmentCode?: string | null;
  isChurchStaff?: boolean;
}) {
  const hasDeptTools = showDepartmentToolsTab(departmentCode, unitName);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: requests } = useApiQuery<JoinRequest[]>(
    ['unit-join-requests', unitId],
    `/service-units/${unitId}/join-requests?status=PENDING`,
  );
  const { data: template } = useApiQuery<EmailTemplate>(
    ['unit-email-template', unitId],
    `/service-units/${unitId}/email-template`,
  );
  const [tpl, setTpl] = useState({ subject: '', body: '' });

  useEffect(() => {
    if (template) {
      setTpl({ subject: template.subject, body: template.body });
    }
  }, [template]);


  const review = async (requestId: string, approve: boolean) => {
    setBusy(true);
    try {
      await api.patch(`/service-units/${unitId}/join-requests/${requestId}`, { approve });
      toast.success(approve ? 'Approved — welcome email sent' : 'Request rejected');
      queryClient.invalidateQueries({ queryKey: ['unit-join-requests', unitId] });
      queryClient.invalidateQueries({ queryKey: ['service-unit', unitId] });
    } catch {
      toast.error('Could not update request');
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async () => {
    setBusy(true);
    try {
      await api.patch(`/service-units/${unitId}/email-template`, tpl);
      toast.success('Welcome email template saved');
    } catch {
      toast.error('Could not save template');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {(hasDeptTools || isChurchStaff) ? (
        <StaffUnitFeedbackCompose unitId={unitId} unitName={unitName} />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending join requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(requests ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {r.firstName} {r.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {[r.email, r.phone].filter(Boolean).join(' · ')}
              </p>
              {r.motivation && <p className="mt-1 text-muted-foreground">{r.motivation}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => review(r.id, true)}>
                  <Check className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => review(r.id, false)}>
                  <X className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {(requests ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Welcome email template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{unitName}}'}
          </p>
          <Input
            placeholder="Email subject"
            value={tpl.subject || template?.subject || ''}
            onChange={(e) => setTpl({ ...tpl, subject: e.target.value })}
          />
          <textarea
            className="min-h-[160px] w-full rounded-md border px-3 py-2 text-sm"
            value={tpl.body || template?.body || ''}
            onChange={(e) => setTpl({ ...tpl, body: e.target.value })}
          />
          <Button onClick={saveTemplate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save template'}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

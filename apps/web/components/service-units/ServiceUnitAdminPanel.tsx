'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMemberName } from '@/lib/service-unit-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

type UnitRole = 'MEMBER' | 'UNIT_ADMIN' | 'ASSISTANT' | 'SECRETARY';

interface UnitMemberRow {
  memberId: string;
  unitRole: UnitRole;
  designation: string | null;
  leaderId: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
  };
}

export function ServiceUnitAdminPanel({
  unitId,
  unitName,
  departmentCode,
  isChurchStaff,
  canManageLeaders = false,
  onOpenAddLeader,
  onOpenAssignAssistants,
}: {
  unitId: string;
  unitName: string;
  departmentCode?: string | null;
  isChurchStaff?: boolean;
  canManageLeaders?: boolean;
  onOpenAddLeader?: () => void;
  onOpenAssignAssistants?: () => void;
}) {
  const hasDeptTools = showDepartmentToolsTab(departmentCode, unitName);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [leaderBusyId, setLeaderBusyId] = useState<string | null>(null);

  const { data: requests } = useApiQuery<JoinRequest[]>(
    ['unit-join-requests', unitId],
    `/service-units/${unitId}/join-requests?status=PENDING`,
  );
  const { data: template } = useApiQuery<EmailTemplate>(
    ['unit-email-template', unitId],
    `/service-units/${unitId}/email-template`,
  );
  const { data: unitMembers = [], refetch: refetchMembers } = useApiQuery<UnitMemberRow[]>(
    ['service-unit-members', unitId],
    `/service-units/${unitId}/members`,
  );
  const [tpl, setTpl] = useState({ subject: '', body: '' });

  const leadershipRows = useMemo(
    () =>
      unitMembers.filter(
        (row) =>
          row.leaderId &&
          (row.unitRole === 'UNIT_ADMIN' ||
            row.unitRole === 'ASSISTANT' ||
            row.unitRole === 'SECRETARY'),
      ),
    [unitMembers],
  );

  useEffect(() => {
    if (template) {
      setTpl({ subject: template.subject, body: template.body });
    }
  }, [template]);

  const invalidateLeaders = () => {
    refetchMembers();
    queryClient.invalidateQueries({ queryKey: ['service-unit', unitId] });
    queryClient.invalidateQueries({ queryKey: ['service-units'] });
    queryClient.invalidateQueries({ queryKey: ['service-unit-members', unitId] });
  };

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

  const removeLeader = async (row: UnitMemberRow) => {
    if (!row.leaderId) return;
    const name = formatMemberName(row.member);
    const roleLabel =
      row.unitRole === 'ASSISTANT'
        ? 'Assistant'
        : row.unitRole === 'SECRETARY'
          ? 'Secretary'
          : 'Unit Leader';
    if (!window.confirm(`Remove ${name} as ${roleLabel} for ${unitName}?`)) return;

    setLeaderBusyId(row.leaderId);
    try {
      await api.delete(`/service-units/${unitId}/leaders/${row.leaderId}`);
      toast.success(`${name} removed as ${roleLabel}`);
      invalidateLeaders();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Could not remove leadership');
    } finally {
      setLeaderBusyId(null);
    }
  };

  const roleBadge = (role: UnitRole) => {
    if (role === 'ASSISTANT') return 'Assistant';
    if (role === 'SECRETARY') return 'Secretary';
    if (role === 'UNIT_ADMIN') return 'Unit Leader';
    return role;
  };

  return (
    <div className="space-y-6">
      {(hasDeptTools || isChurchStaff) ? (
        <StaffUnitFeedbackCompose unitId={unitId} unitName={unitName} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit leadership</CardTitle>
          <CardDescription>
            Leadership is managed from the Overview tab. Unit Leaders are volunteers (not Church
            Staff). Assistants and Secretaries help run the unit but cannot assign a Unit Admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManageLeaders ? (
            <p className="text-sm text-muted-foreground">
              To assign or change a Unit Leader, Assistant, or Secretary, use{' '}
              <strong>Overview</strong>
              {onOpenAddLeader || onOpenAssignAssistants
                ? ' (Add Leader / Assign Assistants).'
                : '.'}{' '}
              This Admin tab is for join requests, welcome email, and other unit settings.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You can view leadership below. Assigning leaders or assistants requires Unit Admin or
              church staff access from Overview.
            </p>
          )}

          <ul className="divide-y rounded-md border">
            {leadershipRows.map((row) => (
              <li
                key={row.leaderId ?? row.memberId}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{formatMemberName(row.member)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.member.email || row.designation || roleBadge(row.unitRole)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {roleBadge(row.unitRole)}
                  </Badge>
                  {canManageLeaders ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title={`Remove ${formatMemberName(row.member)}`}
                      disabled={leaderBusyId === row.leaderId}
                      onClick={() => void removeLeader(row)}
                    >
                      {leaderBusyId === row.leaderId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
            {leadershipRows.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No Unit Leader, Assistant, or Secretary assigned yet.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

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

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Search, Trash2, UserPlus, X } from 'lucide-react';
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

type UnitRole = 'MEMBER' | 'UNIT_ADMIN';

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

interface ChurchMemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
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
  const [leaderBusyId, setLeaderBusyId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

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
  const [churchSuggestions, setChurchSuggestions] = useState<ChurchMemberOption[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [tpl, setTpl] = useState({ subject: '', body: '' });

  const unitLeaders = useMemo(
    () => unitMembers.filter((row) => row.unitRole === 'UNIT_ADMIN' && row.leaderId),
    [unitMembers],
  );

  const leaderMemberIds = useMemo(
    () => new Set(unitLeaders.map((row) => row.memberId)),
    [unitLeaders],
  );

  /** Unit managers promote from unit members; church staff search membership by keyword. */
  const unitCandidatePool = useMemo(
    () =>
      unitMembers
        .filter((row) => !leaderMemberIds.has(row.memberId))
        .map((row) => ({
          id: row.member.id,
          firstName: row.member.firstName,
          lastName: row.member.lastName,
          email: row.member.email,
        })),
    [unitMembers, leaderMemberIds],
  );

  const suggestions = useMemo(() => {
    const q = leaderSearch.trim().toLowerCase();
    if (q.length < 1) return [];
    const pool = isChurchStaff ? churchSuggestions : unitCandidatePool;
    return pool
      .filter((m) => !leaderMemberIds.has(m.id))
      .filter((m) => {
        if (isChurchStaff) return true;
        const name = `${m.firstName} ${m.lastName}`.toLowerCase();
        const email = (m.email ?? '').toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 12);
  }, [
    isChurchStaff,
    churchSuggestions,
    unitCandidatePool,
    leaderMemberIds,
    leaderSearch,
  ]);

  useEffect(() => {
    if (template) {
      setTpl({ subject: template.subject, body: template.body });
    }
  }, [template]);

  useEffect(() => {
    if (!isChurchStaff) {
      setChurchSuggestions([]);
      return;
    }
    const q = leaderSearch.trim().slice(0, 100);
    if (q.length < 1) {
      setChurchSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const { data } = await api.get<
          ChurchMemberOption[] | { items: ChurchMemberOption[] }
        >('/membership/members', {
          params: { search: q, page: 1, limit: 12 },
        });
        const rows = Array.isArray(data) ? data : (data?.items ?? []);
        if (!cancelled) setChurchSuggestions(rows);
      } catch {
        if (!cancelled) setChurchSuggestions([]);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [leaderSearch, isChurchStaff]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!suggestRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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

  const assignLeader = async (member: ChurchMemberOption) => {
    setAssigning(true);
    try {
      await api.post(`/service-units/${unitId}/leaders`, {
        memberId: member.id,
        role: 'LEADER',
        isModerator: true,
        isUnitAdmin: true,
      });
      toast.success(`${formatMemberName(member)} assigned as Unit Leader`);
      setLeaderSearch('');
      setSuggestOpen(false);
      invalidateLeaders();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Could not assign Unit Leader');
    } finally {
      setAssigning(false);
    }
  };

  const removeLeader = async (row: UnitMemberRow) => {
    if (!row.leaderId) return;
    const name = formatMemberName(row.member);
    if (!window.confirm(`Remove ${name} as Unit Leader for ${unitName}?`)) return;

    setLeaderBusyId(row.leaderId);
    try {
      await api.delete(`/service-units/${unitId}/leaders/${row.leaderId}`);
      toast.success(`${name} removed as Unit Leader`);
      invalidateLeaders();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Could not remove Unit Leader');
    } finally {
      setLeaderBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {(hasDeptTools || isChurchStaff) ? (
        <StaffUnitFeedbackCompose unitId={unitId} unitName={unitName} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit leaders</CardTitle>
          <CardDescription>
            Assign or remove Unit Leaders for this unit. Leaders can manage members, meetings, and
            unit settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={suggestRef} className="relative max-w-xl">
            <label htmlFor={`unit-leader-search-${unitId}`} className="sr-only">
              Search members to assign as Unit Leader
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`unit-leader-search-${unitId}`}
                value={leaderSearch}
                onChange={(e) => {
                  setLeaderSearch(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                placeholder={
                  isChurchStaff
                    ? 'Search church members by name or email…'
                    : 'Search unit members by name or email…'
                }
                className="pl-9"
                autoComplete="off"
                disabled={assigning}
              />
              {assigning || suggestLoading ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {suggestOpen && suggestions.length > 0 ? (
              <ul
                className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-md"
                role="listbox"
                aria-label="Member suggestions"
              >
                {suggestions.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      disabled={assigning}
                      onClick={() => void assignLeader(m)}
                    >
                      <span>
                        {formatMemberName(m)}
                        {m.email ? (
                          <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
                        ) : null}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-primary">
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {suggestOpen && leaderSearch.trim().length > 0 && suggestions.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No matching members available to assign.
              </p>
            ) : null}
          </div>

          <ul className="divide-y rounded-md border">
            {unitLeaders.map((row) => (
              <li
                key={row.leaderId ?? row.memberId}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{formatMemberName(row.member)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.member.email || row.designation || 'Unit Leader'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Unit Leader
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title={`Remove ${formatMemberName(row.member)} as Unit Leader`}
                    disabled={leaderBusyId === row.leaderId}
                    onClick={() => void removeLeader(row)}
                  >
                    {leaderBusyId === row.leaderId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
            {unitLeaders.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No Unit Leaders assigned yet. Search above to add one.
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

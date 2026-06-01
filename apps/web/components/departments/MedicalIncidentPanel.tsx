'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  ClipboardList,
  Heart,
  Loader2,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type MemberRef = { id: string; firstName: string; lastName: string; phone?: string | null };

const CATEGORY_OPTIONS = [
  { value: 'DIZZINESS', label: 'Dizziness' },
  { value: 'FAINTING', label: 'Fainting' },
  { value: 'INJURY', label: 'Injury' },
  { value: 'ASTHMA_CRISIS', label: 'Asthma crisis' },
  { value: 'ALLERGIC_REACTION', label: 'Allergic reaction' },
  { value: 'CHEST_PAIN', label: 'Chest pain' },
  { value: 'SEIZURE', label: 'Seizure' },
  { value: 'HYPERTENSION', label: 'Hypertension' },
  { value: 'NAUSEA', label: 'Nausea / vomiting' },
  { value: 'OTHER', label: 'Other' },
];

const RECOVERY_OPTIONS = [
  { value: 'MONITORING', label: 'Monitoring' },
  { value: 'IMPROVING', label: 'Improving' },
  { value: 'STABLE', label: 'Stable' },
  { value: 'RECOVERED', label: 'Recovered' },
  { value: 'CRITICAL', label: 'Critical' },
];

interface IncidentRow {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  followUpRequired: boolean;
  recoveryStatus: string;
  prayerTeamRequested: boolean;
  leadershipNotifiedAt: string | null;
  occurredAt: string;
  resolvedAt: string | null;
  subjectMember?: MemberRef | null;
  reporter?: MemberRef;
}

function formatMemberName(m?: MemberRef | null) {
  if (!m) return '—';
  return `${m.firstName} ${m.lastName}`.trim();
}

export function MedicalIncidentPanel({
  unitId,
  canEdit,
  canManage,
  members,
}: {
  unitId: string;
  canEdit: boolean;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  const queryClient = useQueryClient();
  const base = deptToolsApiBase(unitId);
  const [busy, setBusy] = useState(false);

  const { data: incidents = [], isLoading } = useApiQuery<IncidentRow[]>(
    ['dept-incidents', unitId],
    `${base}/incidents`,
  );
  const { data: teamLog = [] } = useApiQuery<
    Array<{ id: string; serviceDate: string; role?: string; member: MemberRef }>
  >(['dept-medical-team', unitId], `${base}/medical/team-attendance`, {
    enabled: canManage,
  });
  const { data: certs = [] } = useApiQuery<Array<{ id: string; title: string; member: MemberRef }>>(
    ['dept-certs', unitId],
    `${base}/certifications`,
    { enabled: canManage },
  );

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    severity: 'LOW',
    subjectMemberId: '',
    memberPhone: '',
    followUpRequired: true,
    requestPrayerTeam: true,
  });

  const [teamForm, setTeamForm] = useState({
    memberId: '',
    serviceDate: new Date().toISOString().slice(0, 10),
    role: 'First aid',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dept-incidents', unitId] });
    queryClient.invalidateQueries({ queryKey: ['dept-medical-team', unitId] });
  };

  const submitIncident = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/incidents`, {
        title: form.title,
        description: form.description,
        category: form.category,
        severity: form.severity,
        occurredAt: new Date().toISOString(),
        subjectMemberId: form.subjectMemberId || undefined,
        memberHint: form.memberPhone ? { phone: form.memberPhone } : undefined,
        followUpRequired: form.followUpRequired,
        requestPrayerTeam: form.requestPrayerTeam,
      });
      toast.success('Incident logged');
      setForm({
        title: '',
        description: '',
        category: 'OTHER',
        severity: 'LOW',
        subjectMemberId: '',
        memberPhone: '',
        followUpRequired: true,
        requestPrayerTeam: true,
      });
      refresh();
    } catch {
      toast.error('Could not log incident');
    } finally {
      setBusy(false);
    }
  };

  const updateRecovery = async (incidentId: string, recoveryStatus: string, resolved?: boolean) => {
    setBusy(true);
    try {
      await api.patch(`${base}/incidents/${incidentId}`, {
        recoveryStatus,
        resolved,
        recoveryNote: `Status set to ${recoveryStatus}`,
      });
      toast.success('Recovery updated');
      refresh();
    } catch {
      toast.error('Could not update recovery');
    } finally {
      setBusy(false);
    }
  };

  const logTeam = async () => {
    if (!teamForm.memberId) return;
    setBusy(true);
    try {
      await api.post(`${base}/medical/team-attendance`, teamForm);
      toast.success('Team attendance logged');
      refresh();
    } catch {
      toast.error('Could not log attendance');
    } finally {
      setBusy(false);
    }
  };

  const notifyAbsentees = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ notified: number }>(`${base}/medical/notify-absentees`, {});
      toast.success(`Absentee notices queued (${r.data.notified})`);
    } catch {
      toast.error('Could not send absentee notifications');
    } finally {
      setBusy(false);
    }
  };

  const weeklyReport = async () => {
    setBusy(true);
    try {
      await api.post(`${base}/medical/weekly-report`, {});
      toast.success('Weekly report sent to admin/pastor');
    } catch {
      toast.error('Could not generate weekly report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Incident reporting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Severity</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <Input
              placeholder="Incident title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              placeholder="What happened?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Link member (profile)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.subjectMemberId || ''}
                  onChange={(e) => setForm((f) => ({ ...f, subjectMemberId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {formatMemberName(m.member)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Or auto-link by phone</Label>
                <Input
                  placeholder="Member phone"
                  value={form.memberPhone}
                  onChange={(e) => setForm((f) => ({ ...f, memberPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.followUpRequired}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, followUpRequired: e.target.checked }))
                  }
                />
                Follow-up required
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requestPrayerTeam}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, requestPrayerTeam: e.target.checked }))
                  }
                />
                Prayer team (serious cases)
              </label>
            </div>
            <Button size="sm" onClick={submitIncident} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Log incident
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4" />
            Health follow-up & recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading incidents…</p>
          )}
          <ul className="space-y-3">
            {incidents.map((i) => (
              <li key={i.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_OPTIONS.find((c) => c.value === i.category)?.label ?? i.category}{' '}
                      · {i.severity} · {new Date(i.occurredAt).toLocaleString()}
                    </p>
                    {i.subjectMember && (
                      <p className="mt-1 text-xs">
                        Member: {formatMemberName(i.subjectMember)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {i.followUpRequired && <Badge variant="outline">Follow-up</Badge>}
                    {i.leadershipNotifiedAt && <Badge variant="gold">Leadership notified</Badge>}
                    {i.prayerTeamRequested && <Badge variant="outline">Prayer team</Badge>}
                    {i.resolvedAt && <Badge variant="outline">Resolved</Badge>}
                  </div>
                </div>
                <p className="mt-2 text-muted-foreground">{i.description}</p>
                {canManage && !i.resolvedAt && i.followUpRequired && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RECOVERY_OPTIONS.map((r) => (
                      <Button
                        key={r.value}
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => updateRecovery(i.id, r.value)}
                      >
                        {r.label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="default"
                      disabled={busy}
                      onClick={() => updateRecovery(i.id, 'RECOVERED', true)}
                    >
                      Mark recovered
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {!isLoading && incidents.length === 0 && (
              <p className="text-sm text-muted-foreground">No incidents logged yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Team attendance log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={teamForm.memberId}
                  onChange={(e) => setTeamForm((f) => ({ ...f, memberId: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {formatMemberName(m.member)}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={teamForm.serviceDate}
                  onChange={(e) => setTeamForm((f) => ({ ...f, serviceDate: e.target.value }))}
                />
                <Input
                  placeholder="Role (e.g. First aid)"
                  value={teamForm.role}
                  onChange={(e) => setTeamForm((f) => ({ ...f, role: e.target.value }))}
                />
              </div>
              <Button size="sm" variant="outline" onClick={logTeam} disabled={busy}>
                Log personnel on duty
              </Button>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {teamLog.map((t) => (
                  <li key={t.id}>
                    {formatMemberName(t.member)} — {new Date(t.serviceDate).toLocaleDateString()}
                    {t.role ? ` (${t.role})` : ''}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4" />
                Reports & alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={notifyAbsentees} disabled={busy}>
                <Bell className="mr-1 h-4 w-4" />
                Absentee notifications
              </Button>
              <Button size="sm" variant="outline" onClick={weeklyReport} disabled={busy}>
                <CalendarCheck className="mr-1 h-4 w-4" />
                Weekly report to leadership
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Stethoscope className="h-4 w-4" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {certs.length
                ? certs.map((c) => (
                    <div key={c.id}>
                      {formatMemberName(c.member)} — {c.title}
                    </div>
                  ))
                : 'No certifications recorded yet.'}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

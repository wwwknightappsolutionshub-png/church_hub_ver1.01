'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Heart,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { formatMemberName } from '@/lib/service-unit-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MemberRef = { id: string; firstName: string; lastName: string };

const BURDEN_TYPES = [
  { value: 'WEEKLY_BURDEN', label: 'Prayer burdens for the week' },
  { value: 'CHURCH_WIDE', label: 'Church-wide issues' },
  { value: 'MEMBER_NEED', label: 'Member-related needs' },
] as const;

const CONFIDENTIALITY = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'LEADERS_ONLY', label: 'Leaders only' },
  { value: 'INTERCESSORS_ONLY', label: 'Intercessors only' },
  { value: 'PASTORS_ONLY', label: 'Pastors only' },
] as const;

const INTAKE_CATEGORIES = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HEALING', label: 'Healing' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'SALVATION', label: 'Salvation' },
  { value: 'THANKSGIVING', label: 'Thanksgiving' },
  { value: 'OTHER', label: 'Other' },
] as const;

const SCHEDULE_TYPES = [
  { value: 'MIDNIGHT_CHAIN', label: 'Midnight chain prayer' },
  { value: 'DAILY_WATCH', label: 'Daily watch session' },
  { value: 'WEEKLY_MEETING', label: 'Weekly prayer meeting' },
] as const;

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'ANSWERED', label: 'Answered' },
] as const;

function currentWeekStartIso() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Converts `<input type="datetime-local">` value to ISO string for the API. */
function toIsoFromDatetimeLocal(value: string): string | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function optionalUuid(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function MemberMultiSelect({
  members,
  selected,
  onChange,
}: {
  members: Array<{ memberId: string; member: MemberRef }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs">Members ({selected.length} selected)</Label>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange(members.map((m) => m.memberId))}>
            All
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      </div>
      <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
        {members.map((m) => (
          <label
            key={m.memberId}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              selected.includes(m.memberId) ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted',
            )}
          >
            <input type="checkbox" className="h-4 w-4 rounded border" checked={selected.includes(m.memberId)} onChange={() => toggle(m.memberId)} />
            <span className="truncate">{formatMemberName(m.member)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export type PrayerSection = 'assignments' | 'schedule' | 'intake' | 'progress' | 'scripture';

export function PrayerSquadPanel({
  unitId,
  section,
  canEdit,
  canLead,
  canManage,
  members,
}: {
  unitId: string;
  section: PrayerSection;
  canEdit: boolean;
  canLead: boolean;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  const base = deptToolsApiBase(unitId);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [weekStart, setWeekStart] = useState(currentWeekStartIso());

  const err = (e: unknown, fb: string) => toast.error(apiErrorMessage(e as AxiosError, fb));
  const refreshPrayer = async () => {
    await qc.invalidateQueries({ queryKey: ['prayer-assignments', unitId] });
    await qc.invalidateQueries({ queryKey: ['prayer-schedule', unitId] });
    await qc.invalidateQueries({ queryKey: ['prayer-intake', unitId] });
    await qc.invalidateQueries({ queryKey: ['prayer-progress', unitId] });
    await qc.invalidateQueries({ queryKey: ['prayer-scripture', unitId] });
  };

  const { data: assignments, isLoading: assignmentsLoading } = useApiQuery<{
    weekKey: string;
    assignments: Array<{
      id: string;
      burdenType: string;
      confidentiality: string;
      title: string;
      content: string;
      assignedMember?: MemberRef | null;
      relatedMember?: MemberRef | null;
    }>;
    byBurden: Array<{ value: string; label: string; items: unknown[] }>;
  }>(['prayer-assignments', unitId, weekStart], `${base}/prayer/assignments?weekStart=${weekStart}`, {
    enabled: section === 'assignments',
  });

  const { data: scheduleData, isLoading: scheduleLoading } = useApiQuery<{
    sessions: Array<{
      id: string;
      eventType: string;
      title?: string | null;
      startsAt: string;
      endsAt?: string | null;
      notes?: string | null;
      attendance: Array<{ id: string; attended: boolean; member: MemberRef }>;
    }>;
    byType: Array<{ value: string; label: string; sessions: unknown[] }>;
  }>(['prayer-schedule', unitId], `${base}/prayer/schedule`, { enabled: section === 'schedule' });

  const { data: intake = [], isLoading: intakeLoading } = useApiQuery<
    Array<{
      id: string;
      content: string;
      status: string;
      intakeCategory: string;
      confidentiality: string;
      isAnswered: boolean;
      escalatedToPastorAt?: string | null;
      assignedMember?: MemberRef | null;
      submittedByMember?: MemberRef | null;
    }>
  >(['prayer-intake', unitId], `${base}/prayer/intake`, { enabled: section === 'intake' });

  const { data: progressData, isLoading: progressLoading } = useApiQuery<{
    items: Array<{
      id: string;
      content: string;
      status: string;
      isAnswered: boolean;
      intakeCategory?: string | null;
      assignedMember?: MemberRef | null;
    }>;
    notes: Array<{
      id: string;
      body: string;
      statusAfter?: string | null;
      createdAt: string;
      author: MemberRef;
      prayerItem?: { id: string; content: string } | null;
    }>;
  }>(['prayer-progress', unitId], `${base}/prayer/progress`, { enabled: section === 'progress' });

  const { data: scripture = [], isLoading: scriptureLoading } = useApiQuery<
    Array<{
      id: string;
      serviceDate: string;
      scriptureRef: string;
      prayerPoints: string;
      devotionTieIn?: string | null;
    }>
  >(['prayer-scripture', unitId], `${base}/prayer/scripture`, { enabled: section === 'scripture' });

  const [assignmentForm, setAssignmentForm] = useState({
    id: '' as string | undefined,
    burdenType: 'WEEKLY_BURDEN',
    confidentiality: 'LEADERS_ONLY',
    title: '',
    content: '',
    relatedMemberId: '',
    assignedMemberId: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    id: '' as string | undefined,
    eventType: 'MIDNIGHT_CHAIN',
    title: '',
    startsAt: '',
    endsAt: '',
    notes: '',
  });

  const [attendanceSessionId, setAttendanceSessionId] = useState('');
  const [attendanceMemberIds, setAttendanceMemberIds] = useState<string[]>([]);

  const [intakeForm, setIntakeForm] = useState({
    content: '',
    intakeCategory: 'URGENT',
    confidentiality: 'LEADERS_ONLY',
    isAnonymous: false,
    relatedMemberId: '',
  });

  const [progressNote, setProgressNote] = useState({
    prayerItemId: '',
    body: '',
    statusAfter: 'IN_PROGRESS',
  });

  const [scriptureForm, setScriptureForm] = useState({
    id: '' as string | undefined,
    serviceDate: new Date().toISOString().slice(0, 10),
    scriptureRef: '',
    devotionTieIn: '',
    prayerPoints: '',
    autoGenerate: true,
  });

  const canMutateLead = canLead || canManage;

  if (section === 'assignments') {
    const saveAssignment = async () => {
      if (!canMutateLead) {
        toast.error('Department leader or admin access required');
        return;
      }
      if (!assignmentForm.title?.trim() || !assignmentForm.content?.trim()) {
        toast.error('Title and details are required');
        return;
      }
      setBusy(true);
      try {
        await api.post(`${base}/prayer/assignments`, {
          ...(optionalUuid(assignmentForm.id) ? { id: assignmentForm.id } : {}),
          weekStart,
          burdenType: assignmentForm.burdenType,
          confidentiality: assignmentForm.confidentiality,
          title: assignmentForm.title.trim(),
          content: assignmentForm.content.trim(),
          relatedMemberId: optionalUuid(assignmentForm.relatedMemberId),
          assignedMemberId: optionalUuid(assignmentForm.assignedMemberId),
        });
        toast.success('Assignment saved');
        setAssignmentForm({
          id: undefined,
          burdenType: 'WEEKLY_BURDEN',
          confidentiality: 'LEADERS_ONLY',
          title: '',
          content: '',
          relatedMemberId: '',
          assignedMemberId: '',
        });
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not save assignment');
      } finally {
        setBusy(false);
      }
    };

    const deleteAssignment = async (id: string) => {
      if (!confirm('Remove this assignment?')) return;
      try {
        await api.delete(`${base}/prayer/assignments/${id}`);
        toast.success('Removed');
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not delete');
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Week starting (Mon)</Label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-40" />
          </div>
        </div>

        {assignmentsLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          BURDEN_TYPES.map((b) => {
            const items =
              assignments?.assignments?.filter((a) => a.burdenType === b.value) ?? [];
            return (
              <Card key={b.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{b.label}</CardTitle>
                  <CardDescription>Confidentiality levels apply per item.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No items this week.</p>
                  ) : (
                    items.map((a) => (
                      <div key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="font-medium">{a.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {CONFIDENTIALITY.find((c) => c.value === a.confidentiality)?.label ?? a.confidentiality}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">{a.content}</p>
                        {(a.assignedMember || a.relatedMember) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {a.assignedMember ? `Intercessor: ${formatMemberName(a.assignedMember)}` : ''}
                            {a.relatedMember ? ` · Related: ${formatMemberName(a.relatedMember)}` : ''}
                          </p>
                        )}
                        {canMutateLead && (
                          <div className="mt-2 flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setAssignmentForm({
                                  id: a.id,
                                  burdenType: a.burdenType,
                                  confidentiality: a.confidentiality,
                                  title: a.title,
                                  content: a.content,
                                  relatedMemberId: a.relatedMember?.id ?? '',
                                  assignedMemberId: a.assignedMember?.id ?? '',
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAssignment(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {canMutateLead && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4" />
                Add assignment board item
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={assignmentForm.burdenType}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, burdenType: e.target.value })}
              >
                {BURDEN_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={assignmentForm.confidentiality}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, confidentiality: e.target.value })}
              >
                {CONFIDENTIALITY.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Title"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                className="sm:col-span-2"
              />
              <Textarea
                placeholder="Prayer focus / details"
                value={assignmentForm.content}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, content: e.target.value })}
                rows={3}
                className="sm:col-span-2"
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={assignmentForm.assignedMemberId}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, assignedMemberId: e.target.value })}
              >
                <option value="">Assign intercessor (optional)</option>
                {members.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {formatMemberName(m.member)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={assignmentForm.relatedMemberId}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, relatedMemberId: e.target.value })}
              >
                <option value="">Related member (optional)</option>
                {members.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {formatMemberName(m.member)}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={saveAssignment} disabled={busy} className="sm:col-span-2">
                Save to board
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (section === 'schedule') {
    const saveSchedule = async () => {
      if (!canMutateLead) {
        toast.error('Department leader or admin access required');
        return;
      }
      const startsAt = toIsoFromDatetimeLocal(scheduleForm.startsAt);
      if (!startsAt) {
        toast.error('Start date and time are required');
        return;
      }
      setBusy(true);
      try {
        await api.post(`${base}/prayer/schedule`, {
          ...(optionalUuid(scheduleForm.id) ? { id: scheduleForm.id } : {}),
          eventType: scheduleForm.eventType,
          title: scheduleForm.title.trim() || undefined,
          startsAt,
          endsAt: toIsoFromDatetimeLocal(scheduleForm.endsAt),
          notes: scheduleForm.notes.trim() || undefined,
        });
        toast.success('Session saved');
        setScheduleForm({ id: undefined, eventType: 'MIDNIGHT_CHAIN', title: '', startsAt: '', endsAt: '', notes: '' });
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not save session');
      } finally {
        setBusy(false);
      }
    };

    const saveAttendance = async () => {
      if (!canMutateLead) {
        toast.error('Department leader or admin access required');
        return;
      }
      if (!attendanceSessionId || !attendanceMemberIds.length) {
        toast.error('Select a session and at least one member');
        return;
      }
      setBusy(true);
      try {
        await api.post(`${base}/prayer/schedule/attendance/bulk`, {
          sessionId: attendanceSessionId,
          memberIds: attendanceMemberIds,
          attended: true,
        });
        toast.success('Attendance recorded');
        setAttendanceMemberIds([]);
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not save attendance');
      } finally {
        setBusy(false);
      }
    };

    const sessions = scheduleData?.sessions ?? [];

    return (
      <div className="space-y-4">
        {scheduleLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          SCHEDULE_TYPES.map((t) => {
            const group = sessions.filter((s) => s.eventType === t.value);
            return (
              <Card key={t.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {t.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sessions scheduled.</p>
                  ) : (
                    group.map((s) => (
                      <div key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                        <p className="font-medium">{s.title || t.label}</p>
                        <p className="text-muted-foreground">
                          {new Date(s.startsAt).toLocaleString()}
                          {s.endsAt ? ` – ${new Date(s.endsAt).toLocaleTimeString()}` : ''}
                        </p>
                        {s.notes && <p className="mt-1 text-xs">{s.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Attendance: {s.attendance.filter((a) => a.attended).length} present
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {canMutateLead && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Schedule session</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={scheduleForm.eventType}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, eventType: e.target.value })}
                >
                  {SCHEDULE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Input placeholder="Title (optional)" value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} />
                <Input type="datetime-local" value={scheduleForm.startsAt} onChange={(e) => setScheduleForm({ ...scheduleForm, startsAt: e.target.value })} />
                <Input type="datetime-local" placeholder="End (optional)" value={scheduleForm.endsAt} onChange={(e) => setScheduleForm({ ...scheduleForm, endsAt: e.target.value })} />
                <Textarea
                  placeholder="Notes"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  rows={2}
                  className="sm:col-span-2"
                />
                <Button type="button" onClick={saveSchedule} disabled={busy} className="sm:col-span-2">
                  Save session
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Attendance tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={attendanceSessionId}
                  onChange={(e) => setAttendanceSessionId(e.target.value)}
                >
                  <option value="">Select session…</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {SCHEDULE_TYPES.find((t) => t.value === s.eventType)?.label} · {new Date(s.startsAt).toLocaleString()}
                    </option>
                  ))}
                </select>
                {members.length > 0 && (
                  <MemberMultiSelect members={members} selected={attendanceMemberIds} onChange={setAttendanceMemberIds} />
                )}
                <Button type="button" onClick={saveAttendance} disabled={busy || !attendanceSessionId}>
                  Record attendance
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (section === 'intake') {
    const submitIntake = async () => {
      if (!canEdit) {
        toast.error('You need department membership to submit requests');
        return;
      }
      if (!intakeForm.content.trim()) {
        toast.error('Please describe the prayer need');
        return;
      }
      setBusy(true);
      try {
        await api.post(`${base}/prayer/intake`, {
          content: intakeForm.content.trim(),
          intakeCategory: intakeForm.intakeCategory,
          confidentiality: intakeForm.confidentiality,
          isAnonymous: intakeForm.isAnonymous,
          relatedMemberId: optionalUuid(intakeForm.relatedMemberId),
        });
        toast.success('Request submitted');
        setIntakeForm({ content: '', intakeCategory: 'URGENT', confidentiality: 'LEADERS_ONLY', isAnonymous: false, relatedMemberId: '' });
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not submit request');
      } finally {
        setBusy(false);
      }
    };

    const escalate = async (id: string) => {
      if (!canMutateLead) {
        toast.error('Leader access required to escalate');
        return;
      }
      try {
        await api.post(`${base}/prayer/intake/${id}/escalate`);
        toast.success('Escalated to pastoral care — pastors notified');
        await refreshPrayer();
      } catch (e) {
        err(e, 'Escalation failed');
      }
    };

    const patchIntake = async (id: string, data: Record<string, unknown>) => {
      if (!canMutateLead) {
        toast.error('Leader access required');
        return;
      }
      try {
        await api.patch(`${base}/prayer/intake/${id}`, data);
        toast.success('Updated');
        await refreshPrayer();
      } catch (e) {
        err(e, 'Update failed');
      }
    };

    return (
      <div className="space-y-4">
        {canEdit && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4" />
                Submit prayer request
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={intakeForm.intakeCategory}
                onChange={(e) => setIntakeForm({ ...intakeForm, intakeCategory: e.target.value })}
              >
                {INTAKE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={intakeForm.confidentiality}
                onChange={(e) => setIntakeForm({ ...intakeForm, confidentiality: e.target.value })}
              >
                {CONFIDENTIALITY.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Textarea
                placeholder="Prayer need (share only what is appropriate)"
                value={intakeForm.content}
                onChange={(e) => setIntakeForm({ ...intakeForm, content: e.target.value })}
                rows={4}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={intakeForm.isAnonymous}
                  onChange={(e) => setIntakeForm({ ...intakeForm, isAnonymous: e.target.checked })}
                />
                Submit anonymously
              </label>
              <Button type="button" onClick={submitIntake} disabled={busy}>
                Submit request
              </Button>
            </CardContent>
          </Card>
        )}

        {intakeLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <ul className="space-y-2">
            {intake.map((item) => (
              <li key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline">
                    {INTAKE_CATEGORIES.find((c) => c.value === item.intakeCategory)?.label ?? item.intakeCategory}
                  </Badge>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="mt-2">{item.content}</p>
                {item.escalatedToPastorAt && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Escalated to pastors
                  </p>
                )}
                {canMutateLead && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {!item.escalatedToPastorAt && (
                      <Button type="button" size="sm" variant="outline" onClick={() => escalate(item.id)}>
                        Escalate to pastors
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="secondary" onClick={() => patchIntake(item.id, { status: 'IN_PROGRESS' })}>
                      Mark in progress
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => patchIntake(item.id, { isAnswered: true, status: 'ANSWERED' })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Answered
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (section === 'progress') {
    const addNote = async () => {
      if (!canMutateLead) {
        toast.error('Leader access required to add notes');
        return;
      }
      if (!progressNote.prayerItemId || !progressNote.body.trim()) {
        toast.error('Select a request and enter a note');
        return;
      }
      setBusy(true);
      try {
        await api.post(`${base}/prayer/progress/notes`, {
          prayerItemId: progressNote.prayerItemId,
          body: progressNote.body.trim(),
          statusAfter: progressNote.statusAfter,
        });
        toast.success('Note added — pastors can review in progress log');
        setProgressNote({ prayerItemId: '', body: '', statusAfter: 'IN_PROGRESS' });
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not add note');
      } finally {
        setBusy(false);
      }
    };

    const markAnswered = async (id: string) => {
      if (!canMutateLead) {
        toast.error('Leader access required');
        return;
      }
      try {
        await api.patch(`${base}/prayer/intake/${id}`, { isAnswered: true, status: 'ANSWERED' });
        toast.success('Marked answered');
        await refreshPrayer();
      } catch (e) {
        err(e, 'Could not update');
      }
    };

    const items = progressData?.items ?? [];
    const notes = progressData?.notes ?? [];

    return (
      <div className="space-y-4">
        {progressLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prayer queue status</CardTitle>
                <CardDescription>Mark answered prayers and update status for pastors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                      item.isAnswered && 'opacity-70',
                    )}
                  >
                    <div className={cn(item.isAnswered && 'line-through')}>
                      <p>{item.content.slice(0, 200)}{item.content.length > 200 ? '…' : ''}</p>
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                    </div>
                    {canMutateLead && !item.isAnswered && (
                      <Button type="button" size="sm" variant="outline" onClick={() => markAnswered(item.id)}>
                        Mark answered
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {canMutateLead && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prayer notes (leaders)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={progressNote.prayerItemId}
                    onChange={(e) => setProgressNote({ ...progressNote, prayerItemId: e.target.value })}
                  >
                    <option value="">Link to request…</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.content.slice(0, 60)}…
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={progressNote.statusAfter}
                    onChange={(e) => setProgressNote({ ...progressNote, statusAfter: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        Status after note: {s.label}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Prayer note for pastors / intercessors"
                    value={progressNote.body}
                    onChange={(e) => setProgressNote({ ...progressNote, body: e.target.value })}
                    rows={3}
                  />
                  <Button type="button" onClick={addNote} disabled={busy}>
                    Add note
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No progress notes yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="rounded-lg border px-3 py-2 text-sm">
                      <p>{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatMemberName(n.author)} · {new Date(n.createdAt).toLocaleString()}
                        {n.statusAfter ? ` · ${n.statusAfter}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // scripture
  const saveScripture = async () => {
    if (!canMutateLead) {
      toast.error('Department leader or admin access required');
      return;
    }
    if (!scriptureForm.scriptureRef.trim()) {
      toast.error('Scripture reference is required');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/prayer/scripture`, {
        ...(optionalUuid(scriptureForm.id) ? { id: scriptureForm.id } : {}),
        serviceDate: scriptureForm.serviceDate,
        scriptureRef: scriptureForm.scriptureRef.trim(),
        devotionTieIn: scriptureForm.devotionTieIn.trim() || undefined,
        prayerPoints: scriptureForm.prayerPoints.trim() || undefined,
        autoGenerate: scriptureForm.autoGenerate && !scriptureForm.prayerPoints.trim(),
      });
      toast.success('Scripture guide saved');
      setScriptureForm({
        id: undefined,
        serviceDate: new Date().toISOString().slice(0, 10),
        scriptureRef: '',
        devotionTieIn: '',
        prayerPoints: '',
        autoGenerate: true,
      });
      await refreshPrayer();
    } catch (e) {
      err(e, 'Could not save guide');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {scriptureLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      ) : (
        <ul className="space-y-2">
          {scripture.map((g) => (
            <li key={g.id} className="rounded-lg border px-3 py-2 text-sm">
              <p className="font-medium">
                {new Date(g.serviceDate).toLocaleDateString()} · {g.scriptureRef}
              </p>
              {g.devotionTieIn && <p className="text-xs text-muted-foreground">Devotion: {g.devotionTieIn}</p>}
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{g.prayerPoints}</pre>
            </li>
          ))}
        </ul>
      )}

      {canMutateLead && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Daily scripture & prayer points
            </CardTitle>
            <CardDescription>Auto-generated prayer points with optional group devotion tie-in.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Input type="date" value={scriptureForm.serviceDate} onChange={(e) => setScriptureForm({ ...scriptureForm, serviceDate: e.target.value })} className="w-40" />
            <Input
              placeholder="Scripture reference (e.g. Philippians 4:6–7)"
              value={scriptureForm.scriptureRef}
              onChange={(e) => setScriptureForm({ ...scriptureForm, scriptureRef: e.target.value })}
            />
            <Input
              placeholder="Group devotion tie-in (optional)"
              value={scriptureForm.devotionTieIn}
              onChange={(e) => setScriptureForm({ ...scriptureForm, devotionTieIn: e.target.value })}
            />
            <Textarea
              placeholder="Prayer points (leave blank to auto-generate)"
              value={scriptureForm.prayerPoints}
              onChange={(e) => setScriptureForm({ ...scriptureForm, prayerPoints: e.target.value, autoGenerate: false })}
              rows={6}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scriptureForm.autoGenerate}
                onChange={(e) => setScriptureForm({ ...scriptureForm, autoGenerate: e.target.checked })}
              />
              Auto-generate prayer points from scripture
            </label>
            <Button type="button" onClick={saveScripture} disabled={busy} className="gap-1">
              <Sparkles className="h-4 w-4" />
              Save guide
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { formatMemberName } from '@/lib/service-unit-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type MemberRef = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

const CLASS_GROUPS = [
  { value: 'AGES_3_5', label: 'Ages 3–5' },
  { value: 'AGES_6_9', label: 'Ages 6–9' },
  { value: 'AGES_10_12', label: 'Ages 10–12' },
] as const;

type ClassGroup = (typeof CLASS_GROUPS)[number]['value'];

function currentWeekStartIso() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export type ChildrenSection = 'roster' | 'curriculum' | 'reports' | 'checkin';

export function ChildrenTeachersPanel({
  unitId,
  section,
  canEdit,
  canManage,
  members,
}: {
  unitId: string;
  section: ChildrenSection;
  canEdit: boolean;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  const base = deptToolsApiBase(unitId);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [weekStart, setWeekStart] = useState(currentWeekStartIso());
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: roster, isLoading: rosterLoading } = useApiQuery<{
    weekKey: string;
    assignments: Array<{
      id: string;
      classGroup: ClassGroup;
      notes?: string | null;
      reminderSentAt?: string | null;
      teacher: MemberRef;
      assistant?: MemberRef | null;
    }>;
    distribution: Array<{ classGroup: ClassGroup; label: string; assigned: boolean }>;
  }>(['children-roster', unitId, weekStart], `${base}/children/roster?weekStart=${weekStart}`);

  const { data: curriculum = [] } = useApiQuery<
    Array<{
      id: string;
      title: string;
      weekStart?: string | null;
      fileUrl?: string | null;
      body?: string | null;
      source: string;
      targetClassGroup?: ClassGroup | null;
      simplifiedLesson?: string | null;
    }>
  >(['children-curriculum', unitId], `${base}/children/curriculum`);

  const { data: reports = [] } = useApiQuery<
    Array<{
      id: string;
      classGroup: ClassGroup;
      serviceDate: string;
      lessonTaught: string;
      behaviorNotes?: string | null;
      attentionNotes?: string | null;
      escalatePastoralCare: boolean;
      pastoralNotifiedAt?: string | null;
      teacher: MemberRef;
      curriculum?: { id: string; title: string } | null;
    }>
  >(['children-reports', unitId], `${base}/children/reports`);

  const { data: checkIns = [] } = useApiQuery<
    Array<{ id: string; child: MemberRef; checkedOutAt?: string | null }>
  >(['dept-checkins', unitId], `${base}/check-ins`);

  const [rosterForm, setRosterForm] = useState({
    classGroup: 'AGES_3_5' as ClassGroup,
    teacherMemberId: members[0]?.memberId ?? '',
    assistantMemberId: '',
    notes: '',
  });

  const [curriculumForm, setCurriculumForm] = useState({
    title: '',
    body: '',
    weekStart: currentWeekStartIso(),
    source: 'OFFICIAL_WEEKLY' as 'OFFICIAL_WEEKLY' | 'CUSTOM_UPLOAD',
    targetClassGroup: 'AGES_6_9' as ClassGroup,
  });

  const [reportForm, setReportForm] = useState({
    classGroup: 'AGES_6_9' as ClassGroup,
    teacherMemberId: members[0]?.memberId ?? '',
    curriculumId: '',
    lessonTaught: '',
    behaviorNotes: '',
    attentionNotes: '',
    escalatePastoralCare: false,
    pastoralSummary: '',
  });

  const [childId, setChildId] = useState(members[0]?.memberId ?? '');
  const [simplifyGroup, setSimplifyGroup] = useState<ClassGroup>('AGES_6_9');
  const [simplifyId, setSimplifyId] = useState('');

  useEffect(() => {
    const first = members[0]?.memberId;
    if (!first) return;
    setRosterForm((f) => (f.teacherMemberId ? f : { ...f, teacherMemberId: first }));
    setReportForm((f) => (f.teacherMemberId ? f : { ...f, teacherMemberId: first }));
    setChildId((id) => id || first);
  }, [members]);

  const refresh = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['children-roster', unitId] }),
      queryClient.refetchQueries({ queryKey: ['children-curriculum', unitId] }),
      queryClient.refetchQueries({ queryKey: ['children-reports', unitId] }),
      queryClient.refetchQueries({ queryKey: ['dept-checkins', unitId] }),
    ]);
  };

  const showError = (err: unknown, fallback: string) => {
    toast.error(apiErrorMessage(err as AxiosError, fallback));
  };

  const saveRoster = async () => {
    if (!rosterForm.teacherMemberId) {
      toast.error('Select a lead teacher');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/children/roster`, {
        weekStart,
        ...rosterForm,
        assistantMemberId: rosterForm.assistantMemberId || undefined,
      });
      toast.success('Roster saved');
      await refresh();
    } catch (err) {
      showError(err, 'Could not save roster');
    } finally {
      setBusy(false);
    }
  };

  const sendReminders = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ remindersQueued: number }>(`${base}/children/send-reminders`, {
        weekStart,
      });
      toast.success(`Reminders queued (${res.data.remindersQueued})`);
      await refresh();
    } catch (err) {
      showError(err, 'Could not send reminders');
    } finally {
      setBusy(false);
    }
  };

  const addCurriculum = async () => {
    if (!curriculumForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/children/curriculum`, {
        title: curriculumForm.title.trim(),
        weekStart: curriculumForm.weekStart || undefined,
        body: curriculumForm.body.trim() || undefined,
        source: curriculumForm.source,
        targetClassGroup: curriculumForm.targetClassGroup,
      });
      toast.success('Curriculum added');
      setCurriculumForm((f) => ({ ...f, title: '', body: '' }));
      await refresh();
    } catch (err) {
      showError(err, 'Could not add curriculum');
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name.replace(/\.pdf$/i, '') || 'Teaching material');
    form.append('weekStart', curriculumForm.weekStart);
    form.append('targetClassGroup', curriculumForm.targetClassGroup);
    setBusy(true);
    try {
      await api.post(`${base}/children/curriculum/upload`, form);
      toast.success('PDF uploaded');
      refresh();
    } catch (err) {
      showError(err, 'PDF upload failed');
    } finally {
      setBusy(false);
    }
  };

  const simplifyLesson = async () => {
    if (!simplifyId) {
      toast.error('Select a curriculum item');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/children/curriculum/${simplifyId}/simplify`, {
        classGroup: simplifyGroup,
      });
      toast.success('Lesson simplified');
      await refresh();
    } catch (err) {
      showError(err, 'Simplification failed');
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!reportForm.lessonTaught.trim()) {
      toast.error('Describe what was taught');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/children/reports`, {
        classGroup: reportForm.classGroup,
        teacherMemberId: reportForm.teacherMemberId,
        curriculumId: reportForm.curriculumId || undefined,
        lessonTaught: reportForm.lessonTaught.trim(),
        behaviorNotes: reportForm.behaviorNotes.trim() || undefined,
        attentionNotes: reportForm.attentionNotes.trim() || undefined,
        escalatePastoralCare: reportForm.escalatePastoralCare,
        pastoralSummary: reportForm.pastoralSummary.trim() || undefined,
        serviceDate: new Date().toISOString(),
      });
      toast.success(
        reportForm.escalatePastoralCare
          ? 'Report submitted — pastoral team notified'
          : 'Class report submitted',
      );
      setReportForm((f) => ({
        ...f,
        lessonTaught: '',
        behaviorNotes: '',
        attentionNotes: '',
        pastoralSummary: '',
        escalatePastoralCare: false,
      }));
      await refresh();
    } catch (err) {
      showError(err, 'Could not submit report');
    } finally {
      setBusy(false);
    }
  };

  const checkIn = async () => {
    if (!childId) return;
    try {
      await api.post(`${base}/check-ins`, { childMemberId: childId });
      toast.success('Checked in');
      await refresh();
    } catch (err) {
      showError(err, 'Check-in failed');
    }
  };

  const checkOut = async (id: string) => {
    try {
      await api.patch(`${base}/check-ins/${id}/checkout`);
      toast.success('Checked out');
      await refresh();
    } catch (err) {
      showError(err, 'Check-out failed');
    }
  };

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add members to this service unit before assigning teachers or recording check-ins.
      </p>
    );
  }

  if (section === 'roster') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Week starting (Mon)</Label>
            <Input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-40"
            />
          </div>
          {canManage && (
            <Button type="button" size="sm" variant="outline" onClick={sendReminders} disabled={busy} className="gap-1">
              <Bell className="h-4 w-4" />
              Send reminders
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {roster?.distribution?.map((d) => (
            <Card key={d.classGroup} className={d.assigned ? 'border-green-500/40' : ''}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">{d.label}</p>
                <Badge variant={d.assigned ? 'default' : 'secondary'} className="mt-1">
                  {d.assigned ? 'Assigned' : 'Open'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {rosterLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <ul className="space-y-2">
            {roster?.assignments?.map((a) => (
              <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {CLASS_GROUPS.find((g) => g.value === a.classGroup)?.label}
                  </span>
                  {a.reminderSentAt && (
                    <Badge variant="outline" className="text-xs">
                      Reminder sent
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Lead: {formatMemberName(a.teacher)}
                  {a.assistant ? ` · Asst: ${formatMemberName(a.assistant)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assign teacher</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={rosterForm.classGroup}
                onChange={(e) => setRosterForm({ ...rosterForm, classGroup: e.target.value as ClassGroup })}
              >
                {CLASS_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={rosterForm.teacherMemberId}
                onChange={(e) => setRosterForm({ ...rosterForm, teacherMemberId: e.target.value })}
              >
                {members.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {formatMemberName(m.member)} (lead)
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
                value={rosterForm.assistantMemberId}
                onChange={(e) => setRosterForm({ ...rosterForm, assistantMemberId: e.target.value })}
              >
                <option value="">No assistant</option>
                {members.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {formatMemberName(m.member)} (assistant)
                  </option>
                ))}
              </select>
              <Input
                placeholder="Notes"
                value={rosterForm.notes}
                onChange={(e) => setRosterForm({ ...rosterForm, notes: e.target.value })}
                className="sm:col-span-2"
              />
              <Button type="button" onClick={saveRoster} disabled={busy} className="sm:col-span-2">
                Save weekly assignment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (section === 'curriculum') {
    return (
      <div className="space-y-3">
        <ul className="space-y-2">
          {curriculum.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.source === 'OFFICIAL_WEEKLY' ? 'Official weekly' : 'Custom upload'}
                  {c.targetClassGroup
                    ? ` · ${CLASS_GROUPS.find((g) => g.value === c.targetClassGroup)?.label}`
                    : ''}
                </p>
                {c.simplifiedLesson && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.simplifiedLesson}</p>
                )}
              </div>
              <div className="flex gap-1">
                {c.fileUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={c.fileUrl} target="_blank" rel="noreferrer" className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canEdit && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Weekly teaching material</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Input
                  placeholder="Lesson title"
                  value={curriculumForm.title}
                  onChange={(e) => setCurriculumForm({ ...curriculumForm, title: e.target.value })}
                />
                <Textarea
                  placeholder="Lesson outline or notes (for download / simplify)"
                  value={curriculumForm.body}
                  onChange={(e) => setCurriculumForm({ ...curriculumForm, body: e.target.value })}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                    value={curriculumForm.source}
                    onChange={(e) =>
                      setCurriculumForm({
                        ...curriculumForm,
                        source: e.target.value as 'OFFICIAL_WEEKLY' | 'CUSTOM_UPLOAD',
                      })
                    }
                  >
                    <option value="OFFICIAL_WEEKLY">Official weekly pack</option>
                    <option value="CUSTOM_UPLOAD">Custom material</option>
                  </select>
                  <Input
                    type="date"
                    value={curriculumForm.weekStart}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, weekStart: e.target.value })}
                    className="w-36"
                  />
                </div>
                <Button type="button" onClick={addCurriculum} disabled={busy}>
                  Add to library
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Upload custom PDF</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPdf(f);
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy} className="gap-1">
                  <Upload className="h-4 w-4" />
                  Upload PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Sparkles className="h-4 w-4" />
                  AI-assisted simplification
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <select
                  className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                  value={simplifyId}
                  onChange={(e) => setSimplifyId(e.target.value)}
                >
                  <option value="">Select lesson…</option>
                  {curriculum.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-32 rounded-md border bg-background px-3 text-sm"
                  value={simplifyGroup}
                  onChange={(e) => setSimplifyGroup(e.target.value as ClassGroup)}
                >
                  {CLASS_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={simplifyLesson} disabled={busy} variant="secondary">
                  Simplify
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (section === 'reports') {
    return (
      <div className="space-y-3">
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {CLASS_GROUPS.find((g) => g.value === r.classGroup)?.label} ·{' '}
                  {new Date(r.serviceDate).toLocaleDateString()}
                </span>
                {r.escalatePastoralCare && (
                  <Badge variant="destructive">Pastoral escalation</Badge>
                )}
              </div>
              <p className="mt-1">{r.lessonTaught}</p>
              {r.behaviorNotes && (
                <p className="text-xs text-muted-foreground">Behavior: {r.behaviorNotes}</p>
              )}
              {r.attentionNotes && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Attention: {r.attentionNotes}
                </p>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Submit class report</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={reportForm.classGroup}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, classGroup: e.target.value as ClassGroup })
                  }
                >
                  {CLASS_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={reportForm.teacherMemberId}
                  onChange={(e) => setReportForm({ ...reportForm, teacherMemberId: e.target.value })}
                >
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {formatMemberName(m.member)}
                    </option>
                  ))}
                </select>
              </div>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={reportForm.curriculumId}
                onChange={(e) => setReportForm({ ...reportForm, curriculumId: e.target.value })}
              >
                <option value="">Curriculum (optional)</option>
                {curriculum.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <Textarea
                placeholder="What was taught?"
                value={reportForm.lessonTaught}
                onChange={(e) => setReportForm({ ...reportForm, lessonTaught: e.target.value })}
                rows={2}
              />
              <Textarea
                placeholder="Behavior notes"
                value={reportForm.behaviorNotes}
                onChange={(e) => setReportForm({ ...reportForm, behaviorNotes: e.target.value })}
                rows={2}
              />
              <Textarea
                placeholder="Children needing attention / feedback"
                value={reportForm.attentionNotes}
                onChange={(e) => setReportForm({ ...reportForm, attentionNotes: e.target.value })}
                rows={2}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reportForm.escalatePastoralCare}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, escalatePastoralCare: e.target.checked })
                  }
                />
                Escalate to pastoral care
              </label>
              {reportForm.escalatePastoralCare && (
                <Textarea
                  placeholder="Summary for pastoral team (optional)"
                  value={reportForm.pastoralSummary}
                  onChange={(e) => setReportForm({ ...reportForm, pastoralSummary: e.target.value })}
                  rows={2}
                />
              )}
              <Button type="button" onClick={submitReport} disabled={busy}>
                Submit report
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {formatMemberName(m.member)}
                </option>
              ))}
            </select>
            <Button type="button" onClick={checkIn} className="gap-1">
              <Users className="h-4 w-4" />
              Check in
            </Button>
          </div>
        )}
        <ul className="space-y-2">
          {checkIns.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>{formatMemberName(c.child)}</span>
              {!c.checkedOutAt && canEdit ? (
                <Button type="button" size="sm" variant="outline" onClick={() => checkOut(c.id)}>
                  Check out
                </Button>
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </li>
          ))}
        </ul>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Plus,
  Send,
  TreePine,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ChildrenMinistryBirthdayDto,
  ChildrenMinistryChildDetailDto,
  ChildrenMinistryListItemDto,
  ChildrenMinistryParentDto,
  ChildrenMinistryTeacherDto,
  ChildrenSundayReportResultDto,
  ChildrenSundayReportSubmitDto,
  ChildrenClassGroup,
  PaginatedDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { formatMemberName } from '@/lib/service-unit-utils';
import { useChildrenClassGroups } from '@/lib/children-classes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FALLBACK_CLASS_GROUPS = [
  { value: 'AGES_3_5', label: 'Ages 3–5' },
  { value: 'AGES_6_9', label: 'Ages 6–9' },
  { value: 'AGES_10_12', label: 'Ages 10–12' },
] as const;

type SundayReportRow = {
  classGroup: string;
  boys: string;
  girls: string;
};

function emptySundayReportRows(classGroups: Array<{ value: string }>): SundayReportRow[] {
  const groups = classGroups.length ? classGroups : FALLBACK_CLASS_GROUPS;
  return groups.map((group) => ({
    classGroup: group.value,
    boys: '',
    girls: '',
  }));
}

export type ChildrenMinistrySection =
  | 'children'
  | 'parents'
  | 'teachers'
  | 'birthdays'
  | 'sunday-report';

type UnitMemberRef = {
  memberId: string;
  member: { id: string; firstName: string; lastName: string; email?: string | null };
};

function currentWeekStartIso() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function ChildrenMinistryPanel({
  unitId,
  section,
  canManage = false,
  members = [],
}: {
  unitId: string;
  section: ChildrenMinistrySection;
  canManage?: boolean;
  members?: UnitMemberRef[];
}) {
  const base = deptToolsApiBase(unitId);
  const { classOptions } = useChildrenClassGroups(unitId);
  const classGroups = classOptions.length > 0 ? classOptions : [...FALLBACK_CLASS_GROUPS];
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [sundayRows, setSundayRows] = useState<SundayReportRow[]>(() => emptySundayReportRows([]));
  const [otherComments, setOtherComments] = useState('');
  const [weekStart, setWeekStart] = useState(currentWeekStartIso());
  const [addTeacherMode, setAddTeacherMode] = useState<'existing' | 'new'>('existing');
  const [guardianSearch, setGuardianSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [newTeacher, setNewTeacher] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    makeCoordinator: false,
  });
  const [rosterForm, setRosterForm] = useState({
    classGroup: 'AGES_3_5',
    teacherMemberId: members[0]?.memberId ?? '',
    assistantMemberId: '',
    notes: '',
  });

  useEffect(() => {
    const first = members[0]?.memberId;
    if (!first) return;
    setRosterForm((f) => (f.teacherMemberId ? f : { ...f, teacherMemberId: first }));
  }, [members]);

  useEffect(() => {
    const firstCode = classGroups[0]?.value;
    if (!firstCode) return;
    setRosterForm((f) => ({ ...f, classGroup: f.classGroup || firstCode }));
  }, [classGroups]);

  useEffect(() => {
    if (!classOptions.length) return;
    setSundayRows((prev) => {
      if (prev.some((row) => row.boys || row.girls)) return prev;
      return emptySundayReportRows(classOptions);
    });
  }, [classOptions]);

  const { data: childrenData, isLoading: childrenLoading } = useApiQuery<{
    children: PaginatedDto<ChildrenMinistryListItemDto>;
    classGroups: Array<{ value: string; label: string }>;
  }>(
    ['children-ministry-children', unitId, String(page), search],
    `${base}/children/children?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    { enabled: section === 'children' },
  );

  const { data: childDetail, isLoading: detailLoading } = useApiQuery<ChildrenMinistryChildDetailDto>(
    ['children-ministry-child', unitId, selectedChildId ?? ''],
    `${base}/children/children/${selectedChildId ?? ''}`,
    { enabled: section === 'children' && Boolean(selectedChildId) },
  );

  const { data: parentsData, isLoading: parentsLoading } = useApiQuery<{
    parents: PaginatedDto<ChildrenMinistryParentDto>;
  }>(['children-ministry-parents', unitId, String(page)], `${base}/children/parents?page=${page}&limit=20`, {
    enabled: section === 'parents',
  });

  const { data: teachersData, isLoading: teachersLoading } = useApiQuery<{
    weekKey: string;
    teachers: ChildrenMinistryTeacherDto[];
  }>(['children-ministry-teachers', unitId], `${base}/children/teachers`, {
    enabled: section === 'teachers',
  });

  const { data: roster, isLoading: rosterLoading } = useApiQuery<{
    weekKey: string;
    assignments: Array<{
      id: string;
      classGroup: string;
      notes?: string | null;
      teacher: { id: string; firstName: string; lastName: string };
      assistant?: { id: string; firstName: string; lastName: string } | null;
    }>;
    distribution: Array<{ classGroup: string; label: string; assigned: boolean }>;
  }>(
    ['children-roster', unitId, weekStart],
    `${base}/children/roster?weekStart=${weekStart}`,
    { enabled: section === 'teachers' && canManage },
  );

  const { data: guardianSearchResult } = useApiQuery<{
    items: Array<{ id: string; firstName: string; lastName: string; email: string | null }>;
  }>(
    ['children-teacher-guardian-search', unitId, guardianSearch],
    `${base}/children/registration/guardians?search=${encodeURIComponent(guardianSearch)}`,
    { enabled: section === 'teachers' && canManage && addTeacherMode === 'existing' && guardianSearch.trim().length >= 2 },
  );
  const guardianOptions = guardianSearchResult?.items ?? [];

  const { data: birthdaysData, isLoading: birthdaysLoading } = useApiQuery<{
    windowDays: number;
    birthdays: PaginatedDto<ChildrenMinistryBirthdayDto>;
  }>(
    ['children-ministry-birthdays', unitId, String(page)],
    `${base}/children/birthdays?days=60&page=${page}&limit=20`,
    { enabled: section === 'birthdays' },
  );

  const showError = (err: unknown, fallback: string) => {
    toast.error(apiErrorMessage(err as AxiosError, fallback));
  };

  const assignClass = async (childId: string, classGroup: string) => {
    setBusy(true);
    try {
      await api.patch(`${base}/children/enrollments/${childId}`, { classGroup });
      toast.success('Class updated');
      await queryClient.invalidateQueries({ queryKey: ['children-ministry-children', unitId] });
      await queryClient.invalidateQueries({ queryKey: ['children-ministry-child', unitId, childId] });
    } catch (err) {
      showError(err, 'Could not assign class');
    } finally {
      setBusy(false);
    }
  };

  const updateSundayRow = (classGroup: SundayReportRow['classGroup'], field: 'boys' | 'girls', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setSundayRows((rows) =>
      rows.map((row) => (row.classGroup === classGroup ? { ...row, [field]: value } : row)),
    );
  };

  const sendSundayReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const classes = sundayRows.map((row) => ({
      classGroup: row.classGroup as ChildrenClassGroup,
      boys: row.boys === '' ? 0 : Number.parseInt(row.boys, 10),
      girls: row.girls === '' ? 0 : Number.parseInt(row.girls, 10),
    }));

    const hasHeadCount = classes.some((row) => row.boys > 0 || row.girls > 0);
    if (!hasHeadCount && !otherComments.trim()) {
      toast.error('Enter at least one head count or add a comment before sending');
      return;
    }

    const payload: ChildrenSundayReportSubmitDto = {
      serviceDate,
      classes,
      otherComments: otherComments.trim() || undefined,
    };

    setBusy(true);
    try {
      const res = await api.post<ChildrenSundayReportResultDto>(`${base}/children/sunday-report`, payload);
      toast.success(
        `Sunday report sent to Pastor & Church Admin (${res.data.notificationsQueued} notifications, ${res.data.stats.total} children total)`,
      );
      setSundayRows(emptySundayReportRows(classGroups));
      setOtherComments('');
    } catch (err) {
      showError(err, 'Could not send Sunday report');
    } finally {
      setBusy(false);
    }
  };

  const runBirthdayEmails = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ queued: number; children: number }>(`${base}/children/birthdays/run`);
      toast.success(`Queued ${res.data.queued} parent birthday email(s)`);
      await queryClient.invalidateQueries({ queryKey: ['children-ministry-birthdays', unitId] });
    } catch (err) {
      showError(err, 'Could not queue birthday emails');
    } finally {
      setBusy(false);
    }
  };

  const refreshTeachers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['children-ministry-teachers', unitId] }),
      queryClient.invalidateQueries({ queryKey: ['children-roster', unitId] }),
    ]);
  };

  const addTeacherToTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (addTeacherMode === 'existing') {
        if (!selectedMemberId) {
          toast.error('Select a church member');
          return;
        }
        await api.post(`${base}/children/teachers`, {
          memberId: selectedMemberId,
          designation: newTeacher.designation.trim() || undefined,
          makeCoordinator: newTeacher.makeCoordinator,
        });
      } else {
        if (!newTeacher.firstName.trim() || !newTeacher.lastName.trim()) {
          toast.error('First and last name are required');
          return;
        }
        await api.post(`${base}/children/teachers`, {
          firstName: newTeacher.firstName.trim(),
          lastName: newTeacher.lastName.trim(),
          email: newTeacher.email.trim() || undefined,
          phone: newTeacher.phone.trim() || undefined,
          designation: newTeacher.designation.trim() || undefined,
          makeCoordinator: newTeacher.makeCoordinator,
        });
      }
      toast.success('Teacher added to Children\'s Church team');
      setSelectedMemberId('');
      setGuardianSearch('');
      setNewTeacher({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        designation: '',
        makeCoordinator: false,
      });
      await refreshTeachers();
    } catch (err) {
      showError(err, 'Could not add teacher');
    } finally {
      setBusy(false);
    }
  };

  const saveRosterAssignment = async () => {
    if (!rosterForm.teacherMemberId) {
      toast.error('Select a lead teacher');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/children/roster`, {
        weekStart,
        classGroup: rosterForm.classGroup,
        teacherMemberId: rosterForm.teacherMemberId,
        assistantMemberId: rosterForm.assistantMemberId || undefined,
        notes: rosterForm.notes.trim() || undefined,
      });
      toast.success('Weekly duty assignment saved');
      await refreshTeachers();
    } catch (err) {
      showError(err, 'Could not save roster assignment');
    } finally {
      setBusy(false);
    }
  };

  if (section === 'children') {
    const paginated = childrenData?.children;
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search children…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Children with &quot;Children&apos;s Church&quot; interest and age 12 or under
          </p>
        </div>

        {childrenLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Children ({paginated?.total ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(paginated?.items ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChildId(c.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted/50 ${
                      selectedChildId === c.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {c.firstName} {c.lastName}
                      </span>
                      {c.classLabel ? <Badge variant="outline">{c.classLabel}</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.age != null ? `Age ${c.age}` : 'Age unknown'}
                      {c.teacher
                        ? ` · Teacher: ${c.teacher.firstName} ${c.teacher.lastName}`
                        : ''}
                      {c.parentCount ? ` · ${c.parentCount} parent link(s)` : ''}
                    </p>
                  </button>
                ))}
                {!paginated?.items.length ? (
                  <p className="text-sm text-muted-foreground">No registered children yet.</p>
                ) : null}
                <PaginationBar page={paginated?.page ?? 1} totalPages={paginated?.totalPages ?? 1} onPage={setPage} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TreePine className="h-4 w-4" />
                  Connection tree
                </CardTitle>
                <CardDescription>Parents and siblings linked through membership</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedChildId ? (
                  <p className="text-sm text-muted-foreground">Select a child to view family links.</p>
                ) : detailLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : childDetail ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium">
                        {childDetail.child.firstName} {childDetail.child.lastName}
                      </p>
                      <p className="text-muted-foreground">
                        {childDetail.classLabel ?? 'Class not assigned'}
                        {childDetail.teacher
                          ? ` · ${childDetail.teacher.firstName} ${childDetail.teacher.lastName}`
                          : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {classGroups.map((g) => (
                          <Button
                            key={g.value}
                            type="button"
                            size="sm"
                            variant={childDetail.classGroup === g.value ? 'default' : 'outline'}
                            disabled={busy}
                            onClick={() => assignClass(childDetail.child.id, g.value)}
                          >
                            {g.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {childDetail.connectionTree.map((node) => (
                      <div key={node.parent.id} className="rounded-lg border bg-muted/20 p-3">
                        <p className="font-medium">
                          {node.relation}: {node.parent.firstName} {node.parent.lastName}
                        </p>
                        {node.parent.email ? (
                          <p className="text-xs text-muted-foreground">{node.parent.email}</p>
                        ) : null}
                        {node.siblings.length ? (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {node.siblings.map((s) => (
                              <li key={s.id}>
                                Sibling: {s.firstName} {s.lastName} ({s.relation})
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                    {!childDetail.connectionTree.length ? (
                      <p className="text-muted-foreground">No parent links on file.</p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (section === 'parents') {
    const paginated = parentsData?.parents;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Parents & guardians</CardTitle>
          <CardDescription>Linked to registered Children&apos;s Church children</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {parentsLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <>
              {(paginated?.items ?? []).map((p) => (
                <div key={p.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.email ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {p.email}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Children:{' '}
                    {p.children.map((c) => `${c.firstName} ${c.lastName} (${c.relation})`).join(', ')}
                  </p>
                </div>
              ))}
              {!paginated?.items.length ? (
                <p className="text-sm text-muted-foreground">No parent links found.</p>
              ) : null}
              <PaginationBar page={paginated?.page ?? 1} totalPages={paginated?.totalPages ?? 1} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (section === 'teachers') {
    return (
      <div className="space-y-4" data-testid="children-ministry-teachers">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Teachers & coordinators</CardTitle>
            <CardDescription>
              Week {teachersData?.weekKey ?? '—'} duty roster and Children Church admins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {teachersLoading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            ) : (
              (teachersData?.teachers ?? []).map((t) => (
                <div key={t.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {t.firstName} {t.lastName}
                    </span>
                    {t.isChildrenChurchAdmin ? (
                      <Badge>Children Church Admin</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.roles.join(' · ')}
                    {t.classGroups.length ? ` · Classes: ${t.classGroups.join(', ')}` : ''}
                  </p>
                </div>
              ))
            )}
            {!teachersLoading && !teachersData?.teachers.length ? (
              <p className="text-sm text-muted-foreground">No teachers on this week&apos;s roster yet.</p>
            ) : null}
          </CardContent>
        </Card>

        {canManage ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Add teacher
                </CardTitle>
                <CardDescription>
                  Adds the person to this unit and tags them for Children&apos;s Church ministry.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={addTeacherToTeam} data-testid="children-add-teacher-form">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={addTeacherMode === 'existing' ? 'default' : 'outline'}
                      onClick={() => setAddTeacherMode('existing')}
                    >
                      Existing member
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={addTeacherMode === 'new' ? 'default' : 'outline'}
                      onClick={() => setAddTeacherMode('new')}
                    >
                      New person
                    </Button>
                  </div>

                  {addTeacherMode === 'existing' ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Search church members</Label>
                      <Input
                        placeholder="Type name or email (min 2 characters)…"
                        value={guardianSearch}
                        onChange={(e) => setGuardianSearch(e.target.value)}
                      />
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                      >
                        <option value="">Select member…</option>
                        {guardianOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.firstName} {m.lastName}
                            {m.email ? ` · ${m.email}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="First name"
                        value={newTeacher.firstName}
                        onChange={(e) => setNewTeacher({ ...newTeacher, firstName: e.target.value })}
                      />
                      <Input
                        placeholder="Last name"
                        value={newTeacher.lastName}
                        onChange={(e) => setNewTeacher({ ...newTeacher, lastName: e.target.value })}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={newTeacher.email}
                        onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                        className="sm:col-span-2"
                      />
                      <Input
                        placeholder="Phone"
                        value={newTeacher.phone}
                        onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                        className="sm:col-span-2"
                      />
                    </div>
                  )}

                  <Input
                    placeholder="Role label (optional)"
                    value={newTeacher.designation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newTeacher.makeCoordinator}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, makeCoordinator: e.target.checked })
                      }
                    />
                    Children Church Admin (coordinator)
                  </label>
                  <Button type="submit" size="sm" disabled={busy} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add teacher
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Assign weekly duty</CardTitle>
                <CardDescription>Link a teacher to a class for the selected week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Week starting (Mon)</Label>
                  <Input
                    type="date"
                    className="mt-1 max-w-[200px]"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                  />
                </div>

                {roster?.distribution?.length ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {roster.distribution.map((d) => (
                      <div
                        key={d.classGroup}
                        className={`rounded-lg border px-3 py-2 text-sm ${d.assigned ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
                      >
                        <p className="font-medium">{d.label}</p>
                        <Badge variant={d.assigned ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                          {d.assigned ? 'Assigned' : 'Open'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}

                {rosterLoading ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  <ul className="space-y-2">
                    {roster?.assignments?.map((a) => (
                      <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                        <p className="font-medium">
                          {classGroups.find((g) => g.value === a.classGroup)?.label ?? a.classGroup}
                        </p>
                        <p className="text-muted-foreground">
                          Lead: {formatMemberName(a.teacher)}
                          {a.assistant ? ` · Asst: ${formatMemberName(a.assistant)}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add teachers to the unit first, then assign weekly duty.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2" data-testid="children-roster-assign-form">
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={rosterForm.classGroup}
                      onChange={(e) => setRosterForm({ ...rosterForm, classGroup: e.target.value })}
                    >
                      {classGroups.map((g) => (
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
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={saveRosterAssignment}
                      className="sm:col-span-2"
                    >
                      Save weekly assignment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  if (section === 'birthdays') {
    const paginated = birthdaysData?.birthdays;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={runBirthdayEmails}>
            <Cake className="mr-1 h-4 w-4" />
            Send today&apos;s parent emails
          </Button>
          <p className="text-xs text-muted-foreground">
            Uses the same branded celebration template; emails go to parents only.
          </p>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming birthdays</CardTitle>
            <CardDescription>Next {birthdaysData?.windowDays ?? 60} days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {birthdaysLoading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            ) : (
              <>
                {(paginated?.items ?? []).map((b) => (
                  <div key={`${b.childId}-${b.date}`} className="rounded-lg border px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{b.childName}</span>
                      <Badge variant="outline">
                        {b.label}
                        {b.age != null ? ` · turning ${b.age}` : ''}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Parent email:{' '}
                      {b.parents.filter((p) => p.email).map((p) => p.email).join(', ') || 'none on file'}
                    </p>
                  </div>
                ))}
                {!paginated?.items.length ? (
                  <p className="text-sm text-muted-foreground">No upcoming birthdays in this window.</p>
                ) : null}
                <PaginationBar
                  page={paginated?.page ?? 1}
                  totalPages={paginated?.totalPages ?? 1}
                  onPage={setPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const grandTotal = sundayRows.reduce(
    (acc, row) => {
      const boys = row.boys === '' ? 0 : Number.parseInt(row.boys, 10);
      const girls = row.girls === '' ? 0 : Number.parseInt(row.girls, 10);
      return {
        boys: acc.boys + boys,
        girls: acc.girls + girls,
        total: acc.total + boys + girls,
      };
    },
    { boys: 0, girls: 0, total: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sunday report</CardTitle>
        <CardDescription>
          Record boys and girls head count by class. Sends to Pastor and Church Admin by dashboard
          notification and email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={sendSundayReport}>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="serviceDate">Service date</Label>
            <Input
              id="serviceDate"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Class</th>
                  <th className="px-3 py-2 font-medium">Boys</th>
                  <th className="px-3 py-2 font-medium">Girls</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sundayRows.map((row) => {
                  const boys = row.boys === '' ? 0 : Number.parseInt(row.boys, 10);
                  const girls = row.girls === '' ? 0 : Number.parseInt(row.girls, 10);
                  const label = classOptions.find((g) => g.value === row.classGroup)?.label ?? row.classGroup;
                  return (
                    <tr key={row.classGroup} className="border-t">
                      <td className="px-3 py-2 font-medium">{label}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={row.boys}
                          onChange={(e) => updateSundayRow(row.classGroup, 'boys', e.target.value)}
                          className="w-24"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={row.girls}
                          onChange={(e) => updateSundayRow(row.classGroup, 'girls', e.target.value)}
                          className="w-24"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold">{boys + girls}</td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-muted/20 font-medium">
                  <td className="px-3 py-2">Grand total</td>
                  <td className="px-3 py-2">{grandTotal.boys}</td>
                  <td className="px-3 py-2">{grandTotal.girls}</td>
                  <td className="px-3 py-2">{grandTotal.total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherComments">Other comments</Label>
            <Textarea
              id="otherComments"
              value={otherComments}
              onChange={(e) => setOtherComments(e.target.value)}
              placeholder="Notes for Pastor and Church Admin (optional)"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Now
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

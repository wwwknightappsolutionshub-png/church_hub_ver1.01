'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Cake,
  ClipboardList,
  Clock,
  Heart,
  LayoutDashboard,
  Loader2,
  Inbox,
  MessageSquare,
  Mic2,
  Music,
  Package,
  Plus,
  Send,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import type { AxiosError } from 'axios';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase, DEPT_MODULE_LABELS } from '@/lib/dept-module-catalog';
import { formatMemberName } from '@/lib/service-unit-utils';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import type { ServiceUnitAccessFlags } from '@/components/departments/DepartmentToolsRouter';
import { DepartmentDashboardPanel } from '@/components/service-units/DepartmentDashboardPanel';
import { UsheringWeeklyHeadcountForm } from '@/components/departments/UsheringWeeklyHeadcountForm';
import { ChildrenTeachersPanel, type ChildrenSection } from '@/components/departments/ChildrenTeachersPanel';
import { ChildrenMinistryPanel,
  type ChildrenMinistrySection,
} from '@/components/departments/ChildrenMinistryPanel';
import { ChildrenAddChildSection } from '@/components/departments/ChildrenAddChildSection';
import { ChildrenClassesSettingsPanel } from '@/components/departments/ChildrenClassesSettingsPanel';
import { ChoirTeamPanel, type ChoirSection } from '@/components/departments/ChoirTeamPanel';
import { PrayerSquadPanel, type PrayerSection } from '@/components/departments/PrayerSquadPanel';
import { DepartmentLayout } from '@/components/departments/DepartmentLayout';
import {
  buildDepartmentNavGroups,
  flattenDepartmentNavGroups,
} from '@/components/departments/department-nav';
import { MedicalIncidentPanel } from '@/components/departments/MedicalIncidentPanel';
import { DepartmentFeedbacksSection } from '@/components/departments/DepartmentFeedbacksSection';
import { DepartmentReportsSection } from '@/components/departments/DepartmentReportsSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type DeptTab =
  | 'dashboard'
  | 'attendance'
  | 'schedules'
  | 'assignments'
  | 'inventory'
  | 'resources'
  | 'tasks'
  | 'special'
  | 'reports'
  | 'feedbacks'
  | 'messages'
  | 'choir-roster'
  | 'choir-library'
  | 'choir-planning'
  | 'choir-attendance'
  | 'choir-talent'
  | 'prayer-assignments'
  | 'prayer-schedule'
  | 'prayer-intake'
  | 'prayer-progress'
  | 'prayer-scripture'
  | 'children-roster'
  | 'children-curriculum'
  | 'children-reports'
  | 'children-checkin'
  | 'children-list'
  | 'children-parents'
  | 'children-teachers'
  | 'children-birthdays'
  | 'children-sunday-report'
  | 'children-classes';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
}

interface DepartmentModulePanelProps {
  unitId: string;
  departmentCode: string;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
  unitAccess?: ServiceUnitAccessFlags;
}

interface DeptContext {
  unit: { id: string; name: string; departmentCode: string; departmentLabel: string };
  access: {
    canManage: boolean;
    canLead?: boolean;
    canParticipate: boolean;
    canSubmit: boolean;
    canDelete: boolean;
    canViewFeedbacks?: boolean;
    canReplyFeedback?: boolean;
    canAccessChildrenMinistry?: boolean;
    canRegisterChildren?: boolean;
    canManageChildrenClasses?: boolean;
    isChildrenChurchAdmin?: boolean;
  };
  ui?: {
    enabledTabs?: string[];
  };
}

interface DeptDashboard {
  stats: Record<string, number>;
  upcoming: Array<{ id: string; title: string; startsAt: string; type: string }>;
}

function canViewLeadershipHub(
  unitId: string,
  ctxAccess: DeptContext['access'] | undefined,
  unitAccess: ServiceUnitAccessFlags | undefined,
  unitAdminUnitIds: string[],
  unitLeaderUnitIds: string[],
): boolean {
  return Boolean(
    ctxAccess?.canViewFeedbacks ||
      unitAccess?.canViewFeedbacks ||
      unitAdminUnitIds.includes(unitId) ||
      unitLeaderUnitIds.includes(unitId),
  );
}

function choirSectionFromTab(tab: DeptTab): ChoirSection | null {
  switch (tab) {
    case 'choir-roster':
      return 'roster';
    case 'choir-library':
      return 'library';
    case 'choir-planning':
      return 'planning';
    case 'choir-attendance':
      return 'attendance';
    case 'choir-talent':
      return 'talent';
    default:
      return null;
  }
}

function prayerSectionFromTab(tab: DeptTab): PrayerSection | null {
  switch (tab) {
    case 'prayer-assignments':
      return 'assignments';
    case 'prayer-schedule':
      return 'schedule';
    case 'prayer-intake':
      return 'intake';
    case 'prayer-progress':
      return 'progress';
    case 'prayer-scripture':
      return 'scripture';
    default:
      return null;
  }
}

function childrenSectionFromTab(tab: DeptTab): ChildrenSection | null {
  switch (tab) {
    case 'children-roster':
      return 'roster';
    case 'children-curriculum':
      return 'curriculum';
    case 'children-reports':
      return 'reports';
    case 'children-checkin':
      return 'checkin';
    default:
      return null;
  }
}

function childrenMinistrySectionFromTab(tab: DeptTab): ChildrenMinistrySection | null {
  switch (tab) {
    case 'children-list':
      return 'children';
    case 'children-parents':
      return 'parents';
    case 'children-teachers':
      return 'teachers';
    case 'children-birthdays':
      return 'birthdays';
    case 'children-sunday-report':
      return 'sunday-report';
    default:
      return null;
  }
}

export function DepartmentModulePanel({
  unitId,
  departmentCode,
  canManage,
  members,
  unitAccess,
}: DepartmentModulePanelProps) {
  const queryClient = useQueryClient();
  const {
    memberId,
    unitAdminUnitIds,
    unitLeaderUnitIds,
    unitMembershipIds,
    isChurchStaff,
  } = useModuleAccess();
  const label = DEPT_MODULE_LABELS[departmentCode] ?? 'Department';
  const [tab, setTab] = useState<DeptTab>('dashboard');
  const [busy, setBusy] = useState(false);

  const apiBase = deptToolsApiBase(unitId);

  const {
    data: ctx,
    isError: ctxError,
    error: ctxErr,
    refetch: refetchCtx,
  } = useApiQuery<DeptContext>(
    ['dept-context', unitId, memberId ?? 'guest'],
    `${apiBase}/context`,
  );
  const { data: dash, isLoading, isError: dashError, refetch: refetchDash } = useApiQuery<DeptDashboard>(
    ['dept-dashboard', unitId],
    `${apiBase}/dashboard`,
  );

  const defaultStats = useMemo(
    () => ({
      memberCount: members.length,
      attendanceSessions4wk: 0,
      upcomingSchedules: 0,
      openAssignments: 0,
      lowInventory: 0,
      openPrayer: 0,
      openTasks: 0,
      recentIncidents: 0,
      activeCheckIns: 0,
    }),
    [members.length],
  );

  const displayDash = useMemo((): DeptDashboard => {
    if (dash) return dash;
    return { stats: defaultStats, upcoming: [] };
  }, [dash, defaultStats]);

  const canEdit = ctx?.access?.canManage ?? canManage;
  const canLead = ctx?.access?.canLead ?? canEdit;
  const canSubmit = ctx?.access?.canSubmit ?? canManage;
  const canViewFeedbacks = canViewLeadershipHub(
    unitId,
    ctx?.access,
    unitAccess,
    unitAdminUnitIds,
    unitLeaderUnitIds,
  );
  const canReplyFeedback = ctx?.access?.canReplyFeedback ?? canViewFeedbacks;
  const canAccessChildrenMinistry =
    departmentCode !== 'CHILDREN' || (ctx?.access?.canAccessChildrenMinistry ?? false);
  const canRegisterChildren =
    departmentCode === 'CHILDREN' &&
    (ctx?.access?.canRegisterChildren ??
      ctx?.access?.canAccessChildrenMinistry ??
      ctx?.access?.canParticipate ??
      unitMembershipIds.includes(unitId) ??
      isChurchStaff);
  const canManageChildrenClasses =
    departmentCode === 'CHILDREN' &&
    ((ctx?.access?.canManageChildrenClasses ??
      ctx?.access?.canAccessChildrenMinistry ??
      isChurchStaff) ||
      canManage);

  const navGroups = useMemo(() => {
    const baseGroups = buildDepartmentNavGroups(departmentCode);
    const enabled = new Set(
      ctx?.ui?.enabledTabs ?? flattenDepartmentNavGroups(baseGroups).map((t) => t.id),
    );
    if (canViewFeedbacks) {
      enabled.add('reports');
      enabled.add('feedbacks');
    }
    if (canManageChildrenClasses) {
      enabled.add('children-classes');
    }

    return baseGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((t) => {
          if ((t.id === 'feedbacks' || t.id === 'reports') && !canViewFeedbacks) return false;
          if (t.id === 'children-classes' && !canManageChildrenClasses) return false;
          return enabled.has(t.id);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [departmentCode, ctx?.ui?.enabledTabs, canViewFeedbacks, canManageChildrenClasses]);

  const tabs = useMemo(() => flattenDepartmentNavGroups(navGroups), [navGroups]);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((t) => t.id === tab)) {
      setTab(tabs[0].id as DeptTab);
    }
  }, [tabs, tab]);

  const accessLabel = canEdit
    ? 'Church / unit admin'
    : canLead
      ? 'Department leader'
      : canSubmit
        ? 'Member'
        : 'View only';

  const choirSection = choirSectionFromTab(tab);
  const prayerSection = prayerSectionFromTab(tab);
  const childrenSection = childrenSectionFromTab(tab);
  const childrenMinistrySection = childrenMinistrySectionFromTab(tab);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dept-dashboard', unitId] });
    queryClient.invalidateQueries({ queryKey: ['dept-context', unitId] });
    queryClient.invalidateQueries({ queryKey: ['children-ministry-children', unitId] });
  };

  const toolsError =
    ctxError || dashError
      ? deptToolsErrorMessage((ctxErr ?? null) as AxiosError | null)
      : null;

  return (
    <div className="space-y-4">
      {toolsError && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>{toolsError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCtx();
                refetchDash();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {departmentCode === 'CHILDREN' && ctx && !canAccessChildrenMinistry && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4 text-sm">
            Children&apos;s Church leadership tools are limited to Church Admin, Pastor, and
            Children Church Admin roles.
          </CardContent>
        </Card>
      )}

      <DepartmentLayout
        title={ctx?.unit?.name ?? label}
        subtitle={ctx?.unit?.departmentLabel ?? `${label} workspace`}
        departmentCode={departmentCode}
        accessLabel={accessLabel}
        navGroups={navGroups}
        activeTab={tab}
        onTabChange={(id) => setTab(id as DeptTab)}
      >
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Department overview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Key metrics and upcoming activity for {ctx?.unit?.departmentLabel ?? label}.
            </p>
          </div>
          {canRegisterChildren ? (
            <ChildrenAddChildSection unitId={unitId} onRegistered={invalidate} />
          ) : null}
          <DeptStatCards dash={displayDash} isLoading={isLoading} label={label} />
          {displayDash?.upcoming?.length ? (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Upcoming</CardTitle>
                <CardDescription>Schedules and events on the horizon</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/60">
                {displayDash.upcoming.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant="outline">{new Date(s.startsAt).toLocaleDateString()}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-4">
          {departmentCode === 'USHERING' ? (
            <UsheringWeeklyHeadcountForm unitId={unitId} canManage={canEdit} onSaved={invalidate} />
          ) : null}
          <DeptStatCards dash={displayDash} isLoading={isLoading} label={label} />
          <DepartmentDashboardPanel
            unitId={unitId}
            canManage={canEdit}
            canRecordAttendance={canSubmit}
            members={members}
            showSummaryCards={false}
          />
        </div>
      )}

      {tab === 'schedules' && (
        <SchedulesSection
          unitId={unitId}
          canEdit={canEdit || canLead}
          onChange={invalidate}
          busy={busy}
          setBusy={setBusy}
        />
      )}

      {tab === 'assignments' && (
        <AssignmentsSection
          unitId={unitId}
          canEdit={canSubmit}
          members={members}
          departmentCode={departmentCode}
          onChange={invalidate}
        />
      )}

      {tab === 'inventory' && (departmentCode === 'MEDICAL' || departmentCode === 'MEDIA') && (
        <InventorySection unitId={unitId} canEdit={canSubmit} onChange={invalidate} />
      )}

      {tab === 'resources' && (
        <ResourcesSection unitId={unitId} canEdit={canSubmit} departmentCode={departmentCode} />
      )}

      {tab === 'tasks' && departmentCode === 'MEDIA' && (
        <TasksSection unitId={unitId} canEdit={canSubmit} members={members} />
      )}

      {tab === 'special' && (
        <SpecialSection
          unitId={unitId}
          departmentCode={departmentCode}
          canEdit={canSubmit}
          canLead={canLead}
          canManage={canEdit}
          members={members}
        />
      )}

      {tab === 'reports' && canViewFeedbacks && (
        <DepartmentReportsSection
          unitId={unitId}
          canEdit={canViewFeedbacks}
          onSubmitted={invalidate}
        />
      )}

      {tab === 'feedbacks' && canViewFeedbacks && (
        <DepartmentFeedbacksSection unitId={unitId} canReply={canReplyFeedback} />
      )}

      {tab === 'messages' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Unit discussion
            </CardTitle>
            <CardDescription>Use the Forum tab for group posts and replies.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/dashboard/service-units/${unitId}?tab=forum`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Open forum
            </Link>
          </CardContent>
        </Card>
      )}

      {choirSection && (
        <ChoirTeamPanel
          unitId={unitId}
          section={choirSection}
          canEdit={canSubmit}
          canLead={canLead}
          canManage={canEdit}
          members={members}
        />
      )}

      {prayerSection && (
        <PrayerSquadPanel
          unitId={unitId}
          section={prayerSection}
          canEdit={canSubmit}
          canLead={canLead}
          canManage={canEdit}
          members={members}
        />
      )}

      {childrenMinistrySection &&
        (canAccessChildrenMinistry ||
          (canRegisterChildren && childrenMinistrySection === 'sunday-report')) && (
        <ChildrenMinistryPanel
          unitId={unitId}
          section={childrenMinistrySection}
          canManage={canAccessChildrenMinistry}
          members={members}
        />
      )}

      {childrenSection && canAccessChildrenMinistry && (
        <ChildrenTeachersPanel
          unitId={unitId}
          section={childrenSection}
          canEdit={canEdit || canLead}
          canManage={canEdit}
          members={members}
        />
      )}

      {tab === 'children-classes' && canManageChildrenClasses ? (
        <ChildrenClassesSettingsPanel unitId={unitId} />
      ) : null}
      </DepartmentLayout>
    </div>
  );
}

const STAT_LABELS: Record<string, string> = {
  memberCount: 'Members',
  attendanceSessions4wk: 'Roll marks (4 wk)',
  upcomingSchedules: 'Upcoming schedules',
  openAssignments: 'Open assignments',
  lowInventory: 'Low stock items',
  openPrayer: 'Open prayer requests',
  openTasks: 'Open tasks',
  recentIncidents: 'Open incidents',
  activeCheckIns: 'Checked in now',
};

function DeptStatCards({
  dash,
  isLoading,
  label,
}: {
  dash?: DeptDashboard;
  isLoading: boolean;
  label: string;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const entries = Object.entries(dash?.stats ?? {});
  if (entries.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/10">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Stats for {label} will appear here as you record attendance, schedules, and reports.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {entries.map(([key, val]) => (
        <Card key={key} className="border-border/60 bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {STAT_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{val}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function deptToolsErrorMessage(err: AxiosError | null): string {
  const status = err?.response?.status;
  const apiMessage =
    typeof err?.response?.data === 'object' &&
    err.response.data !== null &&
    'message' in err.response.data &&
    typeof (err.response.data as { message: unknown }).message === 'string'
      ? (err.response.data as { message: string }).message
      : null;

  if (status === 404 && apiMessage) return apiMessage;
  if (status === 404) {
    return 'Department tools API not found. Restart the API after pulling the latest code, then run: npx prisma migrate deploy';
  }
  if (status === 403) return 'You need access to this service unit to use department tools.';
  if (!err?.response) return 'Cannot reach the API. Ensure the Church API is running on port 4000.';
  if (status && status >= 500) {
    return 'Server error loading department tools. Run database migrations and restart the API.';
  }
  return apiMessage ?? 'Could not load department tools.';
}

function specialTabLabel(code: string) {
  switch (code) {
    case 'MEDICAL':
      return 'Incidents';
    default:
      return 'Tools';
  }
}

function SchedulesSection({
  unitId,
  canEdit,
  onChange,
  busy,
  setBusy,
}: {
  unitId: string;
  canEdit: boolean;
  onChange: () => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
}) {
  const { data: items = [], isLoading, isError } = useApiQuery<
    Array<{ id: string; title: string; startsAt: string; type: string }>
  >(['dept-schedules', unitId], `${deptToolsApiBase(unitId)}/schedules`);
  const [form, setForm] = useState({ title: '', startsAt: '', type: 'SERVICE_DUTY' });

  const add = async () => {
    if (!form.title?.trim() || !form.startsAt) {
      toast.error('Title and start time are required');
      return;
    }
    const startsAt = new Date(form.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      toast.error('Invalid start time');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${deptToolsApiBase(unitId)}/schedules`, {
        title: form.title.trim(),
        type: form.type,
        startsAt: startsAt.toISOString(),
      });
      toast.success('Scheduled');
      setForm({ title: '', startsAt: '', type: 'SERVICE_DUTY' });
      onChange();
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not save schedule'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardContent className="grid gap-2 pt-4 sm:grid-cols-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <Button onClick={add} disabled={busy} className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </CardContent>
        </Card>
      )}
      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Schedules unavailable — check API connection above.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No schedules yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
              <span className="font-medium">{s.title}</span>
              <span className="ml-2 text-muted-foreground">{new Date(s.startsAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignmentsSection({
  unitId,
  canEdit,
  members,
  departmentCode,
  onChange,
}: {
  unitId: string;
  canEdit: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
  departmentCode: string;
  onChange: () => void;
}) {
  const { data: items = [] } = useApiQuery<
    Array<{ id: string; title: string; role?: string; member?: MemberRef }>
  >(['dept-assignments', unitId], `${deptToolsApiBase(unitId)}/assignments`);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState(
    departmentCode === 'CHOIR' ? 'Soprano' : departmentCode === 'MEDIA' ? 'Camera' : '',
  );

  const add = async () => {
    if (!title?.trim()) {
      toast.error('Enter a task or role title');
      return;
    }
    try {
      await api.post(`${deptToolsApiBase(unitId)}/assignments`, { title: title.trim(), role: role.trim() || undefined });
      toast.success('Assignment added');
      setTitle('');
      onChange();
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not add assignment'));
    }
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Task / role title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Role (e.g. Alto, Sound)" value={role} onChange={(e) => setRole(e.target.value)} />
          <Button onClick={add} size="sm">
            Add
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span>
              {a.title}
              {a.role ? ` · ${a.role}` : ''}
            </span>
            {a.member ? (
              <span className="text-muted-foreground">{formatMemberName(a.member)}</span>
            ) : (
              <Badge variant="outline">Open</Badge>
            )}
          </li>
        ))}
      </ul>
      {departmentCode === 'PRAYER' && members.length > 0 && (
        <p className="text-xs text-muted-foreground">Use the Assignment board tab for intercessor assignments.</p>
      )}
    </div>
  );
}

function InventorySection({
  unitId,
  canEdit,
  onChange,
}: {
  unitId: string;
  canEdit: boolean;
  onChange: () => void;
}) {
  const { data: items = [] } = useApiQuery<
    Array<{ id: string; name: string; quantity: number; minQuantity?: number }>
  >(['dept-inventory', unitId], `${deptToolsApiBase(unitId)}/inventory`);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('0');

  const add = async () => {
    if (!name?.trim()) {
      toast.error('Enter an item name');
      return;
    }
    try {
      await api.post(`${deptToolsApiBase(unitId)}/inventory`, { name: name.trim(), quantity: Number(qty) || 0 });
      toast.success('Item saved');
      setName('');
      onChange();
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not save item'));
    }
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex gap-2">
          <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Input type="number" className="w-20" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button size="sm" onClick={add}>
            <Package className="h-4 w-4" />
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className={cn(
              'flex justify-between rounded-lg border px-3 py-2 text-sm',
              i.minQuantity != null && i.quantity <= i.minQuantity && 'border-amber-500/50 bg-amber-500/5',
            )}
          >
            <span>{i.name}</span>
            <span className="font-medium">×{i.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResourcesSection({
  unitId,
  canEdit,
  departmentCode,
}: {
  unitId: string;
  canEdit: boolean;
  departmentCode: string;
}) {
  const category =
    departmentCode === 'CHILDREN'
      ? 'LESSON_PLAN'
      : departmentCode === 'PRAYER'
        ? 'PRAYER_POINT'
        : departmentCode === 'CHOIR'
          ? 'SONG_SCORE'
          : 'MEDIA_ASSET';
  const { data: items = [] } = useApiQuery<Array<{ id: string; title: string; category: string }>>(
    ['dept-resources', unitId, category],
    `${deptToolsApiBase(unitId)}/resources?category=${category}`,
  );
  const [title, setTitle] = useState('');

  const add = async () => {
    if (!title?.trim()) {
      toast.error('Enter a resource title');
      return;
    }
    try {
      await api.post(`${deptToolsApiBase(unitId)}/resources`, { category, title: title.trim() });
      toast.success('Resource added');
      setTitle('');
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not add resource'));
    }
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex gap-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={add}>
            <BookOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border px-3 py-2 text-sm">
            {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TasksSection({
  unitId,
  canEdit,
}: {
  unitId: string;
  canEdit: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  const { data: items = [] } = useApiQuery<
    Array<{ id: string; title: string; status: string; column: string }>
  >(['dept-tasks', unitId], `${deptToolsApiBase(unitId)}/tasks`);
  const [title, setTitle] = useState('');

  const add = async () => {
    if (!title.trim()) {
      toast.error('Enter a project task');
      return;
    }
    try {
      await api.post(`${deptToolsApiBase(unitId)}/tasks`, { title: title.trim(), column: 'backlog' });
      toast.success('Task added');
      setTitle('');
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not add task'));
    }
  };

  const columns = ['backlog', 'in_progress', 'done'] as const;
  const byCol = (col: string) => items.filter((t) => t.column === col || (col === 'in_progress' && t.column === 'in_progress'));

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex gap-2">
          <Input placeholder="Project task" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={add}>
            Add
          </Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {columns.map((col) => (
          <div key={col} className="rounded-lg border bg-muted/30 p-2">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{col.replace('_', ' ')}</p>
            {byCol(col).map((t) => (
              <div key={t.id} className="mb-2 rounded bg-background px-2 py-1.5 text-sm shadow-sm">
                {t.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecialSection({
  unitId,
  departmentCode,
  canEdit,
  canLead,
  canManage,
  members,
}: {
  unitId: string;
  departmentCode: string;
  canEdit: boolean;
  canLead: boolean;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  if (departmentCode === 'MEDICAL') {
    return (
      <MedicalIncidentPanel
        unitId={unitId}
        canEdit={canEdit}
        canManage={canManage}
        members={members}
      />
    );
  }
  if (departmentCode === 'MEDIA') {
    return <MediaSkills unitId={unitId} canEdit={canEdit} members={members} />;
  }
  return null;
}

function MediaSkills({
  unitId,
  canEdit,
  members,
}: {
  unitId: string;
  canEdit: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  const { data: skills = [] } = useApiQuery<
    Array<{ id: string; skill: string; member: MemberRef }>
  >(['dept-skills', unitId], `${deptToolsApiBase(unitId)}/skills`);

  const seed = async () => {
    const m = members[0];
    if (!m) return;
    try {
      await api.post(`${deptToolsApiBase(unitId)}/skills`, {
        memberId: m.memberId,
        skill: 'Camera',
        level: 'Intermediate',
      });
      toast.success('Skill registered');
    } catch {
      toast.error('Could not add skill');
    }
  };

  return (
    <div className="space-y-2">
      {canEdit && (
        <Button size="sm" variant="outline" onClick={seed}>
          Register sample skill
        </Button>
      )}
      <ul className="space-y-1 text-sm">
        {skills.map((s) => (
          <li key={s.id}>
            {formatMemberName(s.member)} — {s.skill}
          </li>
        ))}
      </ul>
    </div>
  );
}

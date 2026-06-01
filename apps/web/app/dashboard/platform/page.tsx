'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Building2,
  ChevronRight,
  Loader2,
  Mail,
  BarChart3,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CHURCH_TENANT_MODULE_IDS,
  CHURCH_TENANT_MODULE_LABELS,
  defaultTenantModules,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProvisionedStaff {
  email: string;
  role: 'ADMIN' | 'PASTOR';
  welcomeEmailSent: boolean;
  userId: string;
}

interface ChurchRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
  userCount: number;
  memberCount: number;
  pastorCount: number;
  adminCount: number;
  tenantModules: ChurchTenantModulesMap;
  departmentModuleSettings?: {
    enabledModules?: Record<string, boolean>;
    tabs?: Record<string, Record<string, boolean>>;
  };
  provisionedStaff?: {
    admin?: ProvisionedStaff;
    pastor?: ProvisionedStaff;
  };
}

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: { name: string; description: string | null }[];
}

interface ChurchDetail {
  church: ChurchRow & { address?: string | null; timezone?: string };
  pastors: StaffUser[];
  admins: StaffUser[];
  allStaff: StaffUser[];
}

const DEPT_MODULE_CODES = [
  'MEDICAL',
  'MEDIA',
  'CHILDREN',
  'CHOIR',
  'PRAYER',
  'USHERING',
  'EVANGELISM',
  'YOUTH',
  'TEENS',
  'PROTOCOL',
] as const;

const DEPT_MODULE_LABELS: Record<(typeof DEPT_MODULE_CODES)[number], string> = {
  MEDICAL: 'Medical',
  MEDIA: 'Media',
  CHILDREN: "Children's Church Teachers",
  CHOIR: 'Choir',
  PRAYER: 'Prayer Squad',
  USHERING: 'Ushering',
  EVANGELISM: 'Harvesters Squad',
  YOUTH: 'Youth Ministry',
  TEENS: "Teens' Church",
  PROTOCOL: 'Protocol',
};

const DEPT_TABS: Record<(typeof DEPT_MODULE_CODES)[number], string[]> = {
  MEDICAL: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'inventory', 'resources', 'messages', 'special'],
  MEDIA: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'inventory', 'resources', 'tasks', 'messages', 'special'],
  CHILDREN: ['dashboard', 'children-roster', 'children-curriculum', 'children-reports', 'children-checkin', 'reports', 'resources', 'messages'],
  CHOIR: ['dashboard', 'choir-roster', 'choir-library', 'choir-planning', 'choir-attendance', 'choir-talent', 'reports', 'feedbacks', 'resources', 'messages'],
  PRAYER: ['dashboard', 'prayer-assignments', 'prayer-schedule', 'prayer-intake', 'prayer-progress', 'prayer-scripture', 'reports', 'resources', 'messages'],
  USHERING: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'resources', 'messages'],
  EVANGELISM: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'resources', 'messages'],
  YOUTH: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'resources', 'messages'],
  TEENS: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'resources', 'messages'],
  PROTOCOL: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'resources', 'messages'],
};

const MODULE_GROUPS: { title: string; ids: (typeof CHURCH_TENANT_MODULE_IDS)[number][] }[] = [
  {
    title: 'Community modules',
    ids: [
      'lounge',
      'prayerHub',
      'testimonyHub',
      'devotionalHub',
      'wisdom365Plus',
      'outreach',
      'youthHub',
      'kingdomKonnect',
      'spirify',
      'sermonNote',
      'followUp',
      'ministryCells',
      'serviceUnitHub',
      'myProfile',
      'settings',
    ],
  },
  {
    title: 'Leadership modules',
    ids: [
      'staffOverview',
      'churchLanding',
      'communitySupport',
      'mentors',
      'membership',
      'churchStaff',
      'busMinistry',
      'communicationsHub',
    ],
  },
];

export default function PlatformConsolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPlatformAdmin, userRoles, isLoading: accessLoading } = useModuleAccess();
  const canAccess = isPlatformAdmin || userRoles.includes('PLATFORM_ADMIN');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    city: '',
    country: '',
    adminEmail: '',
    pastorEmail: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    city: '',
    country: '',
    isActive: true,
  });
  const [moduleDraft, setModuleDraft] = useState<ChurchTenantModulesMap>(defaultTenantModules());
  const [deptDraft, setDeptDraft] = useState<{
    enabledModules: Record<string, boolean>;
    tabs: Record<string, Record<string, boolean>>;
  }>({ enabledModules: {}, tabs: {} });

  useEffect(() => {
    if (!accessLoading && !canAccess) {
      router.replace('/dashboard');
    }
  }, [accessLoading, canAccess, router]);

  const { data: churches, isLoading } = useApiQuery<ChurchRow[]>(
    ['platform-churches'],
    '/platform/churches',
    { enabled: canAccess },
  );

  const { data: detail, isLoading: detailLoading } = useApiQuery<ChurchDetail>(
    ['platform-church', selectedId ?? ''],
    `/platform/churches/${selectedId}`,
    { enabled: !!selectedId && canAccess },
  );

  useEffect(() => {
    if (!detail?.church) return;
    setEditForm({
      name: detail.church.name,
      slug: detail.church.slug,
      city: detail.church.city ?? '',
      country: detail.church.country ?? '',
      isActive: detail.church.isActive,
    });
    setModuleDraft(detail.church.tenantModules ?? defaultTenantModules());
    setDeptDraft({
      enabledModules: { ...(detail.church.departmentModuleSettings?.enabledModules ?? {}) },
      tabs: { ...(detail.church.departmentModuleSettings?.tabs ?? {}) },
    });
  }, [detail?.church]);

  const selectedRow = useMemo(
    () => churches?.find((c) => c.id === selectedId),
    [churches, selectedId],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-churches'] });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['platform-church', selectedId] });
    }
  };

  const createChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.slug.trim() || !createForm.adminEmail.trim()) {
      toast.error('Church name, slug, and admin email are required');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<ChurchRow>('/platform/churches', {
        name: createForm.name.trim(),
        slug: createForm.slug.trim().toLowerCase(),
        adminEmail: createForm.adminEmail.trim(),
        pastorEmail: createForm.pastorEmail.trim() || undefined,
        city: createForm.city.trim() || undefined,
        country: createForm.country.trim() || undefined,
      });
      const parts: string[] = ['Tenant created'];
      if (data.provisionedStaff?.admin) {
        parts.push(
          data.provisionedStaff.admin.welcomeEmailSent
            ? `Admin welcome email sent to ${data.provisionedStaff.admin.email}`
            : `Admin account created (${data.provisionedStaff.admin.email}) — check email logs`,
        );
      }
      if (data.provisionedStaff?.pastor) {
        parts.push(
          data.provisionedStaff.pastor.welcomeEmailSent
            ? `Pastor welcome email sent to ${data.provisionedStaff.pastor.email}`
            : `Pastor account created (${data.provisionedStaff.pastor.email}) — check email logs`,
        );
      }
      toast.success(parts.join('. '));
      setShowCreate(false);
      setCreateForm({
        name: '',
        slug: '',
        city: '',
        country: '',
        adminEmail: '',
        pastorEmail: '',
      });
      setSelectedId(data.id);
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create tenant'));
    } finally {
      setBusy(false);
    }
  };

  const saveChurch = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.patch(`/platform/churches/${selectedId}`, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim().toLowerCase(),
        city: editForm.city.trim() || null,
        country: editForm.country.trim() || null,
        isActive: editForm.isActive,
        tenantModules: moduleDraft,
        departmentModuleSettings: deptDraft,
      });
      toast.success('Tenant saved');
      refresh();
    } catch {
      toast.error('Could not save tenant');
    } finally {
      setBusy(false);
    }
  };

  const removeChurch = async () => {
    if (!selectedId || !selectedRow) return;
    if (!window.confirm(`Remove or deactivate "${selectedRow.name}"?`)) return;
    setBusy(true);
    try {
      await api.delete(`/platform/churches/${selectedId}`);
      toast.success('Tenant removed or deactivated');
      setSelectedId(null);
      refresh();
    } catch {
      toast.error('Could not remove tenant');
    } finally {
      setBusy(false);
    }
  };

  if (accessLoading || !canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardModuleShell
      eyebrow="Platform"
      title="SaaS owner console"
      description="Multi-tenant administration—provision churches, govern module entitlements, and manage tenant lifecycle globally."
      badge={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold" className="gap-1">
            <Building2 className="h-3 w-3" />
            {churches?.length ?? 0} tenants
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/35 bg-primary/5 font-semibold text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/dashboard/platform/analytics">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Analytics
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/35 bg-primary/5 font-semibold text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/dashboard/platform/wisdom365">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Wisdom365+
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/35 bg-primary/5 font-semibold text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/dashboard/platform/marketing">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Marketing
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">All tenants</CardTitle>
            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showCreate && (
              <form onSubmit={createChurch} className="space-y-2 rounded-lg border border-dashed p-3">
                <Input
                  placeholder="Church name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="slug (e.g. demo-church)"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Admin email *"
                  value={createForm.adminEmail}
                  onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Pastor email (optional)"
                  value={createForm.pastorEmail}
                  onChange={(e) => setCreateForm({ ...createForm, pastorEmail: e.target.value })}
                />
                <Input
                  placeholder="City (optional)"
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                />
                <Input
                  placeholder="Country (optional)"
                  value={createForm.country}
                  onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Welcome emails include a temporary password and a guide to every enabled module.
                  Recipients must change their password on first sign-in.
                </p>
                <Button type="submit" size="sm" className="w-full" disabled={busy}>
                  Create tenant & send welcomes
                </Button>
              </form>
            )}
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {churches?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  selectedId === c.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:bg-muted/50',
                  !c.isActive && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.slug}
                    {!c.isActive ? ' · inactive' : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {c.pastorCount} pastors
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {c.adminCount} admins
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {!isLoading && churches?.length === 0 && (
              <p className="text-sm text-muted-foreground">No churches registered yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {detail?.church.name ?? selectedRow?.name ?? 'Select a tenant'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedId && (
                <p className="text-sm text-muted-foreground">
                  Choose a church to edit details, staff roster, and enabled modules.
                </p>
              )}
              {selectedId && detailLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {selectedId && detail && !detailLoading && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <Input
                      placeholder="Slug"
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    />
                    <Input
                      placeholder="City"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    />
                    <Input
                      placeholder="Country"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    />
                    Tenant active (members can sign in)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveChurch} disabled={busy}>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save tenant
                    </Button>
                    <Button variant="destructive" onClick={removeChurch} disabled={busy}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Remove / deactivate
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedId && detail && !detailLoading && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enabled modules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {MODULE_GROUPS.map((group) => (
                    <div key={group.title}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.title}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.ids.map((id) => (
                          <label
                            key={id}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={moduleDraft[id] !== false}
                              onChange={(e) =>
                                setModuleDraft({ ...moduleDraft, [id]: e.target.checked })
                              }
                            />
                            {CHURCH_TENANT_MODULE_LABELS[id]}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button onClick={saveChurch} disabled={busy}>
                    Save module access
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Department module controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Super admin can activate/deactivate department modules and individual tabs per tenant.
                  </p>
                  {DEPT_MODULE_CODES.map((code) => {
                    const enabled = deptDraft.enabledModules[code] !== false;
                    const tabs = DEPT_TABS[code];
                    return (
                      <div key={code} className="rounded-lg border p-3">
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              setDeptDraft((prev) => ({
                                ...prev,
                                enabledModules: { ...prev.enabledModules, [code]: e.target.checked },
                              }))
                            }
                          />
                          {DEPT_MODULE_LABELS[code]}
                        </label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {tabs.map((tabId) => (
                            <label key={`${code}-${tabId}`} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={(deptDraft.tabs[code]?.[tabId] ?? true) && enabled}
                                disabled={!enabled}
                                onChange={(e) =>
                                  setDeptDraft((prev) => ({
                                    ...prev,
                                    tabs: {
                                      ...prev.tabs,
                                      [code]: {
                                        ...(prev.tabs[code] ?? {}),
                                        [tabId]: e.target.checked,
                                      },
                                    },
                                  }))
                                }
                              />
                              {tabId}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <Button onClick={saveChurch} disabled={busy}>
                    Save department module controls
                  </Button>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4 text-gold" />
                      Pastors ({detail.pastors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StaffList users={detail.pastors} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4 text-primary" />
                      Church admins ({detail.admins.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StaffList users={detail.admins} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardModuleShell>
  );
}

function StaffList({ users }: { users: StaffUser[] }) {
  if (users.length === 0) {
    return <p className="text-xs text-muted-foreground">None</p>;
  }
  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.id} className="rounded-md border border-border px-3 py-2 text-sm">
          <p className="font-medium">
            {u.firstName} {u.lastName}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">{u.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {u.roles.map((r) => (
              <Badge key={r.name} variant="outline" className="text-[10px]">
                {r.name}
              </Badge>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

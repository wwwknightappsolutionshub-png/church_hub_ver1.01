'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Key,
  Loader2,
  Mail,
  BarChart3,
  MessageSquare,
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
  CreatePlatformChurchSchema,
  defaultTenantModules,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import {
  enterpriseHeroBadgeGoldClass,
  enterpriseHeroChipClass,
} from '@/components/layout/EnterpriseModuleShell';
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
  mustChangePassword?: boolean;
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
  CHILDREN: ['dashboard', 'children-list', 'children-parents', 'children-teachers', 'children-birthdays', 'children-roster', 'children-curriculum', 'children-reports', 'children-checkin', 'children-sunday-report', 'reports', 'resources', 'messages'],
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
  const [workspaceTab, setWorkspaceTab] = useState<'tenant' | 'modules' | 'departments' | 'staff'>(
    'tenant',
  );
  /** Accordion: only one module group open at a time (null = both collapsed). */
  const [openModuleGroup, setOpenModuleGroup] = useState<string | null>(null);
  /** Accordion: only one department open at a time. */
  const [openDept, setOpenDept] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeSlug, setPurgeSlug] = useState('');
  const [purgePhrase, setPurgePhrase] = useState('');
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
    const parsed = CreatePlatformChurchSchema.safeParse({
      name: createForm.name,
      slug: createForm.slug,
      adminEmail: createForm.adminEmail,
      pastorEmail: createForm.pastorEmail || undefined,
      city: createForm.city || undefined,
      country: createForm.country || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Church name, slug, and admin email are required');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<ChurchRow>('/platform/churches', parsed.data);
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
    if (
      !window.confirm(
        `Deactivate "${selectedRow.name}"? Users keep their data but cannot sign in. Use Permanently delete to wipe everything.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.delete<{ deactivated?: boolean; deleted?: boolean }>(
        `/platform/churches/${selectedId}`,
      );
      toast.success(
        data?.deleted
          ? 'Empty tenant deleted'
          : 'Tenant deactivated — data retained',
      );
      setSelectedId(null);
      refresh();
    } catch {
      toast.error('Could not deactivate tenant');
    } finally {
      setBusy(false);
    }
  };

  const permanentlyDeleteChurch = async () => {
    if (!selectedId || !selectedRow) return;
    setBusy(true);
    try {
      const { data } = await api.post<{
        emailsRemoved: string[];
        usersRemoved: number;
        membersRemoved: number;
      }>(`/platform/churches/${selectedId}/purge`, {
        confirmSlug: purgeSlug.trim().toLowerCase(),
        confirmPhrase: purgePhrase.trim().toUpperCase(),
      });
      toast.success(
        `Permanently deleted ${selectedRow.name} (${data.usersRemoved} users, ${data.membersRemoved} members)`,
      );
      setPurgeOpen(false);
      setPurgeSlug('');
      setPurgePhrase('');
      setSelectedId(null);
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not permanently delete tenant'));
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
      description={MODULE_DESCRIPTIONS.platform}
      badge={
        <>
          <Badge variant="gold" className={cn('gap-1.5', enterpriseHeroBadgeGoldClass)}>
            <Building2 className="h-3.5 w-3.5" />
            {churches?.length ?? 0} tenants
          </Badge>
          <Button variant="outline" size="sm" className={enterpriseHeroChipClass} asChild>
            <Link href="/dashboard/platform/inbox">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Messaging
            </Link>
          </Button>
          <Button variant="outline" size="sm" className={enterpriseHeroChipClass} asChild>
            <Link href="/dashboard/platform/analytics">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Analytics
            </Link>
          </Button>
          <Button variant="outline" size="sm" className={enterpriseHeroChipClass} asChild>
            <Link href="/dashboard/platform/wisdom365">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Wisdom365+
            </Link>
          </Button>
          <Button variant="outline" size="sm" className={enterpriseHeroChipClass} asChild>
            <Link href="/dashboard/platform/marketing">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Marketing
            </Link>
          </Button>
        </>
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
                onClick={() => {
                  setSelectedId(c.id);
                  setWorkspaceTab('tenant');
                  setOpenModuleGroup(null);
                  setOpenDept(null);
                }}
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

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {detail?.church.name ?? selectedRow?.name ?? 'Select a tenant'}
              </CardTitle>
              {selectedId && detail && !detailLoading ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'tenant' as const, label: 'Overview' },
                      { id: 'modules' as const, label: 'Modules' },
                      { id: 'departments' as const, label: 'Departments' },
                      { id: 'staff' as const, label: 'Staff' },
                    ] as const
                  ).map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={workspaceTab === t.id ? 'default' : 'outline'}
                      className="h-8"
                      onClick={() => setWorkspaceTab(t.id)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {!selectedId && (
                <p className="text-sm text-muted-foreground">
                  Choose a church to configure tenants, modules, departments, and staff.
                </p>
              )}
              {selectedId && detailLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {selectedId && detail && !detailLoading && workspaceTab === 'tenant' && (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
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
                    <Button size="sm" onClick={saveChurch} disabled={busy}>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save tenant
                    </Button>
                    <Button size="sm" variant="outline" onClick={removeChurch} disabled={busy}>
                      Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => {
                        setPurgeOpen(true);
                        setPurgeSlug('');
                        setPurgePhrase('');
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Permanently delete
                    </Button>
                  </div>
                  {purgeOpen ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                      <p className="text-sm font-semibold text-destructive">
                        Permanent delete — irreversible
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This removes the church, all members, users, emails, messages, and uploaded
                        files from the database. Type the tenant slug{' '}
                        <strong className="text-foreground">{selectedRow?.slug}</strong> and{' '}
                        <strong className="text-foreground">DELETE</strong> to confirm.
                      </p>
                      <Input
                        placeholder={`Type slug: ${selectedRow?.slug ?? ''}`}
                        value={purgeSlug}
                        onChange={(e) => setPurgeSlug(e.target.value)}
                        autoComplete="off"
                      />
                      <Input
                        placeholder='Type DELETE'
                        value={purgePhrase}
                        onChange={(e) => setPurgePhrase(e.target.value)}
                        autoComplete="off"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={
                            busy ||
                            purgeSlug.trim().toLowerCase() !== (selectedRow?.slug ?? '').toLowerCase() ||
                            purgePhrase.trim().toUpperCase() !== 'DELETE'
                          }
                          onClick={() => void permanentlyDeleteChurch()}
                        >
                          Confirm permanent delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setPurgeOpen(false);
                            setPurgeSlug('');
                            setPurgePhrase('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {selectedId && detail && !detailLoading && workspaceTab === 'modules' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Open one section at a time. Changes save with the button below.
                  </p>
                  {MODULE_GROUPS.map((group) => {
                    const open = openModuleGroup === group.title;
                    return (
                      <div key={group.title} className="overflow-hidden rounded-lg border">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between bg-muted/40 px-3 py-2.5 text-left text-sm font-semibold"
                          aria-expanded={open}
                          onClick={() =>
                            setOpenModuleGroup((cur) => (cur === group.title ? null : group.title))
                          }
                        >
                          <span className="uppercase tracking-wide text-xs text-muted-foreground">
                            {group.title}
                          </span>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform',
                              open ? 'rotate-0' : '-rotate-90',
                            )}
                          />
                        </button>
                        {open ? (
                          <div className="grid gap-1.5 p-2 sm:grid-cols-2">
                            {group.ids.map((id) => (
                              <label
                                key={id}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
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
                        ) : null}
                      </div>
                    );
                  })}
                  <Button size="sm" className="mt-2" onClick={saveChurch} disabled={busy}>
                    Save module access
                  </Button>
                </div>
              )}

              {selectedId && detail && !detailLoading && workspaceTab === 'departments' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Only one department expands at a time.
                  </p>
                  {DEPT_MODULE_CODES.map((code) => {
                    const enabled = deptDraft.enabledModules[code] !== false;
                    const tabs = DEPT_TABS[code];
                    const open = openDept === code;
                    return (
                      <div key={code} className="overflow-hidden rounded-lg border">
                        <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              setDeptDraft((prev) => ({
                                ...prev,
                                enabledModules: {
                                  ...prev.enabledModules,
                                  [code]: e.target.checked,
                                },
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="flex flex-1 items-center justify-between text-left text-sm font-medium"
                            aria-expanded={open}
                            onClick={() => setOpenDept((cur) => (cur === code ? null : code))}
                          >
                            <span>{DEPT_MODULE_LABELS[code]}</span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform',
                                open ? 'rotate-0' : '-rotate-90',
                              )}
                            />
                          </button>
                        </div>
                        {open ? (
                          <div className="grid gap-1 p-2 sm:grid-cols-3">
                            {tabs.map((tabId) => (
                              <label
                                key={`${code}-${tabId}`}
                                className="flex items-center gap-1.5 text-xs"
                              >
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
                        ) : null}
                      </div>
                    );
                  })}
                  <Button size="sm" className="mt-2" onClick={saveChurch} disabled={busy}>
                    Save department controls
                  </Button>
                </div>
              )}

              {selectedId && detail && !detailLoading && workspaceTab === 'staff' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Shield className="h-4 w-4 text-gold" />
                      Pastors ({detail.pastors.length})
                    </p>
                    <StaffList
                      users={detail.pastors}
                      churchId={selectedId}
                      onStaffChange={refresh}
                    />
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4 text-primary" />
                      Church admins ({detail.admins.length})
                    </p>
                    <StaffList
                      users={detail.admins}
                      churchId={selectedId}
                      onStaffChange={refresh}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardModuleShell>
  );
}

function StaffList({
  users,
  churchId,
  onStaffChange,
}: {
  users: StaffUser[];
  churchId: string;
  onStaffChange: () => void;
}) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [customPassword, setCustomPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [notifyUser, setNotifyUser] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);

  if (users.length === 0) {
    return <p className="text-xs text-muted-foreground">None</p>;
  }

  const saveEmail = async (user: StaffUser) => {
    const next = (emailDrafts[user.id] ?? user.email).trim().toLowerCase();
    if (!next || !next.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    if (next === user.email.toLowerCase()) {
      toast.message('Email unchanged');
      return;
    }
    setBusyUserId(user.id);
    try {
      await api.patch(`/platform/churches/${churchId}/users/${user.id}/email`, {
        email: next,
      });
      toast.success(`Email updated to ${next}`);
      setEmailDrafts((d) => {
        const copy = { ...d };
        delete copy[user.id];
        return copy;
      });
      onStaffChange();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update email'));
    } finally {
      setBusyUserId(null);
    }
  };

  const resetPassword = async (user: StaffUser, generate: boolean) => {
    if (!generate && customPassword.trim().length < 8) {
      toast.error('Custom password must be at least 8 characters');
      return;
    }
    setBusyUserId(user.id);
    setLastTempPassword(null);
    try {
      const { data } = await api.post<{
        success: boolean;
        email: string;
        emailSent: boolean;
        mustChangePassword: boolean;
        temporaryPassword?: string;
      }>(`/platform/churches/${churchId}/users/${user.id}/reset-password`, {
        newPassword: generate ? undefined : customPassword.trim(),
        mustChangePassword,
        notifyUser,
      });
      if (data.temporaryPassword) {
        setLastTempPassword(data.temporaryPassword);
        toast.success(
          data.emailSent
            ? `Temporary password emailed to ${data.email}`
            : `Password reset for ${data.email} — copy the temporary password below (email not sent)`,
        );
      } else {
        toast.success(
          data.emailSent
            ? `Password updated and emailed to ${data.email}`
            : `Password updated for ${data.email}`,
        );
      }
      setCustomPassword('');
      onStaffChange();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reset password'));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <ul className="space-y-2">
      {users.map((u) => {
        const open = openUserId === u.id;
        const busy = busyUserId === u.id;
        const emailValue = emailDrafts[u.id] ?? u.email;
        const emailDirty = emailValue.trim().toLowerCase() !== u.email.toLowerCase();
        return (
          <li key={u.id} className="rounded-md border border-border px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center">
                  <Input
                    type="email"
                    className="h-8 font-mono text-[11px]"
                    value={emailValue}
                    disabled={busy}
                    onChange={(e) =>
                      setEmailDrafts((d) => ({ ...d, [u.id]: e.target.value }))
                    }
                    aria-label={`Email for ${u.firstName} ${u.lastName}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={busy || !emailDirty}
                    onClick={() => void saveEmail(u)}
                  >
                    {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Save email
                  </Button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r.name} variant="outline" className="text-[10px]">
                      {r.name}
                    </Badge>
                  ))}
                  {u.mustChangePassword ? (
                    <Badge variant="gold" className="text-[10px]">
                      Must change password
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => {
                  setOpenUserId(open ? null : u.id);
                  setLastTempPassword(null);
                  setCustomPassword('');
                  setMustChangePassword(true);
                  setNotifyUser(true);
                }}
              >
                <Key className="h-3.5 w-3.5" />
                {open ? 'Close' : 'Password'}
              </Button>
            </div>

            {open ? (
              <div className="mt-3 space-y-3 rounded-md border border-dashed bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Set a new password or generate a temporary one. Active sessions are signed out.
                </p>
                <Input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Custom password (optional, min 8 chars)"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  disabled={busy}
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={mustChangePassword}
                    onChange={(e) => setMustChangePassword(e.target.checked)}
                    disabled={busy}
                  />
                  Require password change on next sign-in
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={notifyUser}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    disabled={busy}
                  />
                  Email credentials to the user
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void resetPassword(u, true)}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Generate temporary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy || customPassword.trim().length < 8}
                    onClick={() => void resetPassword(u, false)}
                  >
                    Set custom password
                  </Button>
                </div>
                {lastTempPassword && openUserId === u.id ? (
                  <div className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/40">
                    <p className="font-medium text-amber-900 dark:text-amber-100">Temporary password</p>
                    <p className="mt-1 break-all font-mono text-sm text-amber-950 dark:text-amber-50">
                      {lastTempPassword}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={async () => {
                        await navigator.clipboard.writeText(lastTempPassword);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

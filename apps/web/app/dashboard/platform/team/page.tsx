'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PermissionDef = {
  key: string;
  label: string;
  group: string;
  description: string;
};

type PlatformRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
};

type PlatformStaff = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  roles: { id: string; name: string; isSystem: boolean }[];
};

export default function PlatformTeamPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    isPlatformOperator,
    hasPlatformPermission,
    isLoading: accessLoading,
  } = useModuleAccess();

  const canRead = hasPlatformPermission('platform.team:read');
  const canWrite = hasPlatformPermission('platform.team:write');

  const { data: catalog = [], isLoading: catalogLoading } = useApiQuery<PermissionDef[]>(
    ['platform-team-permissions'],
    '/platform/team/permissions',
    { enabled: canRead },
  );
  const { data: roles = [], isLoading: rolesLoading } = useApiQuery<PlatformRole[]>(
    ['platform-team-roles'],
    '/platform/team/roles',
    { enabled: canRead },
  );
  const { data: staff = [], isLoading: staffLoading } = useApiQuery<PlatformStaff[]>(
    ['platform-team-staff'],
    '/platform/team/staff',
    { enabled: canRead },
  );

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
  });
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    for (const p of catalog) {
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    }
    return [...map.entries()];
  }, [catalog]);

  const assignableRoles = useMemo(
    () => roles.filter((r) => !r.isSystem && r.name !== 'PLATFORM_ADMIN'),
    [roles],
  );

  useEffect(() => {
    if (!accessLoading && (!isPlatformOperator || !canRead)) {
      router.replace('/dashboard/platform');
    }
  }, [accessLoading, isPlatformOperator, canRead, router]);

  useEffect(() => {
    if (!selectedRoleId && roles.length) {
      setSelectedRoleId(roles.find((r) => !r.isSystem)?.id ?? roles[0]?.id ?? null);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (selectedRole) {
      setDraftPermissions(selectedRole.permissions);
      setNewRoleDescription(selectedRole.description ?? '');
    }
  }, [selectedRole]);

  useEffect(() => {
    if (!inviteForm.roleId && assignableRoles[0]) {
      setInviteForm((f) => ({ ...f, roleId: assignableRoles[0].id }));
    }
  }, [assignableRoles, inviteForm.roleId]);

  const togglePermission = (key: string) => {
    if (selectedRole?.isSystem) return;
    setDraftPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const createRole = async () => {
    if (!canWrite) return;
    setBusy(true);
    try {
      const { data } = await api.post<PlatformRole>('/platform/team/roles', {
        name: newRoleName,
        description: newRoleDescription || undefined,
        permissions: draftPermissions.length ? draftPermissions : ['platform.overview:read'],
      });
      toast.success(`Created role ${data.name}`);
      setNewRoleName('');
      await queryClient.invalidateQueries({ queryKey: ['platform-team-roles'] });
      setSelectedRoleId(data.id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create role'));
    } finally {
      setBusy(false);
    }
  };

  const saveRole = async () => {
    if (!canWrite || !selectedRole || selectedRole.isSystem) return;
    setBusy(true);
    try {
      await api.patch(`/platform/team/roles/${selectedRole.id}`, {
        description: newRoleDescription,
        permissions: draftPermissions,
      });
      toast.success('Role updated');
      await queryClient.invalidateQueries({ queryKey: ['platform-team-roles'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update role'));
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async () => {
    if (!canWrite || !selectedRole || selectedRole.isSystem) return;
    if (!window.confirm(`Delete role ${selectedRole.name}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/platform/team/roles/${selectedRole.id}`);
      toast.success('Role deleted');
      setSelectedRoleId(null);
      await queryClient.invalidateQueries({ queryKey: ['platform-team-roles'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete role'));
    } finally {
      setBusy(false);
    }
  };

  const inviteStaff = async () => {
    if (!canWrite) return;
    setBusy(true);
    setInviteResult(null);
    try {
      const { data } = await api.post<{
        email: string;
        temporaryPassword: string | null;
        reactivated: boolean;
      }>('/platform/team/staff', inviteForm);
      toast.success(data.reactivated ? 'Staff reactivated' : 'Staff invited');
      if (data.temporaryPassword) {
        setInviteResult(`Temporary password for ${data.email}: ${data.temporaryPassword}`);
      }
      setInviteForm((f) => ({ ...f, email: '', firstName: '', lastName: '' }));
      await queryClient.invalidateQueries({ queryKey: ['platform-team-staff'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not invite staff'));
    } finally {
      setBusy(false);
    }
  };

  const updateStaff = async (userId: string, patch: { roleId?: string; isActive?: boolean }) => {
    if (!canWrite) return;
    setBusy(true);
    try {
      await api.patch(`/platform/team/staff/${userId}`, patch);
      toast.success('Staff updated');
      await queryClient.invalidateQueries({ queryKey: ['platform-team-staff'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update staff'));
    } finally {
      setBusy(false);
    }
  };

  if (accessLoading || !isPlatformOperator || !canRead) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const loading = catalogLoading || rolesLoading || staffLoading;

  return (
    <PlatformConsoleShell
      title="Platform team"
      description="Invite support operators and define custom roles with a permission matrix."
    >
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custom roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    selectedRoleId === role.id
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/70 hover:bg-muted/50',
                  )}
                >
                  <span className="font-medium">{role.name}</span>
                  <span className="flex items-center gap-1">
                    {role.isSystem ? <Badge variant="secondary">System</Badge> : null}
                    <Badge variant="outline">{role.userCount}</Badge>
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedRole ? `Permissions · ${selectedRole.name}` : 'Role editor'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canWrite ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    placeholder="New role name (e.g. SUPPORT_OPS)"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                  <Button type="button" disabled={busy || !newRoleName.trim()} onClick={createRole}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create role
                  </Button>
                </div>
              ) : null}

              {selectedRole ? (
                <>
                  <Input
                    placeholder="Description"
                    value={newRoleDescription}
                    disabled={!canWrite || selectedRole.isSystem}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                  />
                  <div className="space-y-4">
                    {groupedCatalog.map(([group, perms]) => (
                      <div key={group}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {perms.map((p) => {
                            const checked = draftPermissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className={cn(
                                  'flex cursor-pointer gap-2 rounded-lg border border-border/70 p-3 text-sm',
                                  selectedRole.isSystem && 'cursor-not-allowed opacity-70',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={checked}
                                  disabled={!canWrite || selectedRole.isSystem}
                                  onChange={() => togglePermission(p.key)}
                                />
                                <span>
                                  <span className="font-medium">{p.label}</span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {p.description}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canWrite && !selectedRole.isSystem ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={busy} onClick={saveRole}>
                        Save permissions
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={busy}
                        onClick={deleteRole}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete role
                      </Button>
                    </div>
                  ) : null}
                  {selectedRole.isSystem ? (
                    <p className="text-xs text-muted-foreground">
                      PLATFORM_ADMIN is a system role with full access and cannot be edited.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select or create a custom role.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Platform staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canWrite ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <Input
                    placeholder="Email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <Input
                    placeholder="First name"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                  <Input
                    placeholder="Last name"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={inviteForm.roleId}
                    onChange={(e) => setInviteForm((f) => ({ ...f, roleId: e.target.value }))}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={
                      busy ||
                      !inviteForm.email ||
                      !inviteForm.firstName ||
                      !inviteForm.lastName ||
                      !inviteForm.roleId
                    }
                    onClick={inviteStaff}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Invite
                  </Button>
                </div>
              ) : null}
              {inviteResult ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {inviteResult}
                </p>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => {
                      const role = s.roles[0];
                      const isOwner = role?.name === 'PLATFORM_ADMIN';
                      return (
                        <tr key={s.id} className="border-t border-border/60">
                          <td className="px-3 py-2 font-medium">
                            {s.firstName} {s.lastName}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{s.email}</td>
                          <td className="px-3 py-2">
                            {canWrite && !isOwner ? (
                              <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                value={role?.id ?? ''}
                                disabled={busy}
                                onChange={(e) => updateStaff(s.id, { roleId: e.target.value })}
                              >
                                {assignableRoles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge variant={isOwner ? 'secondary' : 'outline'}>
                                {role?.name ?? '—'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={s.isActive ? 'default' : 'outline'}>
                              {s.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {canWrite && !isOwner ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => updateStaff(s.id, { isActive: !s.isActive })}
                              >
                                {s.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!staff.length && !loading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          No platform staff yet. Create a custom role, then invite someone.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformConsoleShell>
  );
}

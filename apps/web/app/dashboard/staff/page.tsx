'use client';

import { useState } from 'react';
import { Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  CreateChurchStaffSchema,
  UpdateChurchStaffSchema,
} from '@church-hub/shared-types';

const ASSIGNABLE_ROLES = [
  'ADMIN',
  'PASTOR',
  'LEADER',
  'PROVINCIAL_LEADER',
  'MEMBER',
  'DRIVER',
] as const;

interface LedServiceUnit {
  id: string;
  name: string;
}

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  roles: { name: string; description: string | null }[];
  serviceUnitIds?: string[];
  ledServiceUnits?: LedServiceUnit[];
}

interface ServiceUnitOption {
  id: string;
  name: string;
}

function isUnitOnlyLeader(roles: string[]) {
  return roles.includes('LEADER') && !roles.includes('ADMIN') && !roles.includes('PASTOR');
}

export default function ChurchStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canManageStaff, isPlatformOperator, isLoading: accessLoading } =
    useModuleAccess();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: 'ChurchHub123!',
    firstName: '',
    lastName: '',
    roles: ['ADMIN'] as string[],
    serviceUnitIds: [] as string[],
  });

  useEffect(() => {
    if (!accessLoading && (isPlatformOperator || !canManageStaff)) {
      router.replace('/dashboard');
    }
  }, [accessLoading, isPlatformOperator, canManageStaff, router]);

  const { data: staff, isLoading } = useApiQuery<StaffUser[]>(
    ['church-staff'],
    '/church-staff',
    { enabled: canManageStaff && !isPlatformOperator },
  );

  const { data: serviceUnits } = useApiQuery<ServiceUnitOption[]>(
    ['service-units', 'staff-assign'],
    '/service-units',
    { enabled: canManageStaff && !isPlatformOperator && showForm },
  );

  const resetForm = () => {
    setForm({
      email: '',
      password: 'ChurchHub123!',
      firstName: '',
      lastName: '',
      roles: ['ADMIN'],
      serviceUnitIds: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (u: StaffUser) => {
    setEditingId(u.id);
    setForm({
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles.map((r) => r.name),
      serviceUnitIds: u.serviceUnitIds ?? u.ledServiceUnits?.map((x) => x.id) ?? [],
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const includeUnits =
        form.roles.includes('LEADER') || form.serviceUnitIds.length > 0;
      if (editingId) {
        const payload: Record<string, unknown> = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          roles: form.roles,
        };
        if (form.password) payload.password = form.password;
        if (includeUnits) payload.serviceUnitIds = form.serviceUnitIds;
        const parsed = UpdateChurchStaffSchema.safeParse(payload);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? 'Check the form fields');
          return;
        }
        await api.patch(`/church-staff/${editingId}`, parsed.data);
        toast.success('Staff updated');
      } else {
        const payload = {
          ...form,
          ...(includeUnits ? { serviceUnitIds: form.serviceUnitIds } : {}),
        };
        const parsed = CreateChurchStaffSchema.safeParse(payload);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? 'Check the form fields');
          return;
        }
        await api.post('/church-staff', parsed.data);
        toast.success('Staff account created');
      }
      queryClient.invalidateQueries({ queryKey: ['church-staff'] });
      resetForm();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (id: string) => {
    if (
      !confirm(
        'Permanently delete this staff account? This removes the login from the database and cannot be undone.',
      )
    ) {
      return;
    }
    try {
      await api.delete(`/church-staff/${id}`);
      toast.success('Account deleted');
      queryClient.invalidateQueries({ queryKey: ['church-staff'] });
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Could not delete account');
    }
  };

  const toggleRole = (role: string) => {
    setForm((f) => {
      const has = f.roles.includes(role);
      if (has && f.roles.length === 1) return f;
      const roles = has ? f.roles.filter((r) => r !== role) : [...f.roles, role];
      const next = { ...f, roles };
      if (!roles.includes('LEADER') && !roles.includes('ADMIN') && !roles.includes('PASTOR')) {
        next.serviceUnitIds = [];
      }
      return next;
    });
  };

  const toggleUnit = (unitId: string) => {
    setForm((f) => {
      const has = f.serviceUnitIds.includes(unitId);
      return {
        ...f,
        serviceUnitIds: has
          ? f.serviceUnitIds.filter((id) => id !== unitId)
          : [...f.serviceUnitIds, unitId],
      };
    });
  };

  const showUnitPicker =
    form.roles.includes('LEADER') ||
    form.roles.includes('ADMIN') ||
    form.roles.includes('PASTOR');
  const unitsRequired = isUnitOnlyLeader(form.roles);

  if (accessLoading || !canManageStaff) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardModuleShell
      eyebrow="Administration"
      title="Church staff"
      description={MODULE_DESCRIPTIONS.staff}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add staff
        </Button>
      }
    >
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit staff' : 'New staff account'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="staff-email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="staff-password" className="mb-1 block text-sm font-medium">
                  Password {editingId ? '(leave blank to keep)' : ''}
                </label>
                <Input
                  id="staff-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editingId}
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="staff-first-name" className="mb-1 block text-sm font-medium">
                  First name
                </label>
                <Input
                  id="staff-first-name"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="staff-last-name" className="mb-1 block text-sm font-medium">
                  Last name
                </label>
                <Input
                  id="staff-last-name"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ASSIGNABLE_ROLES.map((role) => {
                    return (
                      <Button
                        key={role}
                        type="button"
                        size="sm"
                        variant={form.roles.includes(role) ? 'default' : 'outline'}
                        disabled={false}
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Button>
                    );
                  })}
                </div>
                {unitsRequired ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    LEADER without ADMIN/PASTOR is a unit leader only — assign at least one
                    service unit. They get unit-scoped access, not church-wide staff tools.
                  </p>
                ) : null}
              </div>
              {showUnitPicker ? (
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Leads service units
                    {unitsRequired ? ' (required)' : ' (optional)'}
                  </label>
                  {!serviceUnits?.length ? (
                    <p className="text-sm text-muted-foreground">
                      No service units yet. Create units in Service Unit Hub first.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {serviceUnits.map((unit) => (
                        <Button
                          key={unit.id}
                          type="button"
                          size="sm"
                          variant={
                            form.serviceUnitIds.includes(unit.id) ? 'default' : 'outline'
                          }
                          onClick={() => toggleUnit(unit.id)}
                        >
                          {unit.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Staff accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Roles</th>
                    <th className="pb-2 pr-4">Units led</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff?.map((u) => (
                    <tr key={u.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">
                        {u.firstName} {u.lastName}
                        {!u.isActive && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{u.email}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r.name} variant="outline" className="text-[10px]">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(u.ledServiceUnits ?? []).length ? (
                            u.ledServiceUnits!.map((unit) => (
                              <Badge key={unit.id} variant="secondary" className="text-[10px]">
                                {unit.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deactivate(u.id)}
                            title="Permanently delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!staff?.length && (
                <p className="py-6 text-center text-muted-foreground">No staff accounts yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

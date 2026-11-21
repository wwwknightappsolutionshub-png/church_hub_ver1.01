'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StaffAccountWizard,
  formatRoleLabel,
  ROLE_DISPLAY,
  type ServiceUnitOption,
  type StaffWizardInitial,
} from '@/components/staff/StaffAccountWizard';

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

export default function ChurchStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canManageStaff, isPlatformOperator, isLoading: accessLoading } =
    useModuleAccess();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<StaffWizardInitial | null>(null);

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
    { enabled: canManageStaff && !isPlatformOperator && wizardOpen },
  );

  const openCreate = () => {
    setEditing(null);
    setWizardOpen(true);
  };

  const openEdit = (u: StaffUser) => {
    setEditing({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      roles: u.roles.map((r) => r.name),
      // One unit max — if legacy multi-unit data exists, keep the first for edit.
      serviceUnitIds: (u.serviceUnitIds ?? u.ledServiceUnits?.map((x) => x.id) ?? []).slice(
        0,
        1,
      ),
    });
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setEditing(null);
  };

  const saveStaff = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      if (editing?.id) {
        await api.patch(`/church-staff/${editing.id}`, payload);
        toast.success('Staff updated');
      } else {
        await api.post('/church-staff', payload);
        toast.success('Staff account created — set-password link emailed');
      }
      queryClient.invalidateQueries({ queryKey: ['church-staff'] });
      closeWizard();
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
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add staff
        </Button>
      }
    >
      {wizardOpen ? (
        <StaffAccountWizard
          mode={editing?.id ? 'edit' : 'create'}
          initial={editing}
          serviceUnits={serviceUnits ?? []}
          saving={busy}
          onClose={closeWizard}
          onSubmit={saveStaff}
        />
      ) : null}

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
                    <th className="pb-2 pr-4">Access</th>
                    <th className="pb-2 pr-4">Unit led</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff?.map((u) => {
                    const units = u.ledServiceUnits ?? [];
                    return (
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
                          <div className="flex flex-col gap-1.5">
                            {u.roles.map((r) => {
                              const meta = ROLE_DISPLAY[r.name];
                              return (
                                <div key={r.name} className="min-w-0">
                                  <Badge variant="outline" className="text-[10px]">
                                    {formatRoleLabel(r.name)}
                                  </Badge>
                                  {meta?.description ? (
                                    <p className="mt-0.5 max-w-[16rem] text-[11px] leading-snug text-muted-foreground">
                                      {meta.description}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {units.length ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{units[0].name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Sole unit assignment
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
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
                    );
                  })}
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

'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { LazyCongregantEditorForm } from '@/lib/membership-lazy';
import { formatMemberName } from '@/lib/service-unit-utils';
import { MemberWithPresence } from '@/components/service-units/OnlineIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type UnitRole = 'MEMBER' | 'UNIT_ADMIN';

interface UnitMemberRow {
  memberId: string;
  joinedAt: string;
  unitRole: UnitRole;
  designation: string | null;
  leaderId: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
}

interface ChurchMemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

interface FamilyOption {
  id: string;
  name: string;
}

export function ServiceUnitMembersPanel({
  unitId,
  canManage,
  isOnline,
}: {
  unitId: string;
  canManage: boolean;
  isOnline: (memberId: string) => boolean;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingMemberId, setExistingMemberId] = useState('');
  const [existingRole, setExistingRole] = useState<UnitRole>('MEMBER');
  const [existingDesignation, setExistingDesignation] = useState('');
  const [showCongregantEditor, setShowCongregantEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    unitRole: 'MEMBER' as UnitRole,
    designation: '',
  });

  const { data: rows = [], isLoading, refetch } = useApiQuery<UnitMemberRow[]>(
    ['service-unit-members', unitId],
    `/service-units/${unitId}/members`,
  );

  const { data: churchMembers = [] } = useApiQuery<ChurchMemberOption[]>(
    ['membership-members-picker'],
    '/membership/members',
    { enabled: canManage },
  );

  const { data: families = [] } = useApiQuery<FamilyOption[]>(
    ['membership-families'],
    '/membership/families',
    { enabled: canManage && showCongregantEditor },
  );

  const unitMemberIds = useMemo(() => new Set(rows.map((r) => r.memberId)), [rows]);

  const availableMembers = useMemo(
    () => churchMembers.filter((m) => !unitMemberIds.has(m.id)),
    [churchMembers, unitMemberIds],
  );

  const invalidate = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['service-unit', unitId] });
    queryClient.invalidateQueries({ queryKey: ['service-units'] });
    queryClient.invalidateQueries({ queryKey: ['membership-members-picker'] });
  };

  const addExistingMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!existingMemberId) {
      toast.error('Select a church member');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/service-units/${unitId}/members`, {
        memberId: existingMemberId,
        unitRole: existingRole,
        designation: existingDesignation.trim() || undefined,
      });
      toast.success('Member added to unit');
      setExistingMemberId('');
      setExistingRole('MEMBER');
      setExistingDesignation('');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not add member'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (row: UnitMemberRow) => {
    setEditingId(row.memberId);
    setEditForm({
      firstName: row.member.firstName,
      lastName: row.member.lastName,
      email: row.member.email ?? '',
      phone: row.member.phone ?? '',
      unitRole: row.unitRole,
      designation: row.designation ?? '',
    });
  };

  const saveEdit = async (memberId: string) => {
    setBusy(true);
    try {
      await api.patch(`/service-units/${unitId}/members/${memberId}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        unitRole: editForm.unitRole,
        designation: editForm.designation.trim() || undefined,
      });
      toast.success('Member updated');
      setEditingId(null);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not update member'));
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this service unit?`)) return;
    setBusy(true);
    try {
      await api.delete(`/service-units/${unitId}/members/${memberId}`);
      toast.success('Member removed from unit');
      if (editingId === memberId) setEditingId(null);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not remove member'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Add member
            </CardTitle>
            <CardDescription>
              Add someone from the church roster or create a new congregant in the global membership
              database, then assign them as a unit member or unit admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'existing' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('existing');
                  setShowCongregantEditor(false);
                }}
              >
                From church roster
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'new' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('new');
                  setShowCongregantEditor(true);
                }}
              >
                Create new person
              </Button>
            </div>

            {mode === 'existing' ? (
              <form onSubmit={addExistingMember} className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={existingMemberId}
                  onChange={(e) => setExistingMemberId(e.target.value)}
                  required
                >
                  <option value="">Select church member…</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatMemberName(m)}
                      {m.email ? ` (${m.email})` : ''}
                    </option>
                  ))}
                </select>
                <RoleFields
                  unitRole={existingRole}
                  designation={existingDesignation}
                  onRoleChange={setExistingRole}
                  onDesignationChange={setExistingDesignation}
                />
                <Button type="submit" disabled={busy} className="gap-1">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add to unit
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Use the Add New Congregant form to save them to the global membership database and
                attach them to this unit.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit members</CardTitle>
          <CardDescription>
            {canManage
              ? 'Edit profiles, change roles, or remove people from this service unit.'
              : 'People assigned to this service unit.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading members…</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Unit role</th>
                  {canManage && <th className="pb-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) =>
                  editingId === row.memberId && canManage ? (
                    <tr key={row.memberId} className="border-b border-border/60">
                      <td colSpan={4} className="py-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            placeholder="First name"
                            value={editForm.firstName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, firstName: e.target.value })
                            }
                          />
                          <Input
                            placeholder="Last name"
                            value={editForm.lastName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, lastName: e.target.value })
                            }
                          />
                          <Input
                            placeholder="Email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          />
                          <Input
                            placeholder="Phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          />
                          <RoleFields
                            unitRole={editForm.unitRole}
                            designation={editForm.designation}
                            onRoleChange={(unitRole) => setEditForm({ ...editForm, unitRole })}
                            onDesignationChange={(designation) =>
                              setEditForm({ ...editForm, designation })
                            }
                            className="md:col-span-2"
                          />
                          <div className="flex flex-wrap gap-2 md:col-span-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => saveEdit(row.memberId)}
                            >
                              Save changes
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.memberId} className="border-b border-border/60">
                      <td className="py-3">
                        <MemberWithPresence
                          name={formatMemberName(row.member)}
                          online={isOnline(row.memberId)}
                        />
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <div>{row.member.email ?? '—'}</div>
                        {row.member.phone ? (
                          <div className="text-xs">{row.member.phone}</div>
                        ) : null}
                      </td>
                      <td className="py-3">
                        {row.unitRole === 'UNIT_ADMIN' ? (
                          <Badge variant="gold">Unit admin</Badge>
                        ) : (
                          <Badge variant="secondary">Member</Badge>
                        )}
                        {row.designation && row.unitRole === 'UNIT_ADMIN' ? (
                          <p className="mt-1 text-xs text-muted-foreground">{row.designation}</p>
                        ) : null}
                      </td>
                      {canManage && (
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                removeMember(row.memberId, formatMemberName(row.member))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManage ? 4 : 3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No members in this unit yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {showCongregantEditor && canManage && (
        <LazyCongregantEditorForm
          families={(families ?? []).map((f) => ({ id: f.id, name: f.name }))}
          createMemberPath={`/service-units/${unitId}/members/create`}
          catalogPath="/service-units/registry-catalog"
          defaultServiceUnitIds={[unitId]}
          lockServiceUnit
          dialogTitle="Add congregant to this service unit"
          submitLabel="Create & add to unit"
          onClose={() => {
            setShowCongregantEditor(false);
            setMode('existing');
          }}
          onSaved={() => {
            setShowCongregantEditor(false);
            setMode('existing');
            toast.success('Congregant saved to membership and added to this unit');
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function RoleFields({
  unitRole,
  designation,
  onRoleChange,
  onDesignationChange,
  className,
}: {
  unitRole: UnitRole;
  designation: string;
  onRoleChange: (role: UnitRole) => void;
  onDesignationChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 md:grid-cols-2 ${className ?? ''}`}>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={unitRole}
        onChange={(e) => onRoleChange(e.target.value as UnitRole)}
      >
        <option value="MEMBER">Unit member</option>
        <option value="UNIT_ADMIN">Unit admin</option>
      </select>
      {unitRole === 'UNIT_ADMIN' ? (
        <Input
          placeholder="Designation (optional)"
          value={designation}
          onChange={(e) => onDesignationChange(e.target.value)}
        />
      ) : (
        <div />
      )}
    </div>
  );
}

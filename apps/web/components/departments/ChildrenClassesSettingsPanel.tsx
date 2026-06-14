'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Loader2, Pencil, Plus, School } from 'lucide-react';
import { toast } from 'sonner';
import type { ChildrenClassDefinitionDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { useChildrenClassGroups } from '@/lib/children-classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type EditState = {
  id: string;
  name: string;
  minAge: string;
  maxAge: string;
  sortOrder: string;
  isActive: boolean;
};

export function ChildrenClassesSettingsPanel({ unitId }: { unitId: string }) {
  const base = `${deptToolsApiBase(unitId)}/children/classes`;
  const queryClient = useQueryClient();
  const { classes, isLoading, refetch } = useChildrenClassGroups(unitId, { includeInactive: true });
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [newName, setNewName] = useState('');
  const [newMinAge, setNewMinAge] = useState('');
  const [newMaxAge, setNewMaxAge] = useState('');

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['children-classes', unitId] });
    void refetch();
  };

  const startEdit = (row: ChildrenClassDefinitionDto) => {
    setEdit({
      id: row.id,
      name: row.name,
      minAge: row.minAge != null ? String(row.minAge) : '',
      maxAge: row.maxAge != null ? String(row.maxAge) : '',
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
    });
  };

  const createClass = async () => {
    if (!newName.trim()) {
      toast.error('Class name is required');
      return;
    }
    setBusy(true);
    try {
      await api.post(base, {
        name: newName.trim(),
        minAge: newMinAge ? Number(newMinAge) : null,
        maxAge: newMaxAge ? Number(newMaxAge) : null,
      });
      toast.success('Class created');
      setNewName('');
      setNewMinAge('');
      setNewMaxAge('');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not create class'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`${base}/${edit.id}`, {
        name: edit.name.trim(),
        minAge: edit.minAge ? Number(edit.minAge) : null,
        maxAge: edit.maxAge ? Number(edit.maxAge) : null,
        sortOrder: edit.sortOrder ? Number(edit.sortOrder) : undefined,
        isActive: edit.isActive,
      });
      toast.success('Class updated');
      setEdit(null);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not update class'));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <School className="h-5 w-5" />
            Children&apos;s Church classes
          </CardTitle>
          <CardDescription>
            Configure age groups and class names for this unit. Church Admin, Pastor, and
            Children&apos;s Church Admin can add or edit classes. Default classes are seeded
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-medium">Add new class</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="sm:col-span-2">
                <Label className="text-xs">Class name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Toddlers" />
              </label>
              <label>
                <Label className="text-xs">Min age</Label>
                <Input value={newMinAge} onChange={(e) => setNewMinAge(e.target.value)} placeholder="3" />
              </label>
              <label>
                <Label className="text-xs">Max age</Label>
                <Input value={newMaxAge} onChange={(e) => setNewMaxAge(e.target.value)} placeholder="5" />
              </label>
            </div>
            <Button type="button" className="mt-3 gap-2" disabled={busy} onClick={createClass}>
              <Plus className="h-4 w-4" />
              Add class
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Ages</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {classes.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    {edit && edit.id === row.id ? (
                      <>
                        <td className="px-3 py-2">
                          <Input
                            value={edit.name}
                            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Input
                              className="w-16"
                              value={edit.minAge}
                              onChange={(e) => setEdit({ ...edit, minAge: e.target.value })}
                            />
                            <span className="self-center text-muted-foreground">–</span>
                            <Input
                              className="w-16"
                              value={edit.maxAge}
                              onChange={(e) => setEdit({ ...edit, maxAge: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                        <td className="px-3 py-2">
                          <Input
                            className="w-16"
                            value={edit.sortOrder}
                            onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={edit.isActive}
                              onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
                            />
                            Active
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button type="button" size="sm" disabled={busy} onClick={saveEdit}>
                              Save
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEdit(null)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium">
                          {row.name}
                          {row.isSystem ? (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              Default
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.ages || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                        <td className="px-3 py-2">{row.sortOrder}</td>
                        <td className="px-3 py-2">
                          <Badge variant={row.isActive ? 'default' : 'outline'}>
                            {row.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEdit(row)}>
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

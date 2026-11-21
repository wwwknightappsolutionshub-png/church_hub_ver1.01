'use client';

import { useMemo, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type DeputyRole = 'ASSISTANT' | 'SECRETARY';

type DeputyRow = {
  id: string;
  role: DeputyRole;
  user: { id: string; name: string; email: string };
};

type LeaderCandidate = { id: string; name: string; email: string };

export function CellDeputyAssignPanel({
  scope,
  scopeId,
  canAssign,
  onChanged,
}: {
  scope: 'branch' | 'province';
  scopeId: string;
  canAssign: boolean;
  onChanged?: () => void;
}) {
  const base =
    scope === 'branch'
      ? `/ministry-cells/branches/${scopeId}/deputies`
      : `/ministry-cells/provinces/${scopeId}/deputies`;
  const candidatesPath =
    scope === 'branch'
      ? `/ministry-cells/branches/${scopeId}/deputy-candidates`
      : `/ministry-cells/provinces/${scopeId}/deputy-candidates`;

  const { data: deputies = [], refetch } = useApiQuery<DeputyRow[]>(
    ['ministry-cells', 'deputies', scope, scopeId],
    base,
    { enabled: !!scopeId },
  );
  const { data: candidates = [] } = useApiQuery<LeaderCandidate[]>(
    ['ministry-cells', 'deputy-candidates', scope, scopeId],
    candidatesPath,
    { enabled: canAssign && !!scopeId },
  );

  const [role, setRole] = useState<DeputyRole>('ASSISTANT');
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const taken = useMemo(() => {
    const set = new Set<DeputyRole>();
    for (const d of deputies) set.add(d.role);
    return set;
  }, [deputies]);

  const availableCandidates = useMemo(() => {
    const assigned = new Set(deputies.map((d) => d.user.id));
    return candidates.filter((c) => !assigned.has(c.id));
  }, [candidates, deputies]);

  const assign = async () => {
    if (!userId) {
      toast.error('Select a person');
      return;
    }
    if (taken.has(role)) {
      toast.error(`This ${scope} already has a ${role === 'ASSISTANT' ? 'Assistant' : 'Secretary'}`);
      return;
    }
    setBusy(true);
    try {
      await api.post(base, { role, userId });
      toast.success(`${role === 'ASSISTANT' ? 'Assistant' : 'Secretary'} assigned`);
      setUserId('');
      await refetch();
      onChanged?.();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not assign deputy'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: DeputyRow) => {
    setRemovingId(row.id);
    try {
      await api.delete(`${base}/${row.id}`);
      toast.success('Removed');
      await refetch();
      onChanged?.();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not remove deputy'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Assistants &amp; Secretaries</p>
        <p className="text-xs text-muted-foreground">
          Operational access for this {scope}. They cannot assign the primary leader or other
          deputies.
        </p>
      </div>

      <ul className="divide-y rounded-md border">
        {deputies.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{d.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{d.user.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {d.role === 'ASSISTANT' ? 'Assistant' : 'Secretary'}
              </Badge>
              {canAssign ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={removingId === d.id}
                  onClick={() => void remove(d)}
                  title="Remove"
                >
                  {removingId === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
        {deputies.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            No Assistant or Secretary assigned yet.
          </li>
        ) : null}
      </ul>

      {canAssign ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor={`deputy-user-${scopeId}`}>Person</Label>
            <select
              id={`deputy-user-${scopeId}`}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Select…</option>
              {availableCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` (${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`deputy-role-${scopeId}`}>Role</Label>
            <select
              id={`deputy-role-${scopeId}`}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as DeputyRole)}
            >
              <option value="ASSISTANT" disabled={taken.has('ASSISTANT')}>
                Assistant
              </option>
              <option value="SECRETARY" disabled={taken.has('SECRETARY')}>
                Secretary
              </option>
            </select>
          </div>
          <Button type="button" size="sm" disabled={busy} onClick={() => void assign()} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Assign
          </Button>
        </div>
      ) : null}
    </div>
  );
}

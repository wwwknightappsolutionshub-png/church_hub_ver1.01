'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CreateCellProvinceSchema } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { CellProvinceRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProvincesSetupPanel({ onChanged }: { onChanged: () => void }) {
  const { data: provinces = [], isLoading } = useApiQuery<CellProvinceRow[]>(
    ['ministry-cells', 'provinces'],
    '/ministry-cells/provinces',
  );
  const { data: candidates = [] } = useApiQuery<{ id: string; name: string; email: string }[]>(
    ['ministry-cells', 'provincial-leader-candidates'],
    '/ministry-cells/provincial-leader-candidates',
  );

  const [name, setName] = useState('');
  const [postcodes, setPostcodes] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = postcodes
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = CreateCellProvinceSchema.safeParse({
      name,
      leaderUserId,
      postcodes: list,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Check the province details');
      return;
    }
    setBusy(true);
    try {
      await api.post('/ministry-cells/provinces', parsed.data);
      toast.success('Province created');
      setName('');
      setPostcodes('');
      setLeaderUserId('');
      onChanged();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to create province');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Delete province "${label}"? Cells will be unmapped.`)) return;
    try {
      await api.delete(`/ministry-cells/provinces/${id}`);
      toast.success('Province deleted');
      onChanged();
    } catch {
      toast.error('Failed to delete province');
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-2.5">
          <CardTitle className="text-sm font-semibold">Create province</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <form className="space-y-3" onSubmit={(e) => void create(e)}>
            <div className="space-y-1">
              <Label htmlFor="province-name">Name</Label>
              <Input
                id="province-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="North London"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="province-postcodes">Coverage postcodes</Label>
              <Input
                id="province-postcodes"
                value={postcodes}
                onChange={(e) => setPostcodes(e.target.value)}
                placeholder="N1, N2, N3 (comma-separated)"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Outward codes or full postcodes. Each code can belong to only one province.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="province-leader">Provincial leader</Label>
              <select
                id="province-leader"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={leaderUserId}
                onChange={(e) => setLeaderUserId(e.target.value)}
                required
              >
                <option value="">Select PROVINCIAL_LEADER user…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              {candidates.length === 0 && (
                <p className="text-[11px] text-amber-700">
                  Create a staff user with the PROVINCIAL_LEADER role first (Church staff).
                </p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={busy || !candidates.length}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Create province
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="px-4 py-2.5">
          <CardTitle className="text-sm font-semibold">Provinces</CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 space-y-2 overflow-y-auto px-4 pb-3 pt-0">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {provinces.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  Leader: {p.leader.name} · {p.branchCount} cells
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.postcodes.join(', ') || 'No postcodes'}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => void remove(p.id, p.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!isLoading && provinces.length === 0 && (
            <p className="text-sm text-muted-foreground">No provinces yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

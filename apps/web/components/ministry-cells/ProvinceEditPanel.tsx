'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UpdateCellProvinceSchema } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { CellProvinceRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LeaderCandidate = { id: string; name: string; email: string; phone?: string | null };

export function ProvinceEditPanel({
  province,
  onClose,
  onSaved,
}: {
  province: CellProvinceRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: candidates = [] } = useApiQuery<LeaderCandidate[]>(
    ['ministry-cells', 'provincial-leader-candidates', province.id],
    `/ministry-cells/provincial-leader-candidates?excludeProvinceId=${province.id}`,
  );

  const [name, setName] = useState(province.name);
  const [postcodes, setPostcodes] = useState(province.postcodes.join(', '));
  const [leaderUserId, setLeaderUserId] = useState(province.leader.id);
  const [leaderPhone, setLeaderPhone] = useState(province.leader.phone ?? '');
  const [busy, setBusy] = useState(false);

  const leaderOptions = useMemo(() => {
    const map = new Map<string, LeaderCandidate>();
    map.set(province.leader.id, {
      id: province.leader.id,
      name: province.leader.name,
      email: province.leader.email,
      phone: province.leader.phone,
    });
    for (const c of candidates) map.set(c.id, c);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates, province.leader]);

  useEffect(() => {
    const selected = leaderOptions.find((c) => c.id === leaderUserId);
    if (selected && selected.id !== province.leader.id) {
      setLeaderPhone(selected.phone ?? '');
    }
  }, [leaderUserId, leaderOptions, province.leader.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = postcodes
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = UpdateCellProvinceSchema.safeParse({
      name,
      leaderUserId,
      postcodes: list,
      leaderPhone: leaderPhone.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Check the province details');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/ministry-cells/provinces/${province.id}`, parsed.data);
      toast.success('Province updated');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to update province');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[min(94vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="province-edit-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 id="province-edit-title" className="text-base font-semibold">
              Edit province
            </h2>
            <p className="text-xs text-muted-foreground">Update province and leader details</p>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <form className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" onSubmit={(e) => void save(e)}>
          <div className="space-y-1">
            <Label htmlFor="edit-province-name">Province name</Label>
            <Input
              id="edit-province-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-province-postcodes">Coverage postcodes</Label>
            <Input
              id="edit-province-postcodes"
              value={postcodes}
              onChange={(e) => setPostcodes(e.target.value)}
              placeholder="N1, N2, N3"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-province-leader">Provincial leader</Label>
            <select
              id="edit-province-leader"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={leaderUserId}
              onChange={(e) => setLeaderUserId(e.target.value)}
              required
            >
              {leaderOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-leader-phone">Leader phone</Label>
            <Input
              id="edit-leader-phone"
              value={leaderPhone}
              onChange={(e) => setLeaderPhone(e.target.value)}
              placeholder="+44…"
            />
            <p className="text-[11px] text-muted-foreground">
              Leader name and email come from their staff account. Phone can be updated here.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

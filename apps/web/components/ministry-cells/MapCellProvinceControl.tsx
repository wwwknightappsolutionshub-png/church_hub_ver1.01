'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { cellPostcodeMatchesCoverage } from '@church-hub/shared-types';
import type { BranchRow, CellProvinceRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MapCellProvinceControl({
  branch,
  onChanged,
}: {
  branch: BranchRow;
  onChanged: () => void;
}) {
  const { data: provinces = [] } = useApiQuery<CellProvinceRow[]>(
    ['ministry-cells', 'provinces'],
    '/ministry-cells/provinces',
  );
  const [provinceId, setProvinceId] = useState(branch.provinceId ?? '');
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(() => {
    if (!branch.postcode) return [];
    return provinces.filter((p) =>
      cellPostcodeMatchesCoverage(branch.postcode!, p.postcodes),
    );
  }, [branch.postcode, provinces]);

  const map = async () => {
    if (!provinceId) {
      toast.error('Select a province');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/ministry-cells/branches/${branch.id}/map-province`, { provinceId });
      toast.success('Cell mapped to province');
      onChanged();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Could not map cell');
    } finally {
      setBusy(false);
    }
  };

  if (!branch.postcode) {
    return (
      <p className="text-xs text-amber-700">Add a postcode to this cell before mapping.</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {branch.province ? (
        <Badge variant="secondary">{branch.province.name}</Badge>
      ) : (
        <Badge variant="outline">Unmapped</Badge>
      )}
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        value={provinceId}
        onChange={(e) => setProvinceId(e.target.value)}
      >
        <option value="">Map to province…</option>
        {eligible.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => void map()}>
        Map
      </Button>
      {eligible.length === 0 && (
        <span className="text-[11px] text-muted-foreground">
          No province covers {branch.postcode}
        </span>
      )}
    </div>
  );
}

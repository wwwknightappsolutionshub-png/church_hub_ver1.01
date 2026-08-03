'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { cellPostcodeMatchesCoverage } from '@church-hub/shared-types';
import type { BranchRow, CellProvinceRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function MapCellProvinceControl({
  branch,
  onChanged,
  defaultOpen = false,
}: {
  branch: BranchRow;
  onChanged: () => void;
  /** Mapping controls start collapsed unless opened. */
  defaultOpen?: boolean;
}) {
  const { data: provinces = [] } = useApiQuery<CellProvinceRow[]>(
    ['ministry-cells', 'provinces'],
    '/ministry-cells/provinces',
  );
  const [provinceId, setProvinceId] = useState(branch.provinceId ?? '');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  const sortedProvinces = useMemo(() => {
    if (!branch.postcode) return provinces;
    return [...provinces].sort((a, b) => {
      const aOk = cellPostcodeMatchesCoverage(branch.postcode!, a.postcodes) ? 0 : 1;
      const bOk = cellPostcodeMatchesCoverage(branch.postcode!, b.postcodes) ? 0 : 1;
      return aOk - bOk || a.name.localeCompare(b.name);
    });
  }, [branch.postcode, provinces]);

  const coversSelected = useMemo(() => {
    if (!branch.postcode || !provinceId) return true;
    const p = provinces.find((x) => x.id === provinceId);
    if (!p) return true;
    return cellPostcodeMatchesCoverage(branch.postcode, p.postcodes);
  }, [branch.postcode, provinceId, provinces]);

  const map = async () => {
    if (!provinceId) {
      toast.error('Select a province');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/ministry-cells/branches/${branch.id}/map-province`, { provinceId });
      toast.success(
        coversSelected
          ? 'Cell mapped to province'
          : 'Cell mapped — postcode coverage updated for this province',
      );
      onChanged();
      setOpen(false);
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
    <div className="w-full space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {branch.province ? (
            <Badge variant="secondary">{branch.province.name}</Badge>
          ) : (
            <Badge variant="outline">Unmapped</Badge>
          )}
          <span className="truncate text-xs text-muted-foreground">
            {open ? 'Hide mapping' : 'Map to province'}
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
          {provinces.length === 0 ? (
            <p className="text-[11px] text-amber-700">Create a province first, then map this cell.</p>
          ) : (
            <>
              <select
                className="h-8 min-w-[10rem] flex-1 rounded-md border border-input bg-background px-2 text-xs"
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
              >
                <option value="">Map to province…</option>
                {sortedProvinces.map((p) => {
                  const covers = cellPostcodeMatchesCoverage(branch.postcode!, p.postcodes);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {covers ? ' (covers postcode)' : ''}
                    </option>
                  );
                })}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                disabled={busy}
                onClick={() => void map()}
              >
                Map
              </Button>
              {provinceId && !coversSelected && (
                <span className={cn('text-[11px] text-muted-foreground')}>
                  Will add {branch.postcode} coverage to this province
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

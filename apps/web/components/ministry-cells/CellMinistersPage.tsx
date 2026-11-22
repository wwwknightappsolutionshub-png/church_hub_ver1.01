'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, Users } from 'lucide-react';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  EnterpriseHero,
  EnterpriseShell,
} from '@/components/layout/EnterpriseModuleShell';
import type { MinistryCellsContext } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type CellMinisterApiRow = {
  id: string;
  ministerName: string;
  ministerEmail?: string;
  cellName: string;
  createdAt: string;
  postcode: string | null;
  location: string | null;
  latestAttendance: { presentCount: number; weekStart: string } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAttendance(row: CellMinisterApiRow) {
  const latest = row.latestAttendance;
  if (!latest) return '—';
  return `${latest.presentCount} · ${formatDate(latest.weekStart)}`;
}

export function CellMinistersPage() {
  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useApiQuery<MinistryCellsContext>(
    ['ministry-cells', 'context'],
    '/ministry-cells/context',
  );

  const allowed =
    !!ctx &&
    (ctx.canManage || ctx.role === 'provincialLeader');

  const {
    data: ministers = [],
    isLoading: ministersLoading,
    error: ministersError,
  } = useApiQuery<CellMinisterApiRow[]>(
    ['ministry-cells', 'ministers'],
    '/ministry-cells/ministers',
    { enabled: allowed },
  );

  const loading = ctxLoading || (allowed && ministersLoading);
  const error = ctxError || ministersError;

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Ministry/Cells"
        title="Cell Ministers"
        description="Assigned cell leaders across your church — Lookup opens the cell dashboard."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/ministry-cells">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Branches
            </Link>
          </Button>
        }
      />

      <div className="w-full space-y-4 px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            {allowed
              ? `${ministers.length} cell minister${ministers.length === 1 ? '' : 's'}`
              : 'Leadership access required'}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-destructive/40 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-destructive">
              {apiErrorMessage(error, 'Could not load cell ministers.')}
            </CardContent>
          </Card>
        ) : !allowed ? (
          <Card className="shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Only Church Admin, Pastor, or Provincial Leader can view the cell ministers roster.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-sm" data-testid="cell-ministers-page">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 font-semibold">S/N</th>
                      <th className="px-3 py-3 font-semibold">Minister&apos;s Name</th>
                      <th className="px-3 py-3 font-semibold">Cell Name</th>
                      <th className="px-3 py-3 font-semibold">Created On</th>
                      <th className="px-3 py-3 font-semibold">Cell Postcode</th>
                      <th className="px-3 py-3 font-semibold">Cell Area</th>
                      <th className="px-3 py-3 font-semibold">Last Attendance</th>
                      <th className="px-3 py-3 font-semibold">Lookup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ministers.length === 0 ? (
                      <tr data-testid="cell-ministers-empty">
                        <td
                          colSpan={8}
                          className="px-3 py-10 text-center text-sm text-muted-foreground"
                        >
                          No cell ministers assigned yet. Assign a leader when creating or editing
                          a cell — the table columns stay ready above.
                        </td>
                      </tr>
                    ) : (
                      ministers.map((row, index) => (
                        <tr
                          key={row.id}
                          className="border-t border-border/70 odd:bg-background even:bg-muted/10"
                          data-testid="cell-minister-row"
                        >
                          <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2.5 font-medium">{row.ministerName}</td>
                          <td className="px-3 py-2.5">{row.cellName}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {formatDate(row.createdAt)}
                          </td>
                          <td className="px-3 py-2.5">{row.postcode || '—'}</td>
                          <td className="px-3 py-2.5">{row.location || '—'}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {formatAttendance(row)}
                          </td>
                          <td className="px-3 py-2.5">
                            <Button asChild size="sm" variant="outline" className="h-8">
                              <Link
                                href={`/dashboard/ministry-cells?branch=${encodeURIComponent(row.id)}`}
                              >
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                Lookup
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </EnterpriseShell>
  );
}

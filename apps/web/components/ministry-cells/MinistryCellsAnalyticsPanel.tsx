'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { MINISTRY_CELLS_DESKTOP_MQ } from '@/components/ministry-cells/layout';
import type { BranchRow } from '@/components/ministry-cells/types';
import {
  downloadAnalyticsCsv,
  downloadAnalyticsPdf,
  type AnalyticsReportMeta,
} from '@/lib/ministry-cells-analytics-report';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { cn } from '@/lib/utils';
import { FormSelect } from '@/components/ui/form-select';

export interface BranchMetric {
  branchId: string;
  name: string;
  location: string | null;
  memberCount: number;
  leader: string | null;
  avgAttendance: number;
  reportCompliance: number;
  incidentCount: number;
  openIncidents: number;
  prayerCount: number;
  messageCount: number;
}

export interface AttendanceTrendPoint {
  branchId: string;
  weekStart: string;
  presentCount: number;
}

export interface MinistryCellsAnalyticsDto {
  totals: Record<string, number>;
  branchMetrics: BranchMetric[];
  attendanceTrend?: AttendanceTrendPoint[];
}

const PIE_COLORS = ['#1e3a5f', '#0f766e', '#b45309', '#64748b', '#7c3aed', '#be123c'];
const chartTick = { fontSize: 11, fill: '#64748b' };

function weekLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function pctChange(from: number, to: number) {
  if (from === 0) return to === 0 ? 0 : 100;
  return Math.round(((to - from) / from) * 1000) / 10;
}

function TrendBadge({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  /** When true, rising is bad (e.g. incidents) */
  invert?: boolean;
}) {
  const up = value > 0;
  const flat = value === 0;
  const positive = invert ? !up && !flat : up;
  const negative = invert ? up : !up && !flat;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          flat && 'bg-slate-100 text-slate-500',
          positive && 'bg-emerald-50 text-emerald-700',
          negative && 'bg-red-50 text-red-700',
        )}
      >
        {flat ? (
          <Minus className="h-4 w-4" />
        ) : up ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p
          className={cn(
            'font-heading text-sm font-bold tabular-nums',
            flat && 'text-slate-600',
            positive && 'text-emerald-700',
            negative && 'text-red-700',
          )}
        >
          {flat ? 'Stable' : `${value > 0 ? '+' : ''}${value}%`}
        </p>
      </div>
    </div>
  );
}

export function MinistryCellsAnalyticsPanel({
  branches,
  analyticsFrom,
  analyticsTo,
  filterBranchId,
  filterLocation,
  onAnalyticsFrom,
  onAnalyticsTo,
  onFilterBranchId,
  onFilterLocation,
  analytics,
  loading,
}: {
  branches: BranchRow[];
  analyticsFrom: string;
  analyticsTo: string;
  filterBranchId: string;
  filterLocation: string;
  onAnalyticsFrom: (v: string) => void;
  onAnalyticsTo: (v: string) => void;
  onFilterBranchId: (v: string) => void;
  onFilterLocation: (v: string) => void;
  analytics: MinistryCellsAnalyticsDto | undefined;
  loading: boolean;
}) {
  const { churchName } = useModuleAccess();
  const { matches: isDesktopLayout, ready: layoutReady } = useMediaQuery(MINISTRY_CELLS_DESKTOP_MQ);
  const useDesktopComparison = layoutReady && isDesktopLayout;
  const [emailBusy, setEmailBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [exportFormatsOpen, setExportFormatsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const thClass =
    'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground';

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewOpen]);

  useEffect(() => {
    if (!actionsOpen) {
      setExportFormatsOpen(false);
      return;
    }
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (target && !actionsMenuRef.current?.contains(target)) {
        setActionsOpen(false);
        setExportFormatsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (exportFormatsOpen) {
          setExportFormatsOpen(false);
          return;
        }
        setActionsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [actionsOpen, exportFormatsOpen]);

  const reportMeta = useMemo((): AnalyticsReportMeta => {
    const branchFilter =
      branches.find((b) => b.id === filterBranchId)?.name ??
      (filterBranchId ? 'Selected branch' : '');
    return {
      churchName: churchName?.trim() || 'Church',
      from: analyticsFrom,
      to: analyticsTo,
      branchFilter,
      locationFilter: filterLocation.trim(),
    };
  }, [
    analyticsFrom,
    analyticsTo,
    branches,
    churchName,
    filterBranchId,
    filterLocation,
  ]);

  const ensureAnalytics = () => {
    if (!analytics) {
      toast.error('Wait for analytics to load before exporting');
      return false;
    }
    return true;
  };

  const exportCsv = () => {
    if (!ensureAnalytics() || !analytics) return;
    downloadAnalyticsCsv(analytics, reportMeta);
    toast.success('CSV downloaded');
  };

  const exportPdf = () => {
    if (!ensureAnalytics() || !analytics) return;
    downloadAnalyticsPdf(analytics, reportMeta);
    toast.success('PDF downloaded');
  };

  const emailReport = async () => {
    if (!ensureAnalytics()) return;
    setEmailBusy(true);
    try {
      const res = await api.post<{ emailed: number; recipients?: { email: string }[] }>(
        '/ministry-cells/analytics/email-report',
        {
          from: analyticsFrom || undefined,
          to: analyticsTo || undefined,
          branchId: filterBranchId || undefined,
          location: filterLocation.trim() || undefined,
        },
      );
      const n = res.data?.emailed ?? 0;
      toast.success(
        n > 0
          ? `Analytics report emailed to ${n} recipient(s)`
          : 'Report built but no recipient email found',
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not email analytics report'));
    } finally {
      setEmailBusy(false);
    }
  };

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of analytics?.branchMetrics ?? []) map.set(m.branchId, m.name);
    return map;
  }, [analytics?.branchMetrics]);

  const pieData = useMemo(() => {
    const rows = (analytics?.branchMetrics ?? [])
      .map((m) => ({
        name: m.name.length > 16 ? `${m.name.slice(0, 14)}…` : m.name,
        value: Math.max(0, m.memberCount),
        fullName: m.name,
      }))
      .filter((r) => r.value > 0);
    if (rows.length) return rows;
    // Fallback: activity mix when membership is empty
    const t = analytics?.totals;
    if (!t) return [];
    return [
      { name: 'Reports', value: t.reports ?? 0, fullName: 'Reports' },
      { name: 'Incidents', value: t.incidents ?? 0, fullName: 'Incidents' },
      { name: 'Prayers', value: t.prayers ?? 0, fullName: 'Prayers' },
      { name: 'Messages', value: t.messages ?? 0, fullName: 'Messages' },
    ].filter((r) => r.value > 0);
  }, [analytics]);

  const lineData = useMemo(() => {
    const trend = analytics?.attendanceTrend ?? [];
    if (!trend.length) return [] as Array<Record<string, string | number>>;

    const byWeek = new Map<string, Record<string, string | number>>();
    for (const row of trend) {
      const key = typeof row.weekStart === 'string' ? row.weekStart.slice(0, 10) : String(row.weekStart);
      const entry = byWeek.get(key) ?? { week: key, label: weekLabel(key), total: 0 };
      const name = branchNameById.get(row.branchId) ?? 'Branch';
      const safe = name.replace(/[^\w\s-]/g, '').trim() || row.branchId.slice(0, 8);
      entry[safe] = (Number(entry[safe]) || 0) + row.presentCount;
      entry.total = Number(entry.total) + row.presentCount;
      byWeek.set(key, entry);
    }
    return Array.from(byWeek.values()).sort((a, b) =>
      String(a.week).localeCompare(String(b.week)),
    );
  }, [analytics?.attendanceTrend, branchNameById]);

  const lineSeriesKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of lineData) {
      for (const k of Object.keys(row)) {
        if (k !== 'week' && k !== 'label' && k !== 'total') keys.add(k);
      }
    }
    return Array.from(keys).slice(0, 6);
  }, [lineData]);

  const insights = useMemo(() => {
    const totals = lineData.map((r) => Number(r.total) || 0);
    let attendanceGrowth = 0;
    if (totals.length >= 2) {
      const mid = Math.floor(totals.length / 2);
      const first = totals.slice(0, mid);
      const second = totals.slice(mid);
      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
      attendanceGrowth = pctChange(avg(first), avg(second));
    }

    const metrics = analytics?.branchMetrics ?? [];
    const avgCompliance =
      metrics.length > 0
        ? metrics.reduce((s, m) => s + m.reportCompliance, 0) / metrics.length
        : 0;
    const incidentRate =
      metrics.length > 0
        ? metrics.reduce((s, m) => s + m.incidentCount, 0) / metrics.length
        : 0;
    const unassigned = metrics.filter((m) => !m.leader).length;
    const complianceGap = Math.round(100 - avgCompliance);

    return {
      attendanceGrowth,
      complianceGap,
      incidentRate: Math.round(incidentRate * 10) / 10,
      unassigned,
      peakWeek: lineData.reduce<{ label: string; total: number } | null>((best, row) => {
        const total = Number(row.total) || 0;
        if (!best || total > best.total) return { label: String(row.label), total };
        return best;
      }, null),
    };
  }, [analytics?.branchMetrics, lineData]);

  const pieMode =
    (analytics?.branchMetrics ?? []).some((m) => m.memberCount > 0)
      ? 'Members by branch'
      : 'Activity mix';

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-xl border border-border/70 bg-card px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-[70%] sm:grid-cols-2 xl:grid-cols-4">
            <DateField
              id="analytics-from"
              aria-label="From date"
              value={analyticsFrom}
              onChange={onAnalyticsFrom}
              max={analyticsTo || undefined}
              placeholder="From date"
            />
            <DateField
              id="analytics-to"
              aria-label="To date"
              value={analyticsTo}
              onChange={onAnalyticsTo}
              min={analyticsFrom || undefined}
              placeholder="To date"
            />
            <div className="min-w-0">
              <FormSelect
                id="filter-branch"
                aria-label="Branch"
                className="flex h-9 w-full min-w-0 appearance-none rounded-md border border-border bg-background bg-[length:1rem] bg-[position:right_0.75rem_center] bg-no-repeat px-3 pr-9 text-sm"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                }}
                value={filterBranchId}
                onChange={(e) => onFilterBranchId(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="min-w-0">
              <Input
                id="filter-location"
                aria-label="Location"
                className="h-9 w-full min-w-0"
                value={filterLocation}
                onChange={(e) => onFilterLocation(e.target.value)}
                placeholder="Filter by area"
              />
            </div>
          </div>

          <div className="relative shrink-0 self-end sm:self-center" ref={actionsMenuRef}>
            <Button
              type="button"
              size="sm"
              className="h-9"
              aria-expanded={actionsOpen}
              aria-haspopup="menu"
              disabled={!analytics || loading || emailBusy}
              onClick={() => {
                setActionsOpen((o) => {
                  if (o) setExportFormatsOpen(false);
                  return !o;
                });
              }}
            >
              {emailBusy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Actions
              <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-80" />
            </Button>
            {actionsOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-border bg-card p-1 text-foreground shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setActionsOpen(false);
                    setExportFormatsOpen(false);
                    if (!ensureAnalytics()) return;
                    setPreviewOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  Preview
                </button>
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={exportFormatsOpen}
                  aria-haspopup="menu"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setExportFormatsOpen((o) => !o)}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Export Report</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 opacity-70 transition-transform',
                      exportFormatsOpen && 'rotate-180',
                    )}
                  />
                </button>
                {exportFormatsOpen ? (
                  <div className="mb-0.5 ml-2 space-y-0.5 border-l border-border pl-2" role="group">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setActionsOpen(false);
                        setExportFormatsOpen(false);
                        exportCsv();
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4 shrink-0" />
                      CSV
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setActionsOpen(false);
                        setExportFormatsOpen(false);
                        exportPdf();
                      }}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      PDF
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  disabled={emailBusy}
                  onClick={() => {
                    setActionsOpen(false);
                    setExportFormatsOpen(false);
                    void emailReport();
                  }}
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  Send Report
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {portalReady &&
      previewOpen &&
      analytics
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
              onClick={() => setPreviewOpen(false)}
            >
              <div
                className="flex max-h-[min(94vh,40rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="analytics-report-preview-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <h2
                      id="analytics-report-preview-title"
                      className="text-base font-semibold"
                    >
                      Analytics report preview
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {reportMeta.churchName} · {reportMeta.from} → {reportMeta.to}
                      {(reportMeta.branchFilter || reportMeta.locationFilter) && (
                        <>
                          {' '}
                          · {[reportMeta.branchFilter, reportMeta.locationFilter]
                            .filter(Boolean)
                            .join(' · ')}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label="Close preview"
                    onClick={() => setPreviewOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {Object.entries(analytics.totals).map(([key, val]) => (
                      <span key={key}>
                        <span className="font-medium text-foreground">{val}</span> {key}
                      </span>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className={thClass}>Branch</th>
                          <th className={thClass}>Leader</th>
                          <th className={thClass}>Members</th>
                          <th className={thClass}>Avg att.</th>
                          <th className={thClass}>Compliance</th>
                          <th className={thClass}>Incidents</th>
                          <th className={thClass}>Prayers</th>
                          <th className={thClass}>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.branchMetrics.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-3 py-6 text-center text-muted-foreground"
                            >
                              No branches in this filter
                            </td>
                          </tr>
                        ) : (
                          analytics.branchMetrics.map((m) => (
                            <tr
                              key={m.branchId}
                              className="border-t border-border/70"
                            >
                              <td className="px-3 py-2 font-medium">{m.name}</td>
                              <td className="px-3 py-2">{m.leader ?? '—'}</td>
                              <td className="px-3 py-2 tabular-nums">{m.memberCount}</td>
                              <td className="px-3 py-2 tabular-nums">{m.avgAttendance}</td>
                              <td className="px-3 py-2 tabular-nums">
                                {m.reportCompliance}%
                              </td>
                              <td className="px-3 py-2 tabular-nums">{m.incidentCount}</td>
                              <td className="px-3 py-2 tabular-nums">{m.prayerCount}</td>
                              <td className="px-3 py-2">{m.location ?? '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
                  <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                    CSV
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={exportPdf}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={emailBusy}
                    onClick={() => void emailReport()}
                  >
                    {emailBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-1.5 h-4 w-4" />
                    )}
                    Email
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : analytics ? (
        <>
          {/* KPI strip — grid so expanded sidebar never clips the last metrics */}
          <div className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-slate-200 sm:grid-cols-3 xl:grid-cols-6">
            {Object.entries(analytics.totals).map(([key, val]) => (
              <div key={key} className="min-w-0 bg-card px-3 py-3">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {key}
                </p>
                <p className="font-heading text-xl font-bold tabular-nums text-slate-900">{val}</p>
              </div>
            ))}
          </div>

          {/* Growth / depreciation signals */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <TrendBadge label="Attendance trend" value={insights.attendanceGrowth} />
            <TrendBadge label="Compliance gap" value={insights.complianceGap} invert />
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                {insights.attendanceGrowth >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Peak week
                </p>
                <p className="truncate font-heading text-sm font-bold text-slate-900">
                  {insights.peakWeek
                    ? `${insights.peakWeek.label} · ${insights.peakWeek.total}`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-800">
                <Minus className="h-4 w-4" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Unassigned leaders
                </p>
                <p className="font-heading text-sm font-bold tabular-nums text-slate-900">
                  {insights.unassigned}
                </p>
              </div>
            </div>
          </div>

          {/* Branch comparison */}
          {layoutReady ? (
            useDesktopComparison ? (
              <Card className="shadow-sm">
                <CardHeader className="px-4 py-2.5 pb-0">
                  <CardTitle className="text-sm font-semibold">Branch comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-1">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className={thClass}>Branch</th>
                          <th className={thClass}>Leader</th>
                          <th className={cn(thClass, 'text-center')}>Members</th>
                          <th className={cn(thClass, 'text-center')}>Avg attendance</th>
                          <th className={cn(thClass, 'text-center')}>Report compliance</th>
                          <th className={cn(thClass, 'text-center')}>Incidents</th>
                          <th className={cn(thClass, 'text-center')}>Prayers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.branchMetrics.map((m) => (
                          <tr key={m.branchId} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2 font-medium">{m.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.leader ?? '—'}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{m.memberCount}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{m.avgAttendance}</td>
                            <td className="px-3 py-2 text-center tabular-nums">
                              {m.reportCompliance}%
                            </td>
                            <td className="px-3 py-2 text-center tabular-nums">{m.incidentCount}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{m.prayerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Branch comparison</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {analytics.branchMetrics.map((m) => (
                    <Card key={m.branchId} className="shadow-sm">
                      <CardContent className="space-y-1.5 px-3 py-2.5 text-sm">
                        <p className="font-heading font-semibold leading-tight">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.leader ?? 'No leader'}</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">Members </span>
                            {m.memberCount}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg attendance </span>
                            {m.avgAttendance}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Compliance </span>
                            {m.reportCompliance}%
                          </div>
                          <div>
                            <span className="text-muted-foreground">Incidents </span>
                            {m.incidentCount}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ) : null}

          {/* Charts */}
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <Card className="min-w-0 shadow-sm">
              <CardHeader className="px-4 py-3 pb-1">
                <CardTitle className="text-sm font-semibold">Distribution</CardTitle>
                <p className="text-[11px] text-muted-foreground">{pieMode}</p>
              </CardHeader>
              <CardContent className="h-[280px] px-2 pb-3 pt-0">
                {pieData.length === 0 ? (
                  <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    No distribution data for this filter range.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name} ${Math.round((percent ?? 0) * 100)}%`
                        }
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _n, item) => [
                          value,
                          (item?.payload as { fullName?: string })?.fullName ?? 'Value',
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 shadow-sm">
              <CardHeader className="px-4 py-3 pb-1">
                <CardTitle className="text-sm font-semibold">Attendance trend</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Weekly present count · filters applied
                </p>
              </CardHeader>
              <CardContent className="h-[280px] px-2 pb-3 pt-0">
                {lineData.length === 0 ? (
                  <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    No weekly attendance in this range. Record attendance to unlock trends.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={chartTick} />
                      <YAxis allowDecimals={false} tick={chartTick} width={32} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="All branches"
                        stroke="#1e3a5f"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      {lineSeriesKeys.length > 1
                        ? lineSeriesKeys.map((key, i) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              name={key}
                              stroke={PIE_COLORS[(i + 1) % PIE_COLORS.length]}
                              strokeWidth={1.5}
                              strokeDasharray="4 3"
                              dot={false}
                            />
                          ))
                        : null}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Adjust filters to load analytics for this church.
        </p>
      )}
    </div>
  );
}

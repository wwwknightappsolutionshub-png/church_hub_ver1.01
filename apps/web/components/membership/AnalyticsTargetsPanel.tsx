'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { AnalyticsEmptyState, AnalyticsPanel } from '@/components/membership/AnalyticsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export function AnalyticsTargetsPanel({
  dash,
  canEdit,
}: {
  dash: MembershipAnalyticsDashboardDto;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [retentionRate, setRetentionRate] = useState('');
  const [attendanceRate, setAttendanceRate] = useState('');
  const [outreachCompletionRate, setOutreachCompletionRate] = useState('');
  const [monthlyNewMembers, setMonthlyNewMembers] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRetentionRate(
      dash.targets.retentionRate == null ? '' : String(Math.round(dash.targets.retentionRate * 100)),
    );
    setAttendanceRate(
      dash.targets.attendanceRate == null
        ? ''
        : String(Math.round(dash.targets.attendanceRate * 100)),
    );
    setOutreachCompletionRate(
      dash.targets.outreachCompletionRate == null
        ? ''
        : String(Math.round(dash.targets.outreachCompletionRate * 100)),
    );
    setMonthlyNewMembers(
      dash.targets.monthlyNewMembers == null ? '' : String(dash.targets.monthlyNewMembers),
    );
  }, [dash.targets]);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const toRate = (raw: string) => {
        if (!raw.trim()) return null;
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return null;
        return Math.min(100, Math.max(0, n)) / 100;
      };
      await api.patch('/membership/analytics/targets', {
        retentionRate: toRate(retentionRate),
        attendanceRate: toRate(attendanceRate),
        outreachCompletionRate: toRate(outreachCompletionRate),
        monthlyNewMembers: monthlyNewMembers.trim()
          ? Math.max(0, Math.round(parseFloat(monthlyNewMembers) || 0))
          : null,
      });
      await qc.invalidateQueries({ queryKey: ['membership-analytics'] });
      await qc.invalidateQueries({ queryKey: ['membership-analytics-targets'] });
    } catch {
      setError('Could not save targets.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnalyticsPanel
      title="Targets & benchmarks"
      subtitle="Set leadership goals. Status compares the filtered dashboard against these targets."
      accent="gold"
      action={
        canEdit ? (
          <Button
            type="button"
            size="sm"
            data-testid="analytics-save-targets"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save targets'}
          </Button>
        ) : null
      }
    >
      {canEdit ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[11px]">Retention target %</Label>
            <Input
              className="h-9 text-xs"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={retentionRate}
              onChange={(e) => setRetentionRate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Attendance target %</Label>
            <Input
              className="h-9 text-xs"
              inputMode="decimal"
              placeholder="e.g. 70"
              value={attendanceRate}
              onChange={(e) => setAttendanceRate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Outreach completion %</Label>
            <Input
              className="h-9 text-xs"
              inputMode="decimal"
              placeholder="e.g. 40"
              value={outreachCompletionRate}
              onChange={(e) => setOutreachCompletionRate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Monthly new members</Label>
            <Input
              className="h-9 text-xs"
              inputMode="numeric"
              placeholder="e.g. 10"
              value={monthlyNewMembers}
              onChange={(e) => setMonthlyNewMembers(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}

      {dash.targetStatus.length === 0 ? (
        <AnalyticsEmptyState>No target status available.</AnalyticsEmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="analytics-target-status">
          {dash.targetStatus.map((t) => (
            <li key={t.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  Actual{' '}
                  {t.unit === 'rate' ? pct(t.actual) : t.actual.toLocaleString()}
                  {t.target != null
                    ? ` · Target ${t.unit === 'rate' ? pct(t.target) : t.target.toLocaleString()}`
                    : ' · No target set'}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  t.met === true && 'bg-emerald-100 text-emerald-800',
                  t.met === false && 'bg-amber-100 text-amber-900',
                  t.met == null && 'bg-slate-100 text-slate-600',
                )}
              >
                {t.met === true ? 'Met' : t.met === false ? 'Below' : 'Unset'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AnalyticsPanel>
  );
}

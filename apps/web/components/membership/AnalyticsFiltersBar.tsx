'use client';

import { useMemo } from 'react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useServiceUnitsList } from '@/lib/hooks/use-membership-hub';
import type { AnalyticsUiFilters } from '@/lib/membership-analytics-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnalyticsPanel } from '@/components/membership/AnalyticsPanel';

type ProvinceRow = { id: string; name: string };
type BranchRow = { id: string; name: string; provinceId?: string | null; province?: { id: string } | null };

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'VISITOR', label: 'Visitor' },
  { value: 'NEW_MEMBER', label: 'New member' },
  { value: 'ACTIVE_MEMBER', label: 'Active member' },
  { value: 'DISCIPLED', label: 'Discipled' },
];

const FOLLOW_UP_STAGES = [
  { value: 'all', label: 'All follow-up stages' },
  { value: 'NEW_LEAD', label: 'New lead' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'VISITED', label: 'Visited' },
  { value: 'ATTENDED', label: 'Attended' },
  { value: 'JOINED_GROUP', label: 'Joined group' },
  { value: 'ENLISTED_FOR_BAPTISM', label: 'Enlisted for baptism' },
];

const OUTREACH_STAGES = [
  { value: 'all', label: 'All outreach stages' },
  { value: 'CAPTURED', label: 'Captured' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'VISITED', label: 'Visited' },
  { value: 'READY_FOR_MEMBERSHIP', label: 'Ready for membership' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const AGE_BANDS = [
  { value: 'all', label: 'All ages' },
  { value: '0-12', label: '0–12' },
  { value: '13-17', label: '13–17' },
  { value: '18-29', label: '18–29' },
  { value: '30-49', label: '30–49' },
  { value: '50-64', label: '50–64' },
  { value: '65+', label: '65+' },
  { value: 'UNKNOWN', label: 'Unknown age' },
];

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground';

export function AnalyticsFiltersBar({
  draft,
  onChange,
  onApply,
  onReset,
}: {
  draft: AnalyticsUiFilters;
  onChange: (next: AnalyticsUiFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const { data: units } = useServiceUnitsList();
  const { data: provinces } = useApiQuery<ProvinceRow[]>(
    ['analytics-provinces'],
    '/ministry-cells/provinces',
  );
  const { data: branches } = useApiQuery<BranchRow[]>(
    ['analytics-branches'],
    '/ministry-cells/branches',
  );

  const filteredBranches = useMemo(() => {
    const all = branches ?? [];
    if (!draft.provinceId) return all;
    return all.filter(
      (b) => b.provinceId === draft.provinceId || b.province?.id === draft.provinceId,
    );
  }, [branches, draft.provinceId]);

  const set = <K extends keyof AnalyticsUiFilters>(key: K, value: AnalyticsUiFilters[K]) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <AnalyticsPanel
      title="Insight filters"
      subtitle="Refine growth, attendance, and pipeline views for leadership review. Press Apply to reload charts."
      accent="slate"
      collapsible
      defaultExpanded={false}
      collapseTestId="analytics-filters-toggle"
      action={
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button type="button" size="sm" data-testid="analytics-apply-filters" onClick={onApply}>
            Apply
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="analytics-date-from" className="text-[11px]">
            From
          </Label>
          <Input
            id="analytics-date-from"
            type="date"
            className="h-9 text-xs"
            value={draft.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-date-to" className="text-[11px]">
            To
          </Label>
          <Input
            id="analytics-date-to"
            type="date"
            className="h-9 text-xs"
            value={draft.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-months" className="text-[11px]">
            Preset months
          </Label>
          <select
            id="analytics-months"
            className={selectClass}
            value={draft.months}
            onChange={(e) => set('months', Number(e.target.value))}
          >
            {[3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} months
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={draft.compare}
              onChange={(e) => set('compare', e.target.checked)}
              data-testid="analytics-compare"
            />
            Compare to prior period
          </label>
        </div>

        <div className="space-y-1">
          <Label htmlFor="analytics-status" className="text-[11px]">
            Member status
          </Label>
          <select
            id="analytics-status"
            className={selectClass}
            value={draft.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-fu-stage" className="text-[11px]">
            Follow-up stage
          </Label>
          <select
            id="analytics-fu-stage"
            className={selectClass}
            value={draft.followUpStage}
            onChange={(e) => set('followUpStage', e.target.value)}
          >
            {FOLLOW_UP_STAGES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-out-stage" className="text-[11px]">
            Outreach stage
          </Label>
          <select
            id="analytics-out-stage"
            className={selectClass}
            value={draft.outreachStage}
            onChange={(e) => set('outreachStage', e.target.value)}
          >
            {OUTREACH_STAGES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-unit" className="text-[11px]">
            Department / unit
          </Label>
          <select
            id="analytics-unit"
            className={selectClass}
            value={draft.serviceUnitId}
            onChange={(e) => set('serviceUnitId', e.target.value)}
          >
            <option value="">All departments</option>
            {(units ?? []).map((u: { id: string; name: string }) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="analytics-province" className="text-[11px]">
            Province
          </Label>
          <select
            id="analytics-province"
            className={selectClass}
            value={draft.provinceId}
            onChange={(e) =>
              onChange({ ...draft, provinceId: e.target.value, branchId: '' })
            }
          >
            <option value="">All provinces</option>
            {(provinces ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-branch" className="text-[11px]">
            Cell / branch
          </Label>
          <select
            id="analytics-branch"
            className={selectClass}
            value={draft.branchId}
            onChange={(e) => set('branchId', e.target.value)}
          >
            <option value="">All cells</option>
            {filteredBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-service-type" className="text-[11px]">
            Service type
          </Label>
          <select
            id="analytics-service-type"
            className={selectClass}
            value={draft.serviceType}
            onChange={(e) => set('serviceType', e.target.value as AnalyticsUiFilters['serviceType'])}
            data-testid="analytics-service-type"
          >
            <option value="all">All services</option>
            <option value="sunday">Sunday</option>
            <option value="chop">CHOP</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-gender" className="text-[11px]">
            Gender
          </Label>
          <select
            id="analytics-gender"
            className={selectClass}
            value={draft.gender}
            onChange={(e) => set('gender', e.target.value)}
          >
            <option value="all">All genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-age" className="text-[11px]">
            Age band
          </Label>
          <select
            id="analytics-age"
            className={selectClass}
            value={draft.ageBand}
            onChange={(e) => set('ageBand', e.target.value)}
          >
            {AGE_BANDS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-family" className="text-[11px]">
            Family
          </Label>
          <select
            id="analytics-family"
            className={selectClass}
            value={draft.family}
            onChange={(e) => set('family', e.target.value as AnalyticsUiFilters['family'])}
          >
            <option value="all">All members</option>
            <option value="with_family">With family</option>
            <option value="no_family">No family link</option>
          </select>
        </div>
      </div>
    </AnalyticsPanel>
  );
}

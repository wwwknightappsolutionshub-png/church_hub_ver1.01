import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FOLLOW_UP_STAGES,
  PIPELINE_COLUMNS,
  STAGE_LABELS,
  formatDue,
} from '@/lib/follow-up';
import {
  enabledStages,
  phaseColumnsFromPipeline,
  stageLabelMap,
  type ResolvedPipeline,
} from '@/lib/pipeline-definition';
import type { FollowUpCard } from '@/components/follow-up/FollowUpPipeline';

export type FollowUpExportScope =
  | { kind: 'all' }
  | { kind: 'phase'; phaseId: string }
  | { kind: 'stage'; stage: string };

function phaseColumns(pipeline?: ResolvedPipeline | null) {
  const fromApi = phaseColumnsFromPipeline(pipeline);
  if (fromApi.length) return fromApi;
  return PIPELINE_COLUMNS.map((col) => ({
    id: col.id,
    step: col.step,
    title: col.title,
    stages: [...col.stages],
  }));
}

function labels(pipeline?: ResolvedPipeline | null): Record<string, string> {
  const fromApi = stageLabelMap(pipeline);
  return Object.keys(fromApi).length ? fromApi : STAGE_LABELS;
}

function stageKeys(pipeline?: ResolvedPipeline | null): string[] {
  const fromApi = enabledStages(pipeline).map((s) => s.key);
  return fromApi.length ? fromApi : [...FOLLOW_UP_STAGES];
}

function phaseTitle(phaseId: string, pipeline?: ResolvedPipeline | null): string {
  return phaseColumns(pipeline).find((c) => c.id === phaseId)?.title ?? phaseId;
}

function filterItems(
  items: FollowUpCard[],
  scope: FollowUpExportScope,
  pipeline?: ResolvedPipeline | null,
): FollowUpCard[] {
  if (scope.kind === 'all') return items;
  if (scope.kind === 'phase') {
    const col = phaseColumns(pipeline).find((c) => c.id === scope.phaseId);
    if (!col) return [];
    return items.filter((i) => col.stages.includes(i.stage));
  }
  return items.filter((i) => i.stage === scope.stage);
}

function scopeLabel(scope: FollowUpExportScope, pipeline?: ResolvedPipeline | null): string {
  if (scope.kind === 'all') return 'Full pipeline';
  if (scope.kind === 'phase') return phaseTitle(scope.phaseId, pipeline);
  return labels(pipeline)[scope.stage] ?? scope.stage;
}

function rowCells(item: FollowUpCard, pipeline?: ResolvedPipeline | null): string[] {
  const due = formatDue(item.dueAt);
  const assignee = item.assignedTo
    ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
    : '—';
  const labelMap = labels(pipeline);
  return [
    item.contactName,
    item.contactPhone ?? '—',
    item.contactEmail ?? '—',
    assignee,
    labelMap[item.stage] ?? item.stage,
    due ? `${due.overdue ? 'Overdue ' : ''}${due.label}` : '—',
    item.referredBy?.trim() || '—',
  ];
}

/** Client-side PDF export for membership pipeline contacts. */
export function exportFollowUpPdf(
  items: FollowUpCard[],
  scope: FollowUpExportScope = { kind: 'all' },
  pipeline?: ResolvedPipeline | null,
) {
  const filtered = filterItems(items, scope, pipeline);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const title = `Membership pipeline — ${scopeLabel(scope, pipeline)}`;
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()} · ${filtered.length} people`, 40, 52);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 64,
    head: [['Name', 'Phone', 'Email', 'Assignee', 'Stage', 'Due', 'Referred by']],
    body: filtered.map((item) => rowCells(item, pipeline)),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [49, 46, 129] },
    margin: { left: 40, right: 40 },
  });

  const slug = scopeLabel(scope, pipeline).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`membership-pipeline-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function buildFollowUpExportOptions(
  pipeline?: ResolvedPipeline | null,
): Array<{ label: string; scope: FollowUpExportScope }> {
  const phases = phaseColumns(pipeline);
  const keys = stageKeys(pipeline);
  const labelMap = labels(pipeline);
  return [
    { label: 'Full pipeline', scope: { kind: 'all' } },
    ...phases.map((col) => ({
      label: `Phase ${col.step}: ${col.title}`,
      scope: { kind: 'phase' as const, phaseId: col.id },
    })),
    ...keys.map((stage) => ({
      label: `Stage: ${labelMap[stage] ?? stage}`,
      scope: { kind: 'stage' as const, stage },
    })),
  ];
}

/** @deprecated Prefer buildFollowUpExportOptions(pipeline) */
export const FOLLOW_UP_EXPORT_OPTIONS = buildFollowUpExportOptions(null);

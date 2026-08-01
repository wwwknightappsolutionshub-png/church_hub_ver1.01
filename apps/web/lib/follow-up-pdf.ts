import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FOLLOW_UP_STAGES,
  PIPELINE_COLUMNS,
  STAGE_LABELS,
  formatDue,
} from '@/lib/follow-up';
import type { FollowUpCard } from '@/components/follow-up/FollowUpPipeline';

export type FollowUpExportScope =
  | { kind: 'all' }
  | { kind: 'phase'; phaseId: string }
  | { kind: 'stage'; stage: string };

function phaseTitle(phaseId: string): string {
  return PIPELINE_COLUMNS.find((c) => c.id === phaseId)?.title ?? phaseId;
}

function filterItems(items: FollowUpCard[], scope: FollowUpExportScope): FollowUpCard[] {
  if (scope.kind === 'all') return items;
  if (scope.kind === 'phase') {
    const col = PIPELINE_COLUMNS.find((c) => c.id === scope.phaseId);
    if (!col) return [];
    return items.filter((i) => (col.stages as readonly string[]).includes(i.stage));
  }
  return items.filter((i) => i.stage === scope.stage);
}

function scopeLabel(scope: FollowUpExportScope): string {
  if (scope.kind === 'all') return 'Full pipeline';
  if (scope.kind === 'phase') return phaseTitle(scope.phaseId);
  return STAGE_LABELS[scope.stage] ?? scope.stage;
}

function rowCells(item: FollowUpCard): string[] {
  const due = formatDue(item.dueAt);
  const assignee = item.assignedTo
    ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
    : '—';
  return [
    item.contactName,
    item.contactPhone ?? '—',
    item.contactEmail ?? '—',
    assignee,
    STAGE_LABELS[item.stage] ?? item.stage,
    due ? `${due.overdue ? 'Overdue ' : ''}${due.label}` : '—',
    item.referredBy?.trim() || '—',
  ];
}

/** Client-side PDF export for outreach pipeline leads. */
export function exportFollowUpPdf(items: FollowUpCard[], scope: FollowUpExportScope = { kind: 'all' }) {
  const filtered = filterItems(items, scope);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const title = `Outreach pipeline — ${scopeLabel(scope)}`;
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()} · ${filtered.length} people`, 40, 52);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 64,
    head: [['Name', 'Phone', 'Email', 'Assignee', 'Stage', 'Due', 'Referred by']],
    body: filtered.map(rowCells),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [49, 46, 129] },
    margin: { left: 40, right: 40 },
  });

  const slug = scopeLabel(scope).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`outreach-pipeline-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const FOLLOW_UP_EXPORT_OPTIONS: Array<{ label: string; scope: FollowUpExportScope }> = [
  { label: 'Full pipeline', scope: { kind: 'all' } },
  ...PIPELINE_COLUMNS.map((col) => ({
    label: `Phase ${col.step}: ${col.title}`,
    scope: { kind: 'phase' as const, phaseId: col.id },
  })),
  ...FOLLOW_UP_STAGES.map((stage) => ({
    label: `Stage: ${STAGE_LABELS[stage]}`,
    scope: { kind: 'stage' as const, stage },
  })),
];

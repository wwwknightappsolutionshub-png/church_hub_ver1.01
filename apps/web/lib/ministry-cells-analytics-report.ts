import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BranchMetric, MinistryCellsAnalyticsDto } from '@/components/ministry-cells/MinistryCellsAnalyticsPanel';

export type AnalyticsReportMeta = {
  churchName: string;
  from: string;
  to: string;
  branchFilter: string;
  locationFilter: string;
  generatedAt?: Date;
};

function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildAnalyticsCsv(
  analytics: MinistryCellsAnalyticsDto,
  meta: AnalyticsReportMeta,
): string {
  const lines: string[] = [
    'Ministry/Cells analytics report',
    `Church,${csvEscape(meta.churchName)}`,
    `From,${csvEscape(meta.from)}`,
    `To,${csvEscape(meta.to)}`,
    `Branch filter,${csvEscape(meta.branchFilter || 'All branches')}`,
    `Location filter,${csvEscape(meta.locationFilter || 'All locations')}`,
    `Generated,${csvEscape((meta.generatedAt ?? new Date()).toISOString())}`,
    '',
    'Totals',
    ...Object.entries(analytics.totals).map(
      ([k, v]) => `${csvEscape(k)},${csvEscape(v)}`,
    ),
    '',
    'Branch,Leader,Members,Avg attendance,Report compliance %,Incidents,Open incidents,Prayers,Messages,Location',
    ...analytics.branchMetrics.map((m) =>
      [
        m.name,
        m.leader ?? '',
        m.memberCount,
        m.avgAttendance,
        m.reportCompliance,
        m.incidentCount,
        m.openIncidents,
        m.prayerCount,
        m.messageCount,
        m.location ?? '',
      ]
        .map(csvEscape)
        .join(','),
    ),
  ];
  return lines.join('\n');
}

export function downloadAnalyticsCsv(
  analytics: MinistryCellsAnalyticsDto,
  meta: AnalyticsReportMeta,
) {
  const csv = buildAnalyticsCsv(analytics, meta);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ministry-cells-analytics-${meta.from}_to_${meta.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAnalyticsPdf(
  analytics: MinistryCellsAnalyticsDto,
  meta: AnalyticsReportMeta,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const generated = (meta.generatedAt ?? new Date()).toLocaleString();

  doc.setFontSize(14);
  doc.text('Ministry/Cells analytics report', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`${meta.churchName}`, 40, 52);
  doc.text(`Range: ${meta.from} → ${meta.to}`, 40, 66);
  doc.text(
    `Filters: ${meta.branchFilter || 'All branches'} · ${meta.locationFilter || 'All locations'}`,
    40,
    80,
  );
  doc.text(`Generated: ${generated}`, 40, 94);

  const totalsLine = Object.entries(analytics.totals)
    .map(([k, v]) => `${k}: ${v}`)
    .join('   ');
  doc.setTextColor(30);
  doc.text(totalsLine.slice(0, 140), 40, 114);

  autoTable(doc, {
    startY: 128,
    head: [
      [
        'Branch',
        'Leader',
        'Members',
        'Avg att.',
        'Compliance',
        'Incidents',
        'Prayers',
        'Messages',
        'Location',
      ],
    ],
    body: analytics.branchMetrics.map((m: BranchMetric) => [
      m.name,
      m.leader ?? '—',
      m.memberCount,
      m.avgAttendance,
      `${m.reportCompliance}%`,
      m.incidentCount,
      m.prayerCount,
      m.messageCount,
      m.location ?? '—',
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
  });

  doc.save(`ministry-cells-analytics-${meta.from}_to_${meta.to}.pdf`);
}

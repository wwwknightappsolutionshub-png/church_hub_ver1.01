/** Client-side CSV + printable PDF export for membership analytics (real payloads, not stubs). */

import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export function downloadAnalyticsCsv(dash: MembershipAnalyticsDashboardDto, filename?: string) {
  const lines: string[] = ['Section,Metric,Value'];
  const push = (section: string, metric: string, value: string | number) => {
    lines.push(`"${section.replace(/"/g, '""')}","${metric.replace(/"/g, '""')}",${value}`);
  };
  push('Summary', 'Total members', dash.summary.totalMembers);
  push('Summary', 'Active / discipled', dash.summary.activeMembers);
  push('Summary', 'Outreach contacts', dash.summary.outreachContacts);
  push('Summary', 'Follow-up completion', dash.summary.followUpCompletionRate);
  push('Summary', 'Attendance avg', dash.summary.averageAttendanceRate);
  if (dash.comparison) {
    push('Comparison', 'Delta members', dash.comparison.delta.totalMembers);
    push('Comparison', 'Delta outreach', dash.comparison.delta.outreachContacts);
  }
  for (const row of dash.growthTrends.memberGrowth) {
    push('Member growth', `${row.period} total`, row.total);
    push('Member growth', `${row.period} new`, row.newInPeriod);
  }
  for (const row of dash.followUpByStage) {
    push('Pipeline', row.stage, row.count);
  }
  for (const row of dash.demographics.byGender) {
    push('Gender', row.label, row.count);
  }
  for (const row of dash.demographics.byAgeBand) {
    push('Age', row.label, row.count);
  }
  for (const t of dash.targetStatus) {
    push('Target', t.label, `actual=${t.actual};target=${t.target ?? 'n/a'};met=${t.met}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ?? `membership-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function openAnalyticsReportPdf(dash: MembershipAnalyticsDashboardDto) {
  if (typeof window === 'undefined') return;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!w) throw new Error('Pop-up blocked — allow pop-ups to export PDF');

  const kpiRows = `
    <tr><td>Total members</td><td class="num">${dash.summary.totalMembers}</td></tr>
    <tr><td>Active / discipled</td><td class="num">${dash.summary.activeMembers}</td></tr>
    <tr><td>Outreach contacts</td><td class="num">${dash.summary.outreachContacts}</td></tr>
    <tr><td>Outreach completion</td><td class="num">${pct(dash.summary.followUpCompletionRate)}</td></tr>
    <tr><td>Attendance avg</td><td class="num">${pct(dash.summary.averageAttendanceRate)}</td></tr>
  `;

  const growthRows = dash.growthTrends.memberGrowth
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.period)}</td><td class="num">${r.total}</td><td class="num">${r.newInPeriod}</td></tr>`,
    )
    .join('');

  const pipelineRows = dash.followUpByStage
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.stage.replace(/_/g, ' '))}</td><td class="num">${r.count}</td></tr>`,
    )
    .join('');

  const targetRows = dash.targetStatus
    .map((t) => {
      const target =
        t.target == null ? '—' : t.unit === 'rate' ? pct(t.target) : String(t.target);
      const actual = t.unit === 'rate' ? pct(t.actual) : String(t.actual);
      const met = t.met == null ? '—' : t.met ? 'Met' : 'Below';
      return `<tr><td>${escapeHtml(t.label)}</td><td class="num">${actual}</td><td class="num">${target}</td><td>${met}</td></tr>`;
    })
    .join('');

  const generated = new Date().toLocaleString();
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Membership Analytics</title>
  <style>
    body { font-family: system-ui, Segoe UI, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .actions { margin-top: 24px; }
    @media print { .actions { display: none; } body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>Membership Analytics</h1>
  <p class="meta">Generated ${escapeHtml(generated)} · Period ${escapeHtml(
    dash.range.start.slice(0, 10),
  )} → ${escapeHtml(dash.range.end.slice(0, 10))}</p>
  <h2>KPI summary</h2>
  <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${kpiRows}</tbody></table>
  <h2>Member growth</h2>
  <table><thead><tr><th>Period</th><th>Total</th><th>New</th></tr></thead><tbody>${growthRows}</tbody></table>
  <h2>Outreach pipeline</h2>
  <table><thead><tr><th>Stage</th><th>Count</th></tr></thead><tbody>${pipelineRows}</tbody></table>
  <h2>Targets</h2>
  <table><thead><tr><th>KPI</th><th>Actual</th><th>Target</th><th>Status</th></tr></thead><tbody>${targetRows}</tbody></table>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <script>window.print();</script>
</body>
</html>`);
  w.document.close();
}

/** Open a printable HTML window so admins can Save as PDF / print attendance reports. */

export type AttendancePdfRow = {
  dateLabel: string;
  presentCount: number;
  maleCount: number;
  femaleCount: number;
  boysCount?: number;
  girlsCount?: number;
  testifiersCount: number;
  firstTimersCount: number;
  recordedAt?: string;
  recordedBy?: string;
};

export type AttendancePdfPayload = {
  title: string;
  subtitle?: string;
  kindLabel: string;
  rows: AttendancePdfRow[];
  /** When true, omit boys/girls columns (service units). */
  omitChildrenCols?: boolean;
  /** When false, open the report without auto-opening the print dialog. Default true. */
  autoPrint?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openAttendanceReportPdf(payload: AttendancePdfPayload) {
  if (typeof window === 'undefined') return;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) {
    throw new Error('Pop-up blocked — allow pop-ups to export PDF');
  }

  const showChildren = !payload.omitChildrenCols;
  const rowsHtml = payload.rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.dateLabel)}</td>
        <td class="num">${r.presentCount}</td>
        <td class="num">${r.maleCount}</td>
        <td class="num">${r.femaleCount}</td>
        ${showChildren ? `<td class="num">${r.boysCount ?? 0}</td><td class="num">${r.girlsCount ?? 0}</td>` : ''}
        <td class="num">${r.testifiersCount}</td>
        <td class="num">${r.firstTimersCount}</td>
        <td>${escapeHtml(r.recordedBy ?? '—')}</td>
      </tr>`,
    )
    .join('');

  const generated = new Date().toLocaleString();
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .actions { margin-top: 24px; }
    @media print {
      .actions { display: none; }
      body { margin: 12px; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(payload.title)}</h1>
  <p class="meta">
    ${escapeHtml(payload.kindLabel)}
    ${payload.subtitle ? ` · ${escapeHtml(payload.subtitle)}` : ''}
    · Generated ${escapeHtml(generated)}
  </p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Total</th>
        <th>Male</th>
        <th>Female</th>
        ${showChildren ? '<th>Boys</th><th>Girls</th>' : ''}
        <th>Testifiers</th>
        <th>First timers</th>
        <th>Recorded by</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8">No rows</td></tr>'}
    </tbody>
  </table>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${
    payload.autoPrint === false
      ? ''
      : '<script>window.onload = function () { setTimeout(function () { window.print(); }, 250); };</script>'
  }
</body>
</html>`);
  w.document.close();
}

/** Minimal RFC-style CSV parser (quoted fields, commas). */
export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const parsedLines = lines.map(parseCsvLine);
  const headers = parsedLines[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < parsedLines.length; i++) {
    const cells = parsedLines[i];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim();
    });
    const hasData = Object.values(row).some((v) => v.length > 0);
    if (hasData) rows.push(row);
  }
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

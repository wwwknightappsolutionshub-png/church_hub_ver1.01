import { CELEBRATION_ACCENT, CELEBRATION_BRAND } from './celebration-email-shell';

export function escapeMailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMailStamp(value: Date | string, timeZone = 'UTC'): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const zone = timeZone?.trim() || 'UTC';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date);
  }
}

export function formatMailAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);
}

export function mailParagraph(text: string): string {
  const safe = escapeMailHtml(text).replace(/\n/g, '<br/>');
  return `<p style="margin:0 0 14px;">${safe}</p>`;
}

export function mailKvTable(rows: Array<{ label: string; value: string }>): string {
  if (rows.length === 0) return '';
  const body = rows
    .map(
      (row) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;width:38%;color:#64748b;font-size:13px;vertical-align:top;">${escapeMailHtml(row.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#1a1a2e;font-size:14px;vertical-align:top;">${escapeMailHtml(row.value).replace(/\n/g, '<br/>')}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;overflow:hidden;">${body}</table>`;
}

export type MailCell = string | { html: string };

function renderMailCell(cell: MailCell): string {
  if (typeof cell === 'string') return escapeMailHtml(cell);
  return cell.html;
}

export function mailDataTable(headers: string[], rows: MailCell[][]): string {
  const head = headers
    .map(
      (header) =>
        `<th style="padding:10px 8px;border-bottom:1px solid #e2e8f0;background:#f8fafc;text-align:left;font-size:12px;color:#64748b;font-weight:600;">${escapeMailHtml(header)}</th>`,
    )
    .join('');
  const body =
    rows.length === 0
      ? `<tr><td colspan="${headers.length}" style="padding:12px;color:#64748b;">No rows</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${row
                .map(
                  (cell) =>
                    `<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1a1a2e;vertical-align:top;">${renderMailCell(cell)}</td>`,
                )
                .join('')}</tr>`,
          )
          .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid #e2e8f0;border-collapse:collapse;">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

/** Allow http(s) links in a table cell. Everything else is escaped text. */
export function mailLinkCell(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '—';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return escapeMailHtml(trimmed);
    return `<a href="${escapeMailHtml(parsed.href)}" style="color:${CELEBRATION_BRAND};">${escapeMailHtml(trimmed)}</a>`;
  } catch {
    return escapeMailHtml(trimmed);
  }
}

export function operationalEmailShell(params: {
  churchName: string;
  eyebrow: string;
  headline: string;
  subhead?: string;
  bodyHtml: string;
}): string {
  const churchName = escapeMailHtml(params.churchName.replace(/[<>]/g, '').trim() || 'Your church');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${CELEBRATION_BRAND};padding:28px 32px;text-align:left;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${CELEBRATION_ACCENT};font-family:system-ui,sans-serif;">${escapeMailHtml(params.eyebrow)}</p>
            <h1 style="margin:0;font-size:22px;font-weight:500;color:#ffffff;font-family:system-ui,sans-serif;">${escapeMailHtml(params.headline)}</h1>
            ${params.subhead ? `<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.88);font-family:system-ui,sans-serif;">${escapeMailHtml(params.subhead)}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;font-size:15px;line-height:1.6;">
            ${params.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#64748b;font-family:system-ui,sans-serif;border-top:3px solid ${CELEBRATION_ACCENT};">
            ${churchName}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Turn a plain "Label: value" report into a branded email. The plain text is unchanged. */
export function brandPlainUpdate(input: {
  churchName: string;
  eyebrow: string;
  headline: string;
  subhead?: string;
  plain: string;
  footerNote?: string;
}): string {
  const blocks: string[] = [];
  let pending: Array<{ label: string; value: string }> = [];
  const flush = () => {
    if (pending.length === 0) return;
    blocks.push(mailKvTable(pending));
    pending = [];
  };
  for (const rawLine of input.plain.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const splitAt = line.indexOf(': ');
    if (splitAt > 0 && splitAt < 60) {
      pending.push({ label: line.slice(0, splitAt), value: line.slice(splitAt + 2) });
      continue;
    }
    flush();
    blocks.push(
      line.endsWith(':')
        ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${CELEBRATION_BRAND};">${escapeMailHtml(line.replace(/:$/, ''))}</p>`
        : mailParagraph(line),
    );
  }
  flush();
  if (input.footerNote) {
    blocks.push(
      `<p style="margin:18px 0 0;font-size:13px;color:#64748b;">${escapeMailHtml(input.footerNote)}</p>`,
    );
  }
  return operationalEmailShell({
    churchName: input.churchName,
    eyebrow: input.eyebrow,
    headline: input.headline,
    subhead: input.subhead,
    bodyHtml: blocks.join(''),
  });
}

type ChurchLookup = {
  church?: {
    findFirst?: (args: {
      where: { id: string };
      select: { name: true; timezone: true };
    }) => Promise<{ name: string; timezone: string } | null>;
  };
};

export async function loadChurchMailBrand(
  prisma: ChurchLookup,
  churchId: string,
): Promise<{ name: string; timezone: string }> {
  const church = await prisma.church?.findFirst?.({
    where: { id: churchId },
    select: { name: true, timezone: true },
  });
  const name = (church?.name ?? 'Your church').replace(/[<>]/g, '').trim() || 'Your church';
  return { name, timezone: church?.timezone?.trim() || 'UTC' };
}

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

/**
 * A queue row with a specific person is for that person only.
 * serviceUnitId on the same row is context, not a licence to copy the message
 * to every member of the unit.
 */
export function expandsToServiceUnit(item: {
  serviceUnitId?: string | null;
  targetUserId?: string | null;
  targetMemberId?: string | null;
}): boolean {
  return Boolean(item.serviceUnitId) && !item.targetUserId && !item.targetMemberId;
}

/** Text that may leave the app (email plain part and WhatsApp). */
export function externalChannelBody(body: string, metadata: unknown): string {
  const external = metadataRecord(metadata).externalBody;
  if (typeof external === 'string' && external.trim()) return external.trim();
  if (/<[a-z][\s\S]*>/i.test(body)) {
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return body;
}

const UNSAFE_EMAIL_HTML = /<script|javascript:|onerror\s*=|onload\s*=/i;

/** Email uses metadata.emailHtml when present. In-app keeps the plain body. */
export function emailDeliveryParts(
  body: string,
  metadata: unknown,
): { text: string; html?: string } {
  const text = externalChannelBody(body, metadata);
  const emailHtmlRaw = metadataRecord(metadata).emailHtml;
  const emailHtml = typeof emailHtmlRaw === 'string' ? emailHtmlRaw.trim() : '';
  if (emailHtml.includes('<') && !UNSAFE_EMAIL_HTML.test(emailHtml)) {
    return { text, html: emailHtml };
  }
  if (!metadataRecord(metadata).externalBody && /<[a-z][\s\S]*>/i.test(body) && !UNSAFE_EMAIL_HTML.test(body)) {
    return { text, html: body };
  }
  return { text };
}

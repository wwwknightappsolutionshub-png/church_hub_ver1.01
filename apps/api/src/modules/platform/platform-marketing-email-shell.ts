/** Shared Church_Hub branded email chrome for platform marketing templates. */
export const MARKETING_BRAND = '#1e3a5f';
export const MARKETING_ACCENT = '#c9a227';
export const MARKETING_W365 = '#d97706';
export const MARKETING_SPIRIFY = '#7c3aed';

export function marketingEmailShell(params: {
  eyebrow: string;
  headline: string;
  subhead?: string;
  bodyHtml: string;
  accentColor?: string;
}): string {
  const accent = params.accentColor ?? MARKETING_ACCENT;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,95,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,${MARKETING_BRAND} 0%,#2d5a87 100%);padding:36px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${accent};font-family:system-ui,sans-serif;">${params.eyebrow}</p>
            <h1 style="margin:0;font-size:26px;font-weight:400;color:#ffffff;letter-spacing:-0.02em;">${params.headline}</h1>
            ${params.subhead ? `<p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.88);font-family:system-ui,sans-serif;">${params.subhead}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;font-size:15px;line-height:1.65;">
            ${params.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;font-family:system-ui,sans-serif;">
            Church_Hub · {{churchName}} · Premium add-ons
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function marketingCta(href: string, label: string, color = MARKETING_BRAND): string {
  return `<p style="text-align:center;margin:28px 0;">
  <a href="${href}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
</p>`;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRANDED_ANNIVERSARY_BODY = exports.BRANDED_BIRTHDAY_BODY = exports.CELEBRATION_ANNIVERSARY_ACCENT = exports.CELEBRATION_BIRTHDAY_ACCENT = exports.CELEBRATION_ACCENT = exports.CELEBRATION_BRAND = void 0;
exports.celebrationEmailShell = celebrationEmailShell;
exports.celebrationHighlightBox = celebrationHighlightBox;
/** Branded HTML shell for congregant celebration emails (birthday & anniversary). */
exports.CELEBRATION_BRAND = '#1e3a5f';
exports.CELEBRATION_ACCENT = '#c9a227';
exports.CELEBRATION_BIRTHDAY_ACCENT = '#d97706';
exports.CELEBRATION_ANNIVERSARY_ACCENT = '#7c3aed';
function celebrationEmailShell(params) {
    const accent = params.accentColor ?? exports.CELEBRATION_ACCENT;
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,95,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,${exports.CELEBRATION_BRAND} 0%,#2d5a87 100%);padding:36px 32px;text-align:center;">
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
            {{churchName}} · Celebrating with you
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
function celebrationHighlightBox(html, accent = exports.CELEBRATION_ACCENT) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-left:4px solid ${accent};border-radius:8px;">
    <tr><td style="padding:16px 20px;">${html}</td></tr>
  </table>`;
}
exports.BRANDED_BIRTHDAY_BODY = celebrationEmailShell({
    eyebrow: 'Celebration Emails',
    headline: 'Happy Birthday, {{firstName}}!',
    subhead: 'We are grateful for you in our church family',
    accentColor: exports.CELEBRATION_BIRTHDAY_ACCENT,
    bodyHtml: `${celebrationHighlightBox(`<p style="margin:0;font-size:18px;font-weight:600;color:${exports.CELEBRATION_BRAND};">Dear {{fullName}},</p>`, exports.CELEBRATION_BIRTHDAY_ACCENT)}
<p>On behalf of everyone at <strong>{{churchName}}</strong>, we wish you a joyful birthday filled with God&rsquo;s peace, favour, and blessing.</p>
<p>May this new year of life deepen your walk with Christ and surround you with love from your church family.</p>
<p style="margin-top:24px;color:#64748b;font-size:14px;">With love and prayers,<br/><strong>Your church family</strong></p>`,
});
exports.BRANDED_ANNIVERSARY_BODY = celebrationEmailShell({
    eyebrow: 'Celebration Emails',
    headline: 'Celebrating {{occasionName}}',
    subhead: '{{occasionDate}} · {{fullName}}',
    accentColor: exports.CELEBRATION_ANNIVERSARY_ACCENT,
    bodyHtml: `${celebrationHighlightBox(`<p style="margin:0;font-size:18px;font-weight:600;color:${exports.CELEBRATION_BRAND};">Dear {{fullName}},</p>
     <p style="margin:8px 0 0;font-size:14px;color:#64748b;">{{occasionName}} · {{occasionDate}}</p>`, exports.CELEBRATION_ANNIVERSARY_ACCENT)}
<p>We rejoice with you as <strong>{{churchName}}</strong> celebrates this special milestone.</p>
<p>May God continue to strengthen, bless, and guide you in the seasons ahead. We are honoured to walk alongside you.</p>
<p style="margin-top:24px;color:#64748b;font-size:14px;">With love and prayers,<br/><strong>Your church family</strong></p>`,
});

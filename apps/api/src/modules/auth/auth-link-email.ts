import {
  MARKETING_ACCENT,
  MARKETING_BRAND,
  marketingCta,
  marketingEmailShell,
} from '../platform/platform-marketing-email-shell';

export function buildAuthLinkEmail(params: {
  firstName: string;
  purpose: 'PASSWORD_RESET' | 'MAGIC_LOGIN';
  actionUrl: string;
  expiresMinutes: number;
}): { subject: string; text: string; html: string } {
  const isReset = params.purpose === 'PASSWORD_RESET';
  const subject = isReset
    ? 'Reset your Church_Hub password'
    : 'Your Church_Hub sign-in link';
  const headline = isReset ? 'Reset your password' : 'Sign in to Church_Hub';
  const ctaLabel = isReset ? 'Reset password' : 'Sign in now';
  const intro = isReset
    ? `Hi ${params.firstName}, we received a request to reset the password for your Church_Hub account.`
    : `Hi ${params.firstName}, use the secure link below to sign in to Church_Hub — no password needed.`;
  const expiryNote = `This link expires in ${params.expiresMinutes} minutes and can only be used once.`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">${intro}</p>
    ${marketingCta(params.actionUrl, ctaLabel, MARKETING_BRAND)}
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;">${expiryNote}</p>
    <p style="margin:0;font-size:13px;color:#64748b;">If you did not request this, you can safely ignore this email.</p>
    <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Or copy this link:<br/>${params.actionUrl}</p>
  `;

  const html = marketingEmailShell({
    eyebrow: 'Church_Hub',
    headline,
    subhead: expiryNote,
    bodyHtml,
    accentColor: MARKETING_ACCENT,
  }).replace('{{churchName}}', 'Account security');

  const text = [
    subject,
    '',
    intro,
    '',
    `${ctaLabel}: ${params.actionUrl}`,
    '',
    expiryNote,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  return { subject, text, html };
}

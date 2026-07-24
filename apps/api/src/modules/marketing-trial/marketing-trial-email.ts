import {
  MARKETING_ACCENT,
  MARKETING_BRAND,
  marketingCta,
  marketingEmailShell,
} from '../platform/platform-marketing-email-shell';

export function buildMarketingTrialWelcomeEmail(params: {
  firstName: string;
  loginUrl: string;
  temporaryPassword: string;
  expiresHours: number;
}): { subject: string; text: string; html: string } {
  const subject = 'Welcome to Church-Hub — your trial access link';
  const headline = 'Welcome to Church-Hub';
  const intro = `Hi ${params.firstName}, thank you for giving Church_Hub a chance. Use the secure link below to continue — then create your church workspace on the registration page.`;
  const expiryNote = `This one-time link expires in ${params.expiresHours} hours.`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">${intro}</p>
    ${marketingCta(params.loginUrl, 'Continue to Church-Hub', MARKETING_BRAND)}
    <p style="margin:16px 0 8px;font-size:14px;color:#334155;">
      <strong>Temporary password</strong> (enter this on the login page with your email):
    </p>
    <p style="margin:0 0 16px;font-family:ui-monospace,monospace;font-size:16px;letter-spacing:0.04em;color:#1e1b4b;background:#f1f5f9;padding:12px 14px;border-radius:8px;">
      ${params.temporaryPassword}
    </p>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;">${expiryNote}</p>
    <p style="margin:0;font-size:13px;color:#64748b;">
      After you verify access, you will set a <strong>new password</strong> on the registration form — do not reuse the temporary password.
    </p>
    <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Or copy this link:<br/>${params.loginUrl}</p>
  `;

  const html = marketingEmailShell({
    eyebrow: 'Church_Hub',
    headline,
    subhead: 'Ministry-first church management — start free',
    bodyHtml,
    accentColor: MARKETING_ACCENT,
  }).replace('{{churchName}}', 'Church_Hub');

  const text = [
    subject,
    '',
    intro,
    '',
    `Continue: ${params.loginUrl}`,
    '',
    `Temporary password: ${params.temporaryPassword}`,
    '',
    expiryNote,
    '',
    'After verifying, set a new password on the registration form — do not reuse the temporary password.',
  ].join('\n');

  return { subject, text, html };
}

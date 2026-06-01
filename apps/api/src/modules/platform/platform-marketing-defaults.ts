import { PLATFORM_UPSELL_TEMPLATE_DEFAULTS } from './platform-marketing-upsell-templates';
import { PLATFORM_FEATURE_TEMPLATE_DEFAULTS } from './platform-marketing-feature-templates';

const BRAND = '#1e3a5f';
const ACCENT = '#c9a227';

export const PLATFORM_MARKETING_TEMPLATE_DEFAULTS = [
  {
    slug: 'church-hub-welcome',
    name: 'Church_Hub — Welcome (new church staff)',
    category: 'WELCOME' as const,
    isDefault: true,
    description:
      'Sent when the SaaS owner provisions a new church with admin or pastor credentials.',
    subject: 'Welcome to Church_Hub — {{churchName}} ({{roleLabel}})',
    htmlBody: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,95,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND} 0%,#2d5a87 100%);padding:36px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${ACCENT};font-family:system-ui,sans-serif;">Church management, unified</p>
            <h1 style="margin:0;font-size:28px;font-weight:400;color:#ffffff;letter-spacing:-0.02em;">Church_Hub</h1>
            <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.85);font-family:system-ui,sans-serif;">One platform for your whole congregation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;font-size:15px;line-height:1.65;">
            <p style="margin:0 0 16px;">Hello,</p>
            <p style="margin:0 0 16px;">Welcome to <strong>Church_Hub</strong> for <strong>{{churchName}}</strong>. Your <strong>{{roleLabel}}</strong> account is ready — this is the operating system your church adopted to run ministry in one place instead of scattered apps.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND};font-weight:600;">Sign-in details</p>
                <p style="margin:0 0 6px;"><strong>Email:</strong> {{email}}</p>
                <p style="margin:0 0 6px;"><strong>Temporary password:</strong> {{tempPassword}}</p>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b;">You must change this password on first sign-in.</p>
              </td></tr>
            </table>

            <p style="text-align:center;margin:28px 0;">
              <a href="{{loginUrl}}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">Sign in to Church_Hub</a>
            </p>

            <h2 style="margin:32px 0 12px;font-size:18px;color:${BRAND};font-family:Georgia,serif;">Why Church_Hub?</h2>
            <ul style="margin:0;padding-left:20px;color:#334155;">
              <li style="margin-bottom:8px;"><strong>Lounge</strong> — community presence and connection between services.</li>
              <li style="margin-bottom:8px;"><strong>Prayer &amp; Testimony Hubs</strong> — corporate prayer and celebration, moderated for trust.</li>
              <li style="margin-bottom:8px;"><strong>Devotional Hub</strong> — assign plans, journals, groups, and weekly rhythms.</li>
              <li style="margin-bottom:8px;"><strong>Spirify</strong> — sermon archive with resume playback.</li>
              <li style="margin-bottom:8px;"><strong>Follow-Up &amp; Outreach</strong> — discipleship pipeline from first contact to cells.</li>
              <li style="margin-bottom:8px;"><strong>Service Unit Hub</strong> — every department rostered, scheduled, and accountable.</li>
              <li style="margin-bottom:8px;"><strong>Kingdom Konnect</strong> — verified business directory, jobs, and mentorship.</li>
              <li style="margin-bottom:8px;"><strong>Communication Hub</strong> — announcements, templates, and in-app reach.</li>
            </ul>

            <h2 style="margin:28px 0 12px;font-size:18px;color:${BRAND};font-family:Georgia,serif;">Modules enabled for {{churchName}}</h2>
            <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;">
              {{moduleListHtml}}
            </ul>

            <h2 style="margin:28px 0 12px;font-size:18px;color:${BRAND};font-family:Georgia,serif;">Recommended first steps</h2>
            <ol style="margin:0;padding-left:20px;color:#334155;">
              <li style="margin-bottom:6px;">Sign in and set a secure password.</li>
              <li style="margin-bottom:6px;">Open <strong>Overview</strong> to orient your leadership team.</li>
              <li style="margin-bottom:6px;">Confirm profiles in <strong>Membership</strong>.</li>
              <li style="margin-bottom:6px;">Publish your public site slug: <strong>{{churchSlug}}</strong></li>
              <li style="margin-bottom:6px;">Invite leaders via <strong>Church staff</strong> when ready.</li>
            </ol>

            <p style="margin:28px 0 0;font-size:13px;color:#64748b;">Questions? Reply to this email or contact your Church_Hub platform operator.</p>
            <p style="margin:16px 0 0;color:${BRAND};font-family:Georgia,serif;">Blessings,<br/><strong>The Church_Hub Platform Team</strong></p>
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;font-family:system-ui,sans-serif;">
            Church_Hub · Multi-tenant church management · {{churchName}}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    textBody: null as string | null,
  },
  {
    slug: 'church-hub-onboarding-reminder',
    name: 'Church_Hub — Onboarding reminder (day 3)',
    category: 'ONBOARDING' as const,
    isDefault: false,
    description: 'Nudge new church admins to finish setup after provision.',
    subject: 'Finish setting up {{churchName}} on Church_Hub',
    htmlBody: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#1a1a2e;padding:24px;">
<h1 style="color:${BRAND};">Almost there — {{churchName}}</h1>
<p>Your Church_Hub workspace is live. Leaders who complete these steps in the first week see stronger member adoption:</p>
<ol>
<li>Upload your church logo and hero on <strong>Church Landing</strong></li>
<li>Publish one announcement in <strong>Communication Hub</strong></li>
<li>Upload last Sunday's message to <strong>Spirify</strong></li>
<li>Create your first <strong>Devotional</strong> plan or use <strong>Sermon Note</strong></li>
</ol>
<p><a href="{{loginUrl}}" style="color:${ACCENT};">Continue setup →</a></p>
<p style="color:#64748b;font-size:13px;">Church_Hub Platform Team</p>
</body></html>`,
    textBody: null,
  },
  {
    slug: 'church-hub-feature-launch',
    name: 'Church_Hub — Feature spotlight',
    category: 'FEATURES' as const,
    isDefault: false,
    description: 'Announce a new module or capability to church leadership.',
    subject: 'New on Church_Hub: {{featureName}}',
    htmlBody: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:${BRAND};">What's new in Church_Hub</h1>
<p><strong>{{featureName}}</strong> is now available for {{churchName}}.</p>
<p>{{featureSummary}}</p>
<p><a href="{{loginUrl}}" style="background:${BRAND};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Open dashboard</a></p>
</body></html>`,
    textBody: null,
  },
  {
    slug: 'church-hub-reengagement',
    name: 'Church_Hub — Re-engagement',
    category: 'REENGAGEMENT' as const,
    isDefault: false,
    description: 'Win back inactive church admin accounts.',
    subject: 'Your Church_Hub workspace for {{churchName}} is waiting',
    htmlBody: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;padding:24px;">
<p>We noticed it's been a while since your team signed in to Church_Hub for <strong>{{churchName}}</strong>.</p>
<p>Members are still using Lounge, Prayer Hub, and Devotional Hub — your leadership dashboard has updates worth a quick look.</p>
<p><a href="{{loginUrl}}">Sign in now</a></p>
</body></html>`,
    textBody: null,
  },
  ...PLATFORM_UPSELL_TEMPLATE_DEFAULTS,
  ...PLATFORM_FEATURE_TEMPLATE_DEFAULTS,
];

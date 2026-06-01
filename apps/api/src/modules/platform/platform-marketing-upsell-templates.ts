import {
  marketingCta,
  marketingEmailShell,
  MARKETING_SPIRIFY,
  MARKETING_W365,
} from './platform-marketing-email-shell';

const login = '{{loginUrl}}';
const w365 = '{{wisdom365Url}}';
const spirify = '{{spirifyUrl}}';

export const PLATFORM_UPSELL_TEMPLATE_DEFAULTS = [
  {
    slug: 'upsell-premium-intro',
    name: 'Upsell — Premium add-ons intro (2h drip)',
    category: 'UPSELL' as const,
    isDefault: false,
    description:
      'First touch 2 hours after registration — introduces Wisdom365+ and Spirify premium add-ons.',
    subject: 'Grow {{churchName}} with Wisdom365+ & Spirify',
    htmlBody: marketingEmailShell({
      eyebrow: 'Church_Hub premium add-ons',
      headline: 'Two tools your congregation will love',
      subhead: 'Daily wisdom journeys + sermon archive — built for {{churchName}}',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">You recently joined <strong>Church_Hub</strong>. Beyond the core platform, two premium add-ons help you disciple members every day and keep Sunday's message alive all week.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr><td style="padding:20px;background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border-left:4px solid ${MARKETING_W365};">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MARKETING_W365};">Wisdom365+</p>
                <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">365-day life journeys</p>
                <p style="margin:0;font-size:14px;color:#475569;">Six audience-specific tracks — Business Owners, Students, Youths, Kids, Husbands &amp; Wives. Daily scripture, TTS audio, and life application with licensed annual access from {{wisdom365Price}}.</p>
              </td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr><td style="padding:20px;background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border-left:4px solid ${MARKETING_SPIRIFY};">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MARKETING_SPIRIFY};">Spirify</p>
                <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">Sermon archive &amp; resume playback</p>
                <p style="margin:0;font-size:14px;color:#475569;">Upload messages once — members replay, share clips, and stay connected to your preaching between services.</p>
              </td></tr>
            </table>

            ${marketingCta(w365, 'Explore Wisdom365+', MARKETING_W365)}
            ${marketingCta(spirify, 'Open Spirify', MARKETING_SPIRIFY)}

            <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Questions? Reply to this email or contact your Church_Hub operator.</p>`,
    }),
    textBody: null as string | null,
  },
  {
    slug: 'upsell-wisdom365-spotlight',
    name: 'Upsell — Wisdom365+ spotlight (3d drip)',
    category: 'UPSELL' as const,
    isDefault: false,
    description: 'Day 3 nudge — Wisdom365+ life journeys for every season of life.',
    subject: 'Wisdom365+ — daily wisdom for every member of {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Wisdom365+',
      headline: 'One verse. One voice. Every day.',
      subhead: 'Licensed life journeys for your whole congregation',
      accentColor: MARKETING_W365,
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;"><strong>Wisdom365+</strong> is Church_Hub's daily discipleship add-on — six curated 365-day journeys with variant-specific Bible text, 1st-person audio, and practical application.</p>
            <ul style="margin:0 0 20px;padding-left:20px;color:#334155;">
              <li style="margin-bottom:8px;"><strong>Business Owners</strong> — integrity &amp; stewardship in the marketplace</li>
              <li style="margin-bottom:8px;"><strong>Students &amp; Youths</strong> — focus and identity under pressure</li>
              <li style="margin-bottom:8px;"><strong>Kids</strong> — parent-managed, age-appropriate daily moments</li>
              <li style="margin-bottom:8px;"><strong>Husbands &amp; Wives</strong> — Christ-centred home leadership</li>
            </ul>
            <p style="margin:0 0 16px;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;font-size:14px;">
              <strong>From {{wisdom365Price}}/license per year</strong> · 20% off when you buy 2+ licenses
            </p>
            ${marketingCta(w365, 'Start Wisdom365+ checkout', MARKETING_W365)}
            <p style="margin:16px 0 0;font-size:13px;color:#64748b;">Already exploring Spirify? <a href="${spirify}" style="color:${MARKETING_SPIRIFY};">Upload your first sermon →</a></p>`,
    }),
    textBody: null,
  },
  {
    slug: 'upsell-spirify-spotlight',
    name: 'Upsell — Spirify spotlight (3d drip)',
    category: 'UPSELL' as const,
    isDefault: false,
    description: 'Day 3 nudge — Spirify sermon archive and member replay.',
    subject: 'Spirify — keep Sunday alive all week at {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Spirify',
      headline: 'Your sermon library, always on',
      subhead: 'Archive · replay · share — one upload, unlimited reach',
      accentColor: MARKETING_SPIRIFY,
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">Members forget 80% of a message by Wednesday unless they can replay it. <strong>Spirify</strong> turns your preaching into a searchable, resumable archive inside Church_Hub.</p>
            <ul style="margin:0 0 20px;padding-left:20px;color:#334155;">
              <li style="margin-bottom:8px;">Upload audio or video in minutes</li>
              <li style="margin-bottom:8px;">Members resume where they left off on any device</li>
              <li style="margin-bottom:8px;">Pair with <strong>Sermon Note</strong> for AI-assisted study guides</li>
              <li style="margin-bottom:8px;">Drive engagement through Communication Hub announcements</li>
            </ul>
            ${marketingCta(spirify, 'Open Spirify dashboard', MARKETING_SPIRIFY)}
            <p style="margin:16px 0 0;font-size:13px;color:#64748b;">Also consider <a href="${w365}" style="color:${MARKETING_W365};">Wisdom365+</a> for daily discipleship journeys.</p>`,
    }),
    textBody: null,
  },
  {
    slug: 'upsell-wisdom365-final',
    name: 'Upsell — Wisdom365+ final nudge (7d drip)',
    category: 'UPSELL' as const,
    isDefault: false,
    description: 'Day 7 last chance — Wisdom365+ if no subscription yet.',
    subject: 'Last call: Wisdom365+ for {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Wisdom365+ · Final reminder',
      headline: "Don't let daily discipleship wait",
      subhead: 'Your team set up Church_Hub — now give them a daily rhythm',
      accentColor: MARKETING_W365,
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">It's been a week since you joined Church_Hub. Leaders who add <strong>Wisdom365+</strong> report stronger mid-week engagement because members open the app for more than Sunday announcements.</p>
            <p style="margin:0 0 16px;">Purchase licenses, assign journeys to your team or family, and let the platform handle daily content, reminders, and progress tracking.</p>
            ${marketingCta(w365, 'Get Wisdom365+ licenses', MARKETING_W365)}
            <p style="margin:16px 0 0;font-size:13px;color:#64748b;">Not ready? You can enable this anytime from your dashboard.</p>`,
    }),
    textBody: null,
  },
  {
    slug: 'upsell-spirify-final',
    name: 'Upsell — Spirify final nudge (7d drip)',
    category: 'UPSELL' as const,
    isDefault: false,
    description: 'Day 7 last chance — Spirify if no sermons uploaded yet.',
    subject: 'Upload your first message to Spirify — {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Spirify · Final reminder',
      headline: 'One upload. A whole week of impact.',
      subhead: 'Members are waiting for your latest message',
      accentColor: MARKETING_SPIRIFY,
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">Churches using <strong>Spirify</strong> see members return to the app mid-week when last Sunday's sermon is one tap away.</p>
            <p style="margin:0 0 16px;">Upload takes less than five minutes. Start with your most recent message — members will find it under Spirify automatically.</p>
            ${marketingCta(spirify, 'Upload to Spirify now', MARKETING_SPIRIFY)}
            <p style="margin:16px 0 0;font-size:13px;color:#64748b;">Pair with <a href="${w365}" style="color:${MARKETING_W365};">Wisdom365+</a> for daily scripture journeys.</p>`,
    }),
    textBody: null,
  },
];

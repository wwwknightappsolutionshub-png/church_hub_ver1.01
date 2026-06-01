import { marketingCta, marketingEmailShell, MARKETING_BRAND } from './platform-marketing-email-shell';

/** Additional branded feature spotlight templates for the SaaS marketing module. */
export const PLATFORM_FEATURE_TEMPLATE_DEFAULTS = [
  {
    slug: 'church-hub-sermon-note-spotlight',
    name: 'Feature — Sermon Note AI study guides',
    category: 'FEATURES' as const,
    isDefault: false,
    description: 'Promote Sermon Note — AI-assisted study guides from audio or PDF.',
    subject: 'Sermon Note — turn every message into a study guide · {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Sermon Note',
      headline: 'From pulpit to personal study',
      subhead: 'AI-assisted guides your members can keep',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;"><strong>Sermon Note</strong> transforms uploaded audio or PDFs into structured study guides — key points, scripture references, and reflection questions members can journal through in Church_Hub.</p>
            <ul style="margin:0 0 20px;padding-left:20px;color:#334155;">
              <li style="margin-bottom:8px;">Upload once from the Sermon Note dashboard</li>
              <li style="margin-bottom:8px;">Publish when ready — members get in-app access</li>
              <li style="margin-bottom:8px;">Works alongside Spirify for replay + deep study</li>
            </ul>
            ${marketingCta('{{loginUrl}}', 'Open Sermon Note', MARKETING_BRAND)}`,
    }),
    textBody: null as string | null,
  },
  {
    slug: 'church-hub-devotional-hub-spotlight',
    name: 'Feature — Devotional Hub plans & groups',
    category: 'FEATURES' as const,
    isDefault: false,
    description: 'Promote Devotional Hub — plans, journals, groups, and meetups.',
    subject: 'Devotional Hub — assign a plan this week · {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Devotional Hub',
      headline: 'Rhythm beyond Sunday',
      subhead: 'Plans · journals · groups · meetups',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">The <strong>Devotional Hub</strong> lets you assign reading plans, track journals, run small groups, and schedule meetups — all inside Church_Hub.</p>
            ${marketingCta('{{loginUrl}}', 'Open Devotional Hub', MARKETING_BRAND)}`,
    }),
    textBody: null,
  },
  {
    slug: 'church-hub-communications-spotlight',
    name: 'Feature — Communication Hub reach',
    category: 'FEATURES' as const,
    isDefault: false,
    description: 'Promote Communication Hub — announcements, push, email, and templates.',
    subject: 'Reach every member — Communication Hub · {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Communication Hub',
      headline: 'Say it once. Reach everyone.',
      subhead: 'Announcements · in-app · email · scheduled sends',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">Publish pinned announcements, push in-app notifications, and queue email — with templates your team can reuse every week.</p>
            ${marketingCta('{{loginUrl}}', 'Open Communication Hub', MARKETING_BRAND)}`,
    }),
    textBody: null,
  },
  {
    slug: 'church-hub-kingdom-konnect-spotlight',
    name: 'Feature — Kingdom Konnect marketplace',
    category: 'FEATURES' as const,
    isDefault: false,
    description: 'Promote Kingdom Konnect — business directory, jobs, and mentorship.',
    subject: 'Kingdom Konnect — your congregation marketplace · {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Kingdom Konnect',
      headline: 'Business. Jobs. Mentorship.',
      subhead: 'A verified directory inside your church community',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;"><strong>Kingdom Konnect</strong> connects members through business profiles, job postings, and mentorship — stewarding marketplace relationships with pastoral oversight.</p>
            ${marketingCta('{{loginUrl}}', 'Explore Kingdom Konnect', MARKETING_BRAND)}`,
    }),
    textBody: null,
  },
  {
    slug: 'church-hub-service-units-spotlight',
    name: 'Feature — Service Unit Hub departments',
    category: 'FEATURES' as const,
    isDefault: false,
    description: 'Promote Service Unit Hub — rosters, schedules, and department tools.',
    subject: 'Service Unit Hub — every department organised · {{churchName}}',
    htmlBody: marketingEmailShell({
      eyebrow: 'Service Unit Hub',
      headline: 'Rostered. Scheduled. Accountable.',
      subhead: 'Medical · Media · Choir · Ushering · Youth · and more',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">Activate department modules under <strong>Service Unit Hub</strong> — attendance, assignments, inventory, and team messaging in one place.</p>
            ${marketingCta('{{loginUrl}}', 'Open Service Unit Hub', MARKETING_BRAND)}`,
    }),
    textBody: null,
  },
  {
    slug: 'church-hub-onboarding-week-one',
    name: 'Onboarding — Week one checklist (enhanced)',
    category: 'ONBOARDING' as const,
    isDefault: false,
    description: 'Enhanced week-one onboarding checklist for new church admins.',
    subject: 'Your first week on Church_Hub — {{churchName}} checklist',
    htmlBody: marketingEmailShell({
      eyebrow: 'Onboarding',
      headline: 'Your first-week checklist',
      subhead: 'Five steps leaders complete in their first 7 days',
      bodyHtml: `
            <p style="margin:0 0 16px;">Hello {{roleLabel}},</p>
            <p style="margin:0 0 16px;">Churches that complete this checklist in week one see the strongest member adoption:</p>
            <ol style="margin:0 0 20px;padding-left:20px;color:#334155;">
              <li style="margin-bottom:8px;">Brand your public site on <strong>Church Landing</strong> (slug: {{churchSlug}})</li>
              <li style="margin-bottom:8px;">Import or confirm members in <strong>Membership</strong></li>
              <li style="margin-bottom:8px;">Publish one announcement in <strong>Communication Hub</strong></li>
              <li style="margin-bottom:8px;">Upload last Sunday to <strong>Spirify</strong></li>
              <li style="margin-bottom:8px;">Explore premium add-ons: <strong>Wisdom365+</strong> &amp; <strong>Spirify</strong></li>
            </ol>
            ${marketingCta('{{loginUrl}}', 'Continue setup', MARKETING_BRAND)}`,
    }),
    textBody: null,
  },
];

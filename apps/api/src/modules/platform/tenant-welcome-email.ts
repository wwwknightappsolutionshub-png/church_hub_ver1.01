import {
  CHURCH_TENANT_MODULE_IDS,
  CHURCH_TENANT_MODULE_LABELS,
  type ChurchTenantModuleId,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';

const MODULE_GUIDE: Record<
  ChurchTenantModuleId,
  { summary: string; howTo: string }
> = {
  lounge: {
    summary: 'Member community hub — presence, quick links, and church-wide connection.',
    howTo: 'Open Lounge from the sidebar to see who is online and jump into Prayer Hub, Testimony Hub, and other modules.',
  },
  prayerHub: {
    summary: 'Corporate prayer board — share requests and pray for one another.',
    howTo: 'Post prayer needs from Prayer Hub; pastors/admins approve posts so the whole church can read and respond.',
  },
  testimonyHub: {
    summary: 'Celebrate what God is doing through shared testimonies.',
    howTo: 'Members submit testimonies; leadership approves them for the public board. Encourage stories after services and events.',
  },
  devotionalHub: {
    summary: 'Plans, journals, prayer lists, groups, and meetups for daily discipleship.',
    howTo: 'Assign devotional plans, create groups, and track engagement from Devotional Hub. Use reminders for consistency.',
  },
  wisdom365Plus: {
    summary: 'Licensed daily wisdom journeys — Business Owners, Students, Youths, Kids, Husbands, and Wives tracks.',
    howTo: 'Members subscribe annually, assign licenses to journeys, and receive daily scripture with reminders. Manage availability and content from Platform → Wisdom365+.',
  },
  outreach: {
    summary: 'Evangelism capture — offline-friendly contacts synced to Follow-Up.',
    howTo: 'Use Fast Capture on mobile; new contacts land in Follow-Up as New Lead with team alerts.',
  },
  youthHub: {
    summary: 'Youth feed, events, chat, prayer, Q&A, clips, and gamification.',
    howTo: 'Youth leaders moderate content, run events, and respond to help requests from Youth Hub tabs.',
  },
  kingdomKonnect: {
    summary: 'Verified business directory, marketplace, jobs, mentorship, and Idea Hub.',
    howTo: 'Members build business profiles; admins verify listings. Use Mentorship tab for mentor applications and mentee matching.',
  },
  spirify: {
    summary: 'Sermon and audio library for on-demand teaching.',
    howTo: 'Upload or link sermon audio in Spirify; members browse series and resume playback.',
  },
  followUp: {
    summary: 'Discipleship pipeline from outreach to cell groups.',
    howTo: 'Move cards across stages, assign leaders, log pastoral notes, and send template reminders from Follow-Up.',
  },
  serviceUnitHub: {
    summary: 'Ministry teams — rosters, meetings, join requests, and unit boards.',
    howTo: 'Create units, approve join requests, and run meetings. Unit admins manage leaders and summaries.',
  },
  myProfile: {
    summary: 'Member profile, service units, business info, community support, and messages.',
    howTo: 'Members update details under My Profile; link business and job-search requests for Kingdom Konnect.',
  },
  settings: {
    summary: 'Account photo, contact details, and preferences.',
    howTo: 'Each user can update their display name and avatar under Settings.',
  },
  staffOverview: {
    summary: 'Leadership dashboard — metrics and quick actions (church admin & pastor).',
    howTo: 'Open Overview for at-a-glance stats; use quick actions to reach Membership, Follow-Up, and Communications.',
  },
  churchLanding: {
    summary: 'Public church website — hero, events, giving, membership form (admin).',
    howTo: 'Church admins edit landing content, branding, and the public membership registration form.',
  },
  communitySupport: {
    summary: 'Job and business support requests with admin approval (admin).',
    howTo: 'Review submitted requests under Job requests; approve valid listings for the congregation.',
  },
  mentors: {
    summary: 'Mentor applications and mentor–mentee oversight (admin).',
    howTo: 'Approve mentor volunteers and monitor mentorship links from the Mentors admin page.',
  },
  membership: {
    summary: 'Member directory, families, onboarding, and CRUD (staff).',
    howTo: 'Add members, track status (Visitor → Discipled), and manage families from Membership.',
  },
  churchStaff: {
    summary: 'Invite and manage church staff accounts and roles (admin).',
    howTo: 'Church admins add pastors, leaders, and drivers with appropriate roles under Church staff.',
  },
  busMinistry: {
    summary: 'Routes, drivers, ride requests, and live tracking.',
    howTo: 'Configure routes and drivers; members request rides from Bus Ministry.',
  },
  communicationsHub: {
    summary: 'Announcements, email templates, Sportify sermons, and notifications (admin & pastor).',
    howTo: 'Publish announcements, manage templates, and open Sportify for sermon publishing.',
  },
  sermonNote: {
    summary: 'Turn Sunday teaching (audio, text, or PDF) into a weekly devotional for all members.',
    howTo: 'Pastors upload the message, process into a 7-day plan, then publish to Devotional Hub.',
  },
  ministryCells: {
    summary: 'Cell groups — branches, weekly reports, attendance, incidents, teaching manual, and leader messaging.',
    howTo: 'Admins create branches and assign one leader each. Leaders submit weekly reports and message pastors; pastors use Analytics for compliance and growth.',
  },
};

export function buildTenantWelcomeEmail(params: {
  churchName: string;
  churchSlug: string;
  roleLabel: 'Church Administrator' | 'Pastor';
  email: string;
  tempPassword: string;
  loginUrl: string;
  enabledModules: ChurchTenantModulesMap;
}): { subject: string; body: string } {
  const moduleSections = CHURCH_TENANT_MODULE_IDS.filter(
    (id) => params.enabledModules[id] !== false,
  )
    .map((id) => {
      const guide = MODULE_GUIDE[id];
      const label = CHURCH_TENANT_MODULE_LABELS[id];
      return `• ${label}\n  ${guide.summary}\n  How to use: ${guide.howTo}`;
    })
    .join('\n\n');

  const subject = `Welcome to Church_Hub — ${params.churchName} (${params.roleLabel})`;

  const body = `Hello,

Welcome to Church_Hub for ${params.churchName}. Your ${params.roleLabel} account is ready.

SIGN-IN DETAILS
Email: ${params.email}
Temporary password: ${params.tempPassword}

Important: You must change this password the first time you sign in. The app will prompt you before you can continue.

Sign in here: ${params.loginUrl}

YOUR ROLE
As ${params.roleLabel}, you have access to leadership tools for this church. Use the sidebar to move between modules. On mobile, tap "More" for the full list.

MODULES ENABLED FOR ${params.churchName.toUpperCase()}
The SaaS owner has turned on the following modules for your tenant. Each item below explains what it does and how to get started:

${moduleSections}

GETTING STARTED (RECOMMENDED STEPS)
1. Sign in with the temporary password above and set a new secure password.
2. Open Overview (staff dashboard) to orient yourself.
3. Visit Membership to confirm your profile and add key leaders.
4. Review Church landing and publish your public site slug: ${params.churchSlug}
5. Invite additional leaders via Church staff when ready.

Support: reply to this email or contact your Church_Hub platform operator if you need help.

Blessings,
Church_Hub Platform Team`;

  return { subject, body };
}

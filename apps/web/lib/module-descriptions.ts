/**
 * User-facing module hero descriptions — concrete scope, not marketing placeholders.
 */
export const MODULE_DESCRIPTIONS = {
  dashboard:
    'Church KPIs, operations pulse, celebrations, growth charts, attendance, ministry modules, and the church calendar — one leadership home.',
  admin:
    'Redirects to Dashboard — Admin Centre is merged into the main leadership home.',
  analytics:
    'Attendance trends, membership status mix, outreach pipeline, and follow-up conversion charts for leadership review.',
  automation:
    'Turn on absentee follow-up, birthday emails, weekly department reports, membership onboarding, and other scheduled workflows.',
  congregants:
    'Register households, edit member profiles, import CSV data, and run registry and celebration reports.',
  pastoralCare:
    'Open counseling cases, log session notes, escalate prayer needs, and track confidential pastoral follow-up.',
  communitySupport:
    'Approve or reject member job-search and business listings before they appear on the lounge and public site.',
  mentors:
    'Review mentor applications, approve volunteers, and track active mentor–mentee pairings.',
  churchLanding:
    'Edit your public church site — hero slides, service times, announcements, contact details, and membership form.',
  staff:
    'Create staff logins, assign ADMIN/PASTOR/LEADER/PROVINCIAL_LEADER roles, and send welcome emails with temporary passwords.',
  communications:
    'Send push notifications, edit email templates, read the message inbox, and manage sermon audio and video.',
  pastorReports:
    'Review department reports, weekly unit summaries, and pastoral alerts routed to you — reply from one inbox.',
  adminReports:
    'All church reports in one place — department submissions, failed email queue items, notifications, and direct messages.',
  business:
    'Verified member businesses, marketplace listings, job openings, networking events, mentorship, and idea submissions.',
  followUp:
    'Move visitors through Fresh Contact → Contacted → Visited → Attended → Joined Group, with assignments and reminders.',
  outreach:
    'Field capture, Team QR/NFC, offline sync, and convert pipeline — feeds new leads into Outreach.',
  serviceUnits:
    'Create ministry teams, approve membership requests, post schedules, and view unit attendance dashboards.',
  departments:
    'Department tools for choir, ushering, children, medical, prayer squad, and more — rosters, attendance, and reports.',
  profile:
    'Your member profile, service unit memberships, business listing, community requests, and inbox.',
  settings:
    'Change password, notification preferences, and how your profile appears across church modules.',
  bus:
    'Plan ride schedules, assign drivers and routes, track live trips, and broadcast transport emergencies.',
  prayerHub:
    'Submit prayer requests, mark items as prayed for, and leave encouraging notes for others in the church.',
  testimonyHub:
    'Share praise reports and testimonies; browse, react, and comment to build up the congregation.',
  suggestions:
    'Share feedback on church service, evangelism, membership, grievances, or other church matters so leadership can review and follow up.',
  devotionalHub:
    'Today’s reading, study plans, prayer lists, journals, small groups, challenges, reminders, and weekly review.',
  wisdom365:
    'Subscribe to premium daily devotional tracks with scripture, reflection prompts, and reading progress.',
  youth:
    'Youth groups, events, social feed, moderated chat, prayer wall, Q&A, gamification, and parent visibility tools.',
  sermonNotes:
    'Publish sermon summaries and a linked seven-day devotional plan for the congregation.',
  ministryCells:
    'Cell branches, weekly meeting reports, attendance, leader messaging, and pastoral compliance dashboards.',
  platform:
    'Create and configure church tenants, enable modules, and manage SaaS-wide settings.',
  platformAnalytics:
    'Tenant counts, premium module adoption, Spirify usage, and onboarding email performance.',
  platformWisdom365:
    'Manage Wisdom365+ variants, content library, subscription pricing, and church availability.',
  platformMarketing:
    'ChurchHub onboarding email templates — edit copy and layout with the WYSIWYG editor.',
  platformContent:
    'Edit Privacy, Terms, Cookie Policy, DPA, and custom legal pages with the WYSIWYG editor.',
  lounge:
    'See who is online in your church, send connection requests, and browse announcements and job openings.',
  communicationsSermons:
    'Browse sermon series, stream messages, and access the church media library.',
} as const;

export type ModuleDescriptionKey = keyof typeof MODULE_DESCRIPTIONS;

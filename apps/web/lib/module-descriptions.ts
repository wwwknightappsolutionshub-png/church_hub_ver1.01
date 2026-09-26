/**
 * Tenant-facing module hero descriptions — short, plain language for church staff.
 * Do not use feature inventories or implementation notes here.
 */
export const MODULE_DESCRIPTIONS = {
  dashboard: 'Here’s a snapshot of your church today.',
  admin: 'Church leadership home for day-to-day ministry oversight.',
  analytics: 'See how attendance, membership, and outreach are trending.',
  automation: 'Set reminders and scheduled messages so follow-up happens on time.',
  congregants: 'Add and update member records, households, and celebrations.',
  pastoralCare: 'Track counseling, prayer needs, and confidential pastoral care.',
  communitySupport: 'Review member job and business listings before they go public.',
  mentors: 'Approve mentors and keep mentoring relationships on track.',
  churchLanding: 'Edit the public page visitors see for your church.',
  staff: 'Invite staff and assign the right access for their role.',
  communications: 'Send announcements and manage sermons and message templates.',
  pastorReports: 'Read department reports and pastoral alerts in one place.',
  adminReports: 'Review church reports and delivery issues that need attention.',
  business: 'Member businesses, jobs, events, and kingdom networking.',
  followUp: 'Walk new contacts from first visit through to baptism and belonging.',
  outreach: 'Capture new contacts in the field and keep your outreach team in sync.',
  serviceUnits: 'Organise ministry teams, schedules, and unit attendance.',
  departments: 'Tools for choir, ushering, children, medical, prayer, and more.',
  profile: 'Update your details and see your units, listings, and messages.',
  settings: 'Password, notifications, and how your profile appears.',
  bus: 'Plan rides, assign drivers, and keep transport running smoothly.',
  prayerHub: 'Share prayer requests and encourage others in the church.',
  testimonyHub: 'Share praise reports and celebrate what God is doing.',
  suggestions: 'Send feedback so leadership can listen and follow up.',
  devotionalHub: 'Daily reading, plans, journals, and small-group devotion.',
  wisdom365: 'Premium daily devotion tracks with scripture and reflection.',
  youth: 'Groups, events, chat, and tools that keep youth ministry safe and active.',
  sermonNotes: 'Share sermon summaries and a week of follow-up readings.',
  ministryCells: 'Cell branches, weekly reports, and leader coordination.',
  platform: 'Manage church workspaces and platform-wide settings.',
  platformAnalytics: 'See adoption and performance across all churches.',
  platformWisdom365: 'Manage Wisdom365+ content, pricing, and availability.',
  platformMarketing: 'Edit onboarding emails your churches receive.',
  platformContent: 'Edit privacy, terms, and other legal pages.',
  lounge: 'Connect with people in your church and browse what’s happening.',
  communicationsSermons: 'Watch and listen to sermons from your church library.',
} as const;

export type ModuleDescriptionKey = keyof typeof MODULE_DESCRIPTIONS;

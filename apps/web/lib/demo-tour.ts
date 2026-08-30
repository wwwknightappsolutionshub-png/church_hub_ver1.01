import type { DashboardNavItem } from '@/lib/member-nav';
import { STAFF_LEADERSHIP_NAV, filterStaffNav } from '@/lib/member-nav';
import { TEST_LOGIN_PASSWORD } from '@/lib/auth-test-logins';

/** Session storage key — tour active on dashboard routes. */
export const DEMO_TOUR_STORAGE_KEY = 'churchhub.demoTourActive';
export const DEMO_TOUR_STEP_KEY = 'churchhub.demoTourStep';

export const DEMO_TOUR_EMAIL = 'admin@demo.church';
export const DEMO_TOUR_PASSWORD = TEST_LOGIN_PASSWORD;

export const DEMO_TOUR_QUERY = 'tour';

/** Timing aligned with ProductPreview cursor tour. */
export const TOUR_VIEW_HOLD_MS = 3800;
export const TOUR_CURSOR_TRAVEL_MS = 700;
export const TOUR_CLICK_MS = 220;

export type DemoTourIntroStep = 'register' | 'login';

export const DEMO_TOUR_INTRO_HOLD_MS = 4200;

const STEP_CAPTIONS: Record<string, string> = {
  '/dashboard':
    'Leadership dashboard — attendance trends, church calendar, and live activity in one view.',
  '/dashboard/follow-up':
    'Outreach pipeline — assign contacts, track discipleship stages, and automate follow-ups.',
  '/dashboard/ministry-cells':
    'Ministry & cells — branch structure, weekly attendance, and provincial roll-ups.',
  '/dashboard/membership/members':
    'Congregants — families, visitors, onboarding pipeline, and membership analytics.',
  '/dashboard/community-support':
    'Job requests — community support board for members seeking or offering help.',
  '/dashboard/mentors':
    'Mentorship — match mentors, track pairings, and pastoral development journeys.',
  '/dashboard/pastoral-care':
    'Pastoral care — confidential notes, visit tracking, and care team coordination.',
  '/dashboard/automation':
    'Automations — email templates, triggers, and workflow rules for your church.',
  '/dashboard/analytics':
    'Analytics — membership demographics, growth targets, and cross-module insights.',
  '/dashboard/admin-reports':
    'Admin reports — urgency inbox for prayer, testimony, and pastoral escalations.',
  '/dashboard/pastor-reports':
    'Pastor reports — leadership digest and congregation health signals.',
  '/dashboard/staff':
    'Church staff — roles, permissions, and team invitations.',
  '/dashboard/communications':
    'Communication Hub — broadcasts, segments, and corporate messaging.',
  '/dashboard/sermon-notes':
    'Sermon notes — publish notes and media for your congregation.',
  '/dashboard/church-landing':
    'Church landing — public microsite editor with live preview.',
  '/dashboard/support':
    'Support — help desk and platform assistance for church admins.',
  '/dashboard/profile':
    'Profile — your account, avatar, and personal preferences.',
  '/dashboard/settings':
    'Settings — church branding, modules, security, and integrations.',
};

export function tourCaptionForNav(item: DashboardNavItem): string {
  return STEP_CAPTIONS[item.href] ?? `Explore ${item.label} in the live demo workspace.`;
}

/** Static leadership nav for admin@demo.church (church admin, not pastor). */
export function buildDemoAdminLeadershipNav(): DashboardNavItem[] {
  return filterStaffNav(STAFF_LEADERSHIP_NAV, {
    canManageStaff: true,
    isChurchLeadership: true,
    isPastor: false,
    isChurchAdmin: true,
  });
}

export function isDemoTourActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DEMO_TOUR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function activateDemoTour(): void {
  try {
    sessionStorage.setItem(DEMO_TOUR_STORAGE_KEY, '1');
    sessionStorage.setItem(DEMO_TOUR_STEP_KEY, '0');
    localStorage.setItem('churchhub.desktopSidebarExpanded', '1');
  } catch {
    /* ignore */
  }
}

export function endDemoTour(): void {
  try {
    sessionStorage.removeItem(DEMO_TOUR_STORAGE_KEY);
    sessionStorage.removeItem(DEMO_TOUR_STEP_KEY);
  } catch {
    /* ignore */
  }
}

export function readDemoTourStep(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem(DEMO_TOUR_STEP_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function writeDemoTourStep(index: number): void {
  try {
    sessionStorage.setItem(DEMO_TOUR_STEP_KEY, String(index));
  } catch {
    /* ignore */
  }
}

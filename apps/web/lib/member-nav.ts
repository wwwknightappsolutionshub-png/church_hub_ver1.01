import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Coffee,
  Disc3,
  Heart,
  HandHeart,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Megaphone,
  Radio,
  ScrollText,
  Sunrise,
  Inbox,
  LayoutTemplate,
  Sparkles,
  Star,
  Network,
  Settings,
  Shield,
  Zap,
  UserCircle,
  UserCog,
  Users,
} from 'lucide-react';
import type { ChurchTenantModulesMap } from '@church-hub/shared-types';
import type { ModuleGateAccess, ModuleGateType } from '@/lib/module-gates';
import { filterNavByTenantModules } from '@/lib/tenant-modules';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Gated by membership — omitted from nav when user lacks access */
  gate?: ModuleGateType;
  requiresStaffManage?: boolean;
  /** Church ADMIN or PASTOR */
  requiresChurchLeadership?: boolean;
  /** PASTOR user role only (excludes church ADMIN-only users) */
  requiresPastor?: boolean;
  /** Church ADMIN user role only */
  requiresChurchAdmin?: boolean;
}

/** Open to all signed-in church users */
export const OPEN_MEMBER_NAV: DashboardNavItem[] = [
  { href: '/dashboard/lounge', label: 'Lounge', icon: Coffee, exact: false },
  { href: '/dashboard/prayer-hub', label: 'Prayer Hub', icon: Heart },
  { href: '/dashboard/testimony-hub', label: 'Testimony Hub', icon: Star },
  { href: '/dashboard/devotional-hub', label: 'Devotional Hub', icon: BookOpen },
  { href: '/dashboard/wisdom365', label: 'Wisdom365+', icon: Sunrise },
  { href: '/dashboard/outreach', label: 'Outreach', icon: Megaphone },
  { href: '/dashboard/youth', label: 'Youth Hub', icon: Sparkles },
  { href: '/dashboard/business', label: 'Kingdom Konnect', icon: Briefcase },
  { href: '/dashboard/spirify', label: 'Spirify', icon: Disc3 },
];

/** Membership determines access */
export const GATED_MEMBER_NAV: DashboardNavItem[] = [
  { href: '/dashboard/sermon-notes', label: 'Sermon Note', icon: ScrollText, gate: 'sermonNote' },
  { href: '/dashboard/follow-up', label: 'Follow-Up', icon: HeartHandshake, gate: 'followUp' },
  { href: '/dashboard/ministry-cells', label: 'Ministry/Cells', icon: Network, gate: 'ministryCells' },
  { href: '/dashboard/service-units', label: 'Service Unit Hub', icon: Layers, gate: 'serviceUnitHub' },
  { href: '/dashboard/departments', label: 'Departments', icon: Layers, gate: 'departmentTools' },
  { href: '/dashboard/profile', label: 'My Profile', icon: UserCircle, gate: 'profile' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export const MEMBER_NAV: DashboardNavItem[] = [...OPEN_MEMBER_NAV, ...GATED_MEMBER_NAV];

/** Admin & pastor — Section 1: Leadership */
export const STAFF_LEADERSHIP_NAV: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  {
    href: '/dashboard/admin',
    label: 'Admin Center',
    icon: Shield,
    requiresChurchLeadership: true,
  },
  { href: '/dashboard/membership', label: 'Membership', icon: Users },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
    requiresChurchLeadership: true,
  },
  {
    href: '/dashboard/automation',
    label: 'Automation',
    icon: Zap,
    requiresChurchLeadership: true,
  },
  { href: '/dashboard/follow-up', label: 'Follow-Up', icon: HeartHandshake },
  {
    href: '/dashboard/ministry-cells',
    label: 'Ministry/Cells',
    icon: Network,
    requiresChurchLeadership: true,
  },
  {
    href: '/dashboard/pastoral-care',
    label: 'Pastoral Care',
    icon: Heart,
    requiresPastor: true,
  },
  {
    href: '/dashboard/community-support',
    label: 'Job Request',
    icon: Briefcase,
    requiresChurchLeadership: true,
  },
  {
    href: '/dashboard/mentors',
    label: 'Mentors',
    icon: HandHeart,
    requiresChurchLeadership: true,
  },
  {
    href: '/dashboard/church-landing',
    label: 'Church Landing',
    icon: LayoutTemplate,
    requiresChurchLeadership: true,
  },
  { href: '/dashboard/staff', label: 'Church Staff', icon: UserCog, requiresStaffManage: true },
  { href: '/dashboard/communications', label: 'Communication Hub', icon: Radio },
  {
    href: '/dashboard/sermon-notes',
    label: 'Sermon Note',
    icon: ScrollText,
    requiresPastor: true,
  },
  {
    href: '/dashboard/admin-reports',
    label: 'Admin Reports',
    icon: Inbox,
    requiresChurchAdmin: true,
  },
  {
    href: '/dashboard/pastor-reports',
    label: 'Pastor Reports',
    icon: Radio,
    requiresPastor: true,
  },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

/** Admin & pastor — Section 2: Community */
export const STAFF_COMMUNITY_NAV: DashboardNavItem[] = [
  { href: '/dashboard/lounge', label: 'Lounge', icon: Coffee },
  { href: '/dashboard/prayer-hub', label: 'Prayer Hub', icon: Heart },
  { href: '/dashboard/testimony-hub', label: 'Testimony Hub', icon: Star },
  { href: '/dashboard/devotional-hub', label: 'Devotional Hub', icon: BookOpen },
  { href: '/dashboard/service-units', label: 'Service Unit Hub', icon: Layers },
  { href: '/dashboard/departments', label: 'Departments', icon: Layers },
  { href: '/dashboard/outreach', label: 'Outreach Hub', icon: Megaphone },
  { href: '/dashboard/follow-up', label: 'Follow Up', icon: HeartHandshake },
  { href: '/dashboard/business', label: 'Kingdom Konnect', icon: Briefcase },
  { href: '/dashboard/youth', label: 'Youth Hub', icon: Sparkles },
  { href: '/dashboard/spirify', label: 'Spirify', icon: Disc3 },
  {
    href: '/dashboard/sermon-notes',
    label: 'Sermon Note',
    icon: ScrollText,
    requiresPastor: true,
  },
];

export function filterStaffNav(
  items: DashboardNavItem[],
  opts: {
    canManageStaff: boolean;
    isChurchLeadership: boolean;
    isPastor: boolean;
    isChurchAdmin: boolean;
  },
  enabledModules?: ChurchTenantModulesMap,
) {
  const roleFiltered = items.filter((item) => {
    if (item.requiresChurchAdmin && !opts.isChurchAdmin) return false;
    if (item.requiresPastor && !opts.isPastor) return false;
    if (item.requiresChurchLeadership && !opts.isChurchLeadership) return false;
    if (item.requiresStaffManage && !opts.canManageStaff) return false;
    return true;
  });
  if (!enabledModules) return roleFiltered;
  return filterNavByTenantModules(roleFiltered, enabledModules);
}

export function buildVisibleStaffCommunityNav(enabledModules?: ChurchTenantModulesMap) {
  if (!enabledModules) return STAFF_COMMUNITY_NAV;
  return filterNavByTenantModules(STAFF_COMMUNITY_NAV, enabledModules);
}

export const MOBILE_TAB_HREFS = new Set([
  '/dashboard/lounge',
  '/dashboard/prayer-hub',
  '/dashboard/testimony-hub',
  '/dashboard/business',
]);

export function filterMemberNav(items: DashboardNavItem[], access: ModuleGateAccess) {
  return items.filter((item) => {
    if (!item.gate) return true;
    if (access.accessLoading) return false;
    switch (item.gate) {
      case 'followUp':
        return access.canAccessFollowUp;
      case 'serviceUnitHub':
        return access.canAccessServiceUnitHub;
      case 'profile':
        return access.canAccessMyProfile;
      case 'sermonNote':
        return access.canAccessSermonNote ?? false;
      case 'ministryCells':
        return access.canAccessMinistryCells ?? false;
      default:
        return true;
    }
  });
}

export function buildVisibleMemberNav(
  access: ModuleGateAccess,
  enabledModules?: ChurchTenantModulesMap,
) {
  const gated = filterMemberNav(MEMBER_NAV, access);
  if (!enabledModules) return gated;
  return filterNavByTenantModules(gated, enabledModules);
}

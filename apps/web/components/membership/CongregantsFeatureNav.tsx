'use client';

import { usePathname } from 'next/navigation';
import { BarChart3, FileText, FileUp, Home, Mail, MapPin, Users } from 'lucide-react';
import {
  CONGREGANTS_PRIMARY_NAV,
  CONGREGANTS_ROUTES,
} from '@/lib/membership/routes';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { SectionTabNav, type SectionTabItem } from '@/components/ui/section-tab-nav';

const NAV_ICONS = {
  [CONGREGANTS_ROUTES.members]: Users,
  [CONGREGANTS_ROUTES.families]: Home,
  [CONGREGANTS_ROUTES.familyMap]: MapPin,
  [CONGREGANTS_ROUTES.communications]: Mail,
  [CONGREGANTS_ROUTES.reports]: FileText,
} as const;

const DIRECTORY_HREFS = new Set<string>([
  CONGREGANTS_ROUTES.members,
  CONGREGANTS_ROUTES.families,
  CONGREGANTS_ROUTES.familyMap,
]);

function isActive(pathname: string, href: string) {
  const base = href.split('?')[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function CongregantsFeatureNav() {
  const pathname = usePathname();
  const { canViewMembershipDirectory, canManageMembers } = useMembershipAccess();
  const navItems = CONGREGANTS_PRIMARY_NAV.filter(
    ({ href }) => canViewMembershipDirectory || !DIRECTORY_HREFS.has(href),
  );

  const items: SectionTabItem[] = [
    ...(canManageMembers
      ? [
          {
            id: CONGREGANTS_ROUTES.import,
            label: 'Import CSV',
            shortLabel: 'Import',
            href: CONGREGANTS_ROUTES.import,
            icon: FileUp,
            testId: 'congregants-nav-import',
          } satisfies SectionTabItem,
        ]
      : []),
    ...navItems.map(({ href, label, testId }) => ({
      id: href,
      label,
      href,
      icon: NAV_ICONS[href as keyof typeof NAV_ICONS],
      testId,
    })),
    ...(canViewMembershipDirectory
      ? [
          {
            id: CONGREGANTS_ROUTES.executiveAnalytics,
            label: 'Executive Analytics',
            shortLabel: 'Analytics',
            href: CONGREGANTS_ROUTES.executiveAnalytics,
            icon: BarChart3,
            testId: 'congregants-nav-executive-analytics',
          } satisfies SectionTabItem,
        ]
      : []),
  ];

  const activeId =
    items.find((item) => item.href && isActive(pathname, item.href))?.id ?? items[0]?.id ?? '';

  return (
    <nav
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      aria-label="Congregants sections"
      data-testid="congregants-feature-nav"
    >
      <div className="w-full px-4 py-2 sm:px-6 md:px-8">
        <SectionTabNav
          items={items}
          activeId={activeId}
          ariaLabel="Congregants sections"
          size="sm"
          compactSelectBelow="sm"
          selectId="congregants-feature-nav-select"
        />
      </div>
    </nav>
  );
}

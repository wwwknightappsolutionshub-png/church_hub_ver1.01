'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileText, FileUp, Home, Mail, MapPin, Users } from 'lucide-react';
import {
  CONGREGANTS_PRIMARY_NAV,
  CONGREGANTS_ROUTES,
} from '@/lib/membership/routes';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { cn } from '@/lib/utils';

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

function navLinkClass(active: boolean) {
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold transition',
    active
      ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  );
}

export function CongregantsFeatureNav() {
  const pathname = usePathname();
  const { canViewMembershipDirectory, canManageMembers } = useMembershipAccess();
  const navItems = CONGREGANTS_PRIMARY_NAV.filter(
    ({ href }) => canViewMembershipDirectory || !DIRECTORY_HREFS.has(href),
  );
  const onExecutiveAnalytics = pathname === CONGREGANTS_ROUTES.executiveAnalytics;
  const onImport = pathname === CONGREGANTS_ROUTES.import;

  return (
    <nav
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      aria-label="Congregants sections"
      data-testid="congregants-feature-nav"
    >
      <div className="flex w-full gap-1 overflow-x-auto px-4 py-2 sm:px-6 md:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {canViewMembershipDirectory ? (
          <Link
            href={CONGREGANTS_ROUTES.executiveAnalytics}
            data-testid="congregants-nav-executive-analytics"
            className={navLinkClass(onExecutiveAnalytics)}
            aria-current={onExecutiveAnalytics ? 'page' : undefined}
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            Executive Analytics
          </Link>
        ) : null}
        {canManageMembers ? (
          <Link
            href={CONGREGANTS_ROUTES.import}
            data-testid="congregants-nav-import"
            className={navLinkClass(onImport)}
            aria-current={onImport ? 'page' : undefined}
          >
            <FileUp className="h-4 w-4" aria-hidden />
            Import CSV
          </Link>
        ) : null}
        {navItems.map(({ href, label, testId }) => {
          const Icon = NAV_ICONS[href as keyof typeof NAV_ICONS];
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              data-testid={testId}
              aria-current={active ? 'page' : undefined}
              className={navLinkClass(active)}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

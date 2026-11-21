'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Database,
  FileText,
  Mail,
  MessageSquare,
  Plug,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import {
  EnterpriseHero,
  EnterpriseShell,
} from '@/components/layout/EnterpriseModuleShell';
import { SectionTabNav } from '@/components/ui/section-tab-nav';
import { cn } from '@/lib/utils';

type PlatformNavItem = {
  href: string;
  label: string;
  icon: typeof Building2;
  permission?: string;
  exact?: boolean;
};

const PLATFORM_NAV: PlatformNavItem[] = [
  {
    href: '/dashboard/platform',
    label: 'Tenants',
    icon: Building2,
    permission: 'platform.tenants:read',
    exact: true,
  },
  {
    href: '/dashboard/platform/team',
    label: 'Team',
    icon: Users,
    permission: 'platform.team:read',
  },
  {
    href: '/dashboard/platform/inbox',
    label: 'Messaging',
    icon: MessageSquare,
    permission: 'platform.messaging:read',
  },
  {
    href: '/dashboard/platform/analytics',
    label: 'Analytics',
    icon: BarChart3,
    permission: 'platform.analytics:read',
  },
  {
    href: '/dashboard/platform/marketing',
    label: 'Marketing',
    icon: Mail,
    permission: 'platform.marketing:read',
  },
  {
    href: '/dashboard/platform/integrations',
    label: 'Integrations',
    icon: Plug,
    permission: 'platform.integrations:read',
  },
  {
    href: '/dashboard/platform/content',
    label: 'Legal & CMS',
    icon: FileText,
    permission: 'platform.content:read',
  },
  {
    href: '/dashboard/platform/privacy',
    label: 'Privacy',
    icon: Shield,
    permission: 'platform.privacy:read',
  },
  {
    href: '/dashboard/platform/backups',
    label: 'Backups',
    icon: Database,
    permission: 'platform.backups:read',
  },
  {
    href: '/dashboard/platform/wisdom365',
    label: 'Wisdom365+',
    icon: Sparkles,
    permission: 'platform.wisdom365:read',
  },
];

export function PlatformConsoleShell({
  title,
  description,
  actions,
  children,
  contentClassName,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const { hasPlatformPermission, isPlatformAdmin } = useModuleAccess();

  const nav = PLATFORM_NAV.filter(
    (item) =>
      isPlatformAdmin ||
      !item.permission ||
      hasPlatformPermission(item.permission),
  );

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Church Hub"
        title={title}
        description={description}
        actions={actions}
      />
      <nav
        className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur xl:top-16 dark:border-slate-800 dark:bg-slate-950/95"
        aria-label="Platform sections"
      >
        <div className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6 md:px-8">
          <SectionTabNav
            items={nav.map((item) => ({
              id: item.href,
              label: item.label,
              href: item.href,
              icon: item.icon,
            }))}
            activeId={
              nav.find((item) =>
                item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`),
              )?.href ?? nav[0]?.href ?? ''
            }
            ariaLabel="Platform sections"
            size="sm"
            compactSelectBelow="sm"
            selectId="platform-console-nav-select"
          />
        </div>
      </nav>
      <div
        className={cn(
          'mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 md:px-8',
          contentClassName,
        )}
      >
        {children}
      </div>
    </EnterpriseShell>
  );
}

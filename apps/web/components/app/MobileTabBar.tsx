'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { MEMBER_NAV, MOBILE_TAB_HREFS, OPEN_MEMBER_NAV } from '@/lib/member-nav';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  onMoreOpen: () => void;
}

export function MobileTabBar({ onMoreOpen }: MobileTabBarProps) {
  const pathname = usePathname();

  const tabItems = OPEN_MEMBER_NAV.filter((item) => MOBILE_TAB_HREFS.has(item.href));

  const moreActive = MEMBER_NAV.some(
    (item) =>
      !MOBILE_TAB_HREFS.has(item.href) &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

  return (
    <nav
      className="app-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-xl xl:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {tabItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const short =
            item.label === 'Kingdom Konnect' ? 'Konnect' : item.label.split(' ')[0];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'scale-110')} strokeWidth={active ? 2.5 : 2} />
              <span className="max-w-full truncate text-[10px] font-medium">{short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMoreOpen}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition',
            moreActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <LayoutGrid className={cn('h-5 w-5', moreActive && 'scale-110')} strokeWidth={moreActive ? 2.5 : 2} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}

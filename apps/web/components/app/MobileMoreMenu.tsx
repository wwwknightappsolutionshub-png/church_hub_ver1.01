'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, X } from 'lucide-react';
import { LogoutButton } from '@/components/app/LogoutButton';
import { MOBILE_TAB_HREFS, type DashboardNavItem } from '@/lib/member-nav';
import { cn } from '@/lib/utils';

interface MobileMoreMenuProps {
  open: boolean;
  onClose: () => void;
  memberNav: DashboardNavItem[];
  allMemberNav: DashboardNavItem[];
  staffNav: DashboardNavItem[];
  staffCommunityNav: DashboardNavItem[];
  isChurchStaff: boolean;
}

export function MobileMoreMenu({
  open,
  onClose,
  memberNav,
  allMemberNav,
  staffNav,
  staffCommunityNav,
  isChurchStaff,
}: MobileMoreMenuProps) {
  const pathname = usePathname();

  if (!open) return null;

  const moreMember = allMemberNav.filter((item) => !MOBILE_TAB_HREFS.has(item.href));
  const allowedHrefs = new Set(memberNav.map((m) => m.href));

  return (
    <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="More modules">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="app-more-sheet absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,720px)] flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">All modules</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {isChurchStaff && staffNav.length > 0 && (
            <>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Leadership
              </p>
              <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {staffNav.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/50 text-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {isChurchStaff ? (
            staffCommunityNav.length > 0 && (
              <>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Community
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {staffCommunityNav.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/50 text-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {moreMember.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const locked = !allowedHrefs.has(item.href);
                const className = cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition',
                  locked && 'opacity-50',
                  active && !locked
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 text-foreground hover:bg-muted',
                );
                if (locked) {
                  return (
                    <div key={item.href} className={className} title="Membership required">
                      <Lock className="h-4 w-4 shrink-0" />
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                    </div>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} className={className}>
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <LogoutButton variant="menu" />
          </div>
        </div>
      </div>
    </div>
  );
}

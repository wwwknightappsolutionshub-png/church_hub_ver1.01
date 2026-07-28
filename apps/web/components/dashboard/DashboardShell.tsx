'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import {
  MEMBER_NAV,
  STAFF_LEADERSHIP_NAV,
  STAFF_COMMUNITY_NAV,
  buildVisibleMemberNav,
  filterStaffNav,
  type DashboardNavItem,
} from '@/lib/member-nav';
import { isChurchAdminRole, isPastorRole } from '@/lib/session-role';
import { getAppRouteTitle, hasModulePageChrome } from '@/lib/app-route-meta';
import { memberInitials } from '@/lib/member-initials';
import { accountAvatarUrl, userDisplayName } from '@/lib/user-display';
import { UserAvatar } from '@/components/app/UserAvatar';
import { LogoutButton } from '@/components/app/LogoutButton';
import { NotificationBell } from '@/components/app/NotificationBell';
import { MobileTabBar } from '@/components/app/MobileTabBar';
import { MobileMoreMenu } from '@/components/app/MobileMoreMenu';
import {
  Building2,
  BarChart3,
  ChevronDown,
  Mail,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SkipToMain } from '@/components/accessibility/SkipToMain';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModuleChromeProvider, useModuleChrome } from '@/components/layout/ModuleChromeContext';

const platformNavAll: (DashboardNavItem & { permission?: string })[] = [
  { href: '/dashboard/platform', label: 'Tenants', icon: Building2, exact: true, permission: 'platform.tenants:read' },
  { href: '/dashboard/platform/team', label: 'Team', icon: Users, exact: false, permission: 'platform.team:read' },
  { href: '/dashboard/platform/inbox', label: 'Messaging', icon: MessageSquare, exact: false, permission: 'platform.messaging:read' },
  { href: '/dashboard/platform/analytics', label: 'Analytics', icon: BarChart3, exact: false, permission: 'platform.analytics:read' },
  { href: '/dashboard/platform/marketing', label: 'Marketing', icon: Mail, exact: false, permission: 'platform.marketing:read' },
  { href: '/dashboard/platform/wisdom365', label: 'Wisdom365+', icon: Sparkles, exact: false, permission: 'platform.wisdom365:read' },
];

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: DashboardNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon, exact } = item;
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-muted text-sidebar-foreground ring-1 ring-white/15'
          : 'text-sidebar-foreground/90 hover:bg-sidebar-muted/70 hover:text-sidebar-foreground',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-secondary' : 'text-sidebar-foreground/80')}
        aria-hidden
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}

function DesktopSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const {
    canAccessFollowUp,
    canAccessServiceUnitHub,
    canAccessDepartmentTools,
    canAccessMyProfile,
    canAccessSermonNote,
    canAccessMinistryCells,
    canManageStaff,
    userRoles,
    isPlatformOperator,
    hasPlatformPermission,
    isChurchStaff,
    churchName,
    user,
    member,
    enabledModules,
    isLoading: accessLoading,
  } = useModuleAccess();

  const platformNav = useMemo(
    () =>
      platformNavAll.filter(
        (item) => !item.permission || hasPlatformPermission(item.permission),
      ),
    [hasPlatformPermission],
  );

  const memberNav = useMemo(
    () =>
      buildVisibleMemberNav(
        {
          canAccessFollowUp,
          canAccessServiceUnitHub,
          canAccessDepartmentTools,
          canAccessMyProfile,
          canAccessSermonNote,
          canAccessMinistryCells,
          accessLoading,
        },
        enabledModules,
      ),
    [
      canAccessFollowUp,
      canAccessServiceUnitHub,
      canAccessDepartmentTools,
      canAccessMyProfile,
      canAccessSermonNote,
      canAccessMinistryCells,
      accessLoading,
      enabledModules,
    ],
  );
  const isChurchLeadership =
    isChurchAdminRole(userRoles) || isPastorRole(userRoles) || isChurchStaff;
  const isPastor = isPastorRole(userRoles);
  const isChurchAdmin = isChurchAdminRole(userRoles);
  /** Pastors and church admins start with Community collapsed; they can expand it. */
  const [communityOpen, setCommunityOpen] = useState(false);

  useEffect(() => {
    if (accessLoading) return;
    setCommunityOpen(!(isPastor || isChurchAdmin));
  }, [accessLoading, isPastor, isChurchAdmin]);

  const staffNav = useMemo(
    () =>
      filterStaffNav(
        STAFF_LEADERSHIP_NAV,
        {
          canManageStaff,
          isChurchLeadership,
          isPastor,
          isChurchAdmin,
        },
        enabledModules,
      ),
    [canManageStaff, isChurchLeadership, isPastor, isChurchAdmin, enabledModules],
  );
  const staffCommunityNav = useMemo(
    () =>
      filterStaffNav(
        STAFF_COMMUNITY_NAV,
        {
          canManageStaff,
          isChurchLeadership,
          isPastor,
          isChurchAdmin,
          canAccessDepartmentTools,
        },
        enabledModules,
      ),
    [
      canManageStaff,
      isChurchLeadership,
      isPastor,
      isChurchAdmin,
      canAccessDepartmentTools,
      enabledModules,
    ],
  );
  const homeHref = isPlatformOperator
    ? '/dashboard/platform'
    : isChurchStaff
      ? '/dashboard'
      : '/dashboard/lounge';

  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-muted px-5">
        <Link href={homeHref} onClick={onNavigate}>
          <BrandMark variant="light" />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {isPlatformOperator ? (
          platformNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))
        ) : isChurchStaff ? (
          <>
            {staffNav.length > 0 && (
              <>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  Leadership
                </p>
                {staffNav.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </>
            )}
            {staffCommunityNav.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setCommunityOpen((o) => !o)}
                  className="mb-2 flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                  aria-expanded={communityOpen}
                >
                  <span>Community</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform',
                      communityOpen ? 'rotate-0' : '-rotate-90',
                    )}
                    aria-hidden
                  />
                </button>
                {communityOpen
                  ? staffCommunityNav.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        onNavigate={onNavigate}
                      />
                    ))
                  : null}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Community
            </p>
            {memberNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>
      {!isPlatformOperator && (user || member) && (
        <div className="space-y-2 border-t border-sidebar-muted px-3 py-3">
          <div className="px-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {userDisplayName(user, member)}
            </p>
            {churchName && (
              <p className="truncate text-[10px] text-sidebar-foreground/50">{churchName}</p>
            )}
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      )}
      {isPlatformOperator && (
        <div className="border-t border-sidebar-muted p-3">
          <LogoutButton variant="sidebar" />
        </div>
      )}
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ModuleChromeProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </ModuleChromeProvider>
  );
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { stickyModuleTitle } = useModuleChrome();
  const {
    canAccessFollowUp,
    canAccessServiceUnitHub,
    canAccessDepartmentTools,
    canAccessMyProfile,
    canAccessSermonNote,
    canAccessMinistryCells,
    canManageStaff,
    userRoles,
    isPlatformOperator,
    isChurchStaff,
    churchName,
    user,
    member,
    enabledModules,
    isLoading: accessLoading,
  } = useModuleAccess();

  const memberNav = useMemo(
    () =>
      buildVisibleMemberNav(
        {
          canAccessFollowUp,
          canAccessServiceUnitHub,
          canAccessDepartmentTools,
          canAccessMyProfile,
          canAccessSermonNote,
          canAccessMinistryCells,
          accessLoading,
        },
        enabledModules,
      ),
    [
      canAccessFollowUp,
      canAccessServiceUnitHub,
      canAccessDepartmentTools,
      canAccessMyProfile,
      canAccessSermonNote,
      canAccessMinistryCells,
      accessLoading,
      enabledModules,
    ],
  );
  const isChurchLeadership =
    isChurchAdminRole(userRoles) || isPastorRole(userRoles) || isChurchStaff;
  const isPastor = isPastorRole(userRoles);
  const isChurchAdmin = isChurchAdminRole(userRoles);
  const staffNav = useMemo(
    () =>
      filterStaffNav(
        STAFF_LEADERSHIP_NAV,
        {
          canManageStaff,
          isChurchLeadership,
          isPastor,
          isChurchAdmin,
        },
        enabledModules,
      ),
    [canManageStaff, isChurchLeadership, isPastor, isChurchAdmin, enabledModules],
  );
  const staffCommunityNav = useMemo(
    () =>
      filterStaffNav(
        STAFF_COMMUNITY_NAV,
        {
          canManageStaff,
          isChurchLeadership,
          isPastor,
          isChurchAdmin,
          canAccessDepartmentTools,
        },
        enabledModules,
      ),
    [
      canManageStaff,
      isChurchLeadership,
      isPastor,
      isChurchAdmin,
      canAccessDepartmentTools,
      enabledModules,
    ],
  );

  const displayName = userDisplayName(user, member);
  const initials = memberInitials(displayName);
  const avatarUrl = accountAvatarUrl(user, member);
  const avatarUser = user
    ? { ...user, avatarUrl: avatarUrl ?? user.avatarUrl }
    : member
      ? {
          firstName: member.firstName,
          lastName: member.lastName,
          nickname: member.nickname,
          avatarUrl,
        }
      : null;
  const pageTitle = getAppRouteTitle(pathname);
  const showMobileApp = !isPlatformOperator;
  const showMobilePageTitle = showMobileApp && pageTitle && !hasModulePageChrome(pathname);
  const homeHref = isPlatformOperator
    ? '/dashboard/platform'
    : isChurchStaff
      ? '/dashboard'
      : '/dashboard/lounge';

  return (
    <div className="app-root min-h-[100dvh] bg-[hsl(var(--muted))]">
      <div className="app-frame relative mx-auto flex min-h-[100dvh] w-full max-w-[100%] flex-col bg-background xl:max-w-none">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar xl:flex">
          <DesktopSidebar />
        </aside>

        <div className="flex min-h-[100dvh] flex-1 flex-col xl:pl-64">
          {/* Mobile / tablet app header */}
          <header className="app-top-bar sticky top-0 z-40 flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-end border-b border-border/80 bg-card/90 px-4 pb-2 backdrop-blur-xl xl:h-16 xl:items-center xl:px-6">
            <div className="flex w-full items-center gap-2 pt-[env(safe-area-inset-top)] xl:pt-0">
              {showMobileApp ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {stickyModuleTitle ?? churchName ?? 'Church Hub'}
                  </p>
                  {showMobilePageTitle && !stickyModuleTitle ? (
                    <h1 className="truncate font-heading text-lg font-bold leading-tight">{pageTitle}</h1>
                  ) : null}
                </div>
              ) : (
                <>
                  <Link href={homeHref} className="xl:hidden">
                    <BrandMark variant="dark" />
                  </Link>
                  <div className="min-w-0 flex-1" />
                </>
              )}
              <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                <NotificationBell />
                {showMobileApp ? (
                  <Link
                    href="/dashboard/settings"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-border"
                    aria-label="Account settings"
                  >
                    {avatarUser ? (
                      <UserAvatar user={avatarUser} className="h-9 w-9" fallbackClassName="text-[10px]" />
                    ) : (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </Link>
                ) : null}
                <LogoutButton variant="header" className={showMobileApp ? undefined : 'h-9 w-9 px-0'} />
              </div>
            </div>
          </header>

          <SkipToMain />
          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              'app-main membership-hub-root flex-1 overflow-x-hidden focus:outline-none',
              showMobileApp && 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] xl:pb-0',
            )}
          >
            {children}
          </main>
        </div>

        {showMobileApp && (
          <>
            <MobileTabBar onMoreOpen={() => setMoreOpen(true)} />
            <MobileMoreMenu
              open={moreOpen}
              onClose={() => setMoreOpen(false)}
              memberNav={memberNav}
              allMemberNav={MEMBER_NAV}
              staffNav={staffNav}
              staffCommunityNav={staffCommunityNav}
              isChurchStaff={isChurchStaff}
              communityCollapsedByDefault={isPastor || isChurchAdmin}
            />
          </>
        )}
      </div>
    </div>
  );
}

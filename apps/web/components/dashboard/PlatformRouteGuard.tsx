'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isPlatformRole } from '@/lib/session-role';

/** SaaS owners always use /dashboard/platform — never church member/staff routes. */
export function PlatformRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isPlatformAdmin, userRoles, isLoading } = useModuleAccess();

  const isPlatform = isPlatformRole(userRoles, isPlatformAdmin);

  useEffect(() => {
    if (isLoading || !isPlatform) return;
    if (!pathname.startsWith('/dashboard/platform')) {
      router.replace('/dashboard/platform');
    }
  }, [isLoading, isPlatform, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPlatform && !pathname.startsWith('/dashboard/platform')) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

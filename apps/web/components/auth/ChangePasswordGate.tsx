'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isPlatformRole } from '@/lib/session-role';

/** Forces church users with a temporary password to /dashboard/change-password first. */
export function ChangePasswordGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, mustChangePassword, isPlatformAdmin, userRoles } = useModuleAccess();

  const isPlatform = isPlatformRole(userRoles, isPlatformAdmin);
  const required = mustChangePassword && !isPlatform;

  useEffect(() => {
    if (isLoading || !required) return;
    if (pathname !== '/dashboard/change-password') {
      router.replace('/dashboard/change-password');
    }
  }, [isLoading, required, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (required && pathname !== '/dashboard/change-password') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

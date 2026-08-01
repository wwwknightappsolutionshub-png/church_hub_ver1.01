'use client';

import Link from 'next/link';
import { Loader2, Lock } from 'lucide-react';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Button } from '@/components/ui/button';

export function FollowUpAccessGate({ children }: { children: React.ReactNode }) {
  const { isLoading, canAccessFollowUp } = useModuleAccess();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessFollowUp) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <Lock className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 font-heading text-xl font-bold">Outreach access restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is for church staff and members of Outreach, Harvesters Squad (evangelism),
          Prayer Squad, or Winning Foundation School. Join one of those service units from the hub to
          request access.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/service-units">Open Service Unit Hub</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

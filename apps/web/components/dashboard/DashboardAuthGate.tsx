'use client';

import { useEnsureAuth } from '@/lib/hooks/use-ensure-auth';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, authHint, retry } = useEnsureAuth();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium">Sign in to load live data</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {authHint ??
            'Start the API with `pnpm --filter @church-hub/api dev`, then sign in or use demo auto-login.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => retry()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry demo login
          </Button>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Demo: admin@demo.church / ChurchHub123! · API: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

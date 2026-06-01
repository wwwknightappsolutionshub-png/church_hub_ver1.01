'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { clearAuthTokens } from '@/lib/api';
import { signOutAndRedirect } from '@/lib/sign-out';
import { clearSessionRoleBucket } from '@/lib/session-role';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  variant?: 'sidebar' | 'header' | 'menu';
  className?: string;
}

export function LogoutButton({ variant = 'sidebar', className }: LogoutButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOutAndRedirect();
    } catch {
      clearAuthTokens();
      clearSessionRoleBucket();
      toast.error('Sign-out had a problem — session cleared. Redirecting…');
      window.location.replace('/login');
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-muted hover:text-sidebar-foreground',
          className,
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>{busy ? 'Signing out…' : 'Log out'}</span>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted',
          className,
        )}
      >
        <LogOut className="h-4 w-4" />
        {busy ? 'Signing out…' : 'Log out'}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={handleClick}
      className={cn('h-10 gap-1.5 px-2', className)}
      aria-label="Log out"
      title="Log out"
    >
      <LogOut className="h-5 w-5" />
      <span className="hidden sm:inline text-xs">{busy ? '…' : 'Log out'}</span>
    </Button>
  );
}

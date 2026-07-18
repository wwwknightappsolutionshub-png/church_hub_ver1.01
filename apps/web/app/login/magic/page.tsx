'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { consumeMagicLink } from '@/lib/auth-links';
import { api } from '@/lib/api';
import { applyAuthSessionFromMe } from '@/lib/apply-auth-session';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { Button } from '@/components/ui/button';

export default function MagicLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const token = sp.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This sign-in link is missing or incomplete.');
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await consumeMagicLink(token);
      if (cancelled) return;
      if (!result.ok) {
        setStatus('error');
        setMessage(result.message);
        return;
      }
      if (result.mustChangePassword) {
        toast.message('Please set a new password to continue');
        router.replace('/dashboard/change-password');
        return;
      }
      await queryClient.clear();
      toast.success('Welcome back');
      try {
        const { data } = await api.get<{
          isPlatformAdmin?: boolean;
          isChurchStaff?: boolean;
          churchSlug?: string | null;
          userRoles?: string[];
          mustChangePassword?: boolean;
        }>('/auth/me');
        if (data.mustChangePassword) {
          router.replace('/dashboard/change-password');
          return;
        }
        const path = applyAuthSessionFromMe(data);
        router.replace(path);
      } catch {
        router.replace('/dashboard');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthMobileBrand />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
        <div className="w-full max-w-md text-center">
          {status === 'working' ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <h1 className="mt-4 text-2xl font-bold">Signing you in</h1>
              <p className="mt-2 text-muted-foreground">{message}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Link expired</h1>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button asChild className="w-full shadow-brand">
                  <Link href="/forgot-password?mode=magic">Request a new link</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Back to sign in</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <AuthSideVisual variant="login" />
    </div>
  );
}

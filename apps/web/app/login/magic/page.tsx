'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { consumeMagicLink } from '@/lib/auth-links';
import { verifyLogin2fa, isLogin2faChallenge, isLoginSuccess } from '@/lib/auth-login';
import { api } from '@/lib/api';
import { applyAuthSessionFromMe } from '@/lib/apply-auth-session';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Status = 'working' | 'error' | '2fa';

export default function MagicLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState('Signing you in…');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const finishSession = async (mustChangePassword?: boolean) => {
    if (mustChangePassword) {
      toast.message('Please set a new password to continue');
      router.replace('/dashboard/change-password');
      return;
    }
    await queryClient.clear();
    toast.success('Welcome back', {
      description: 'Opening your church workspace…',
      duration: 3500,
    });
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
  };

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
      if (isLogin2faChallenge(result)) {
        setChallengeId(result.challengeId);
        setEmail(result.email);
        setMessage(result.message ?? 'Enter the verification code we emailed you');
        setStatus('2fa');
        toast.message('Enter the verification code we emailed you');
        return;
      }
      if (isLoginSuccess(result)) {
        await finishSession(result.mustChangePassword);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for token
  }, [queryClient, router]);

  const onTwoFaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    const result = await verifyLogin2fa(challengeId, otp);
    setLoading(false);
    if (isLoginSuccess(result)) {
      await finishSession(result.mustChangePassword);
      return;
    }
    if (!result.ok) {
      toast.error(result.message);
    }
  };

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
          ) : status === '2fa' ? (
            <>
              <h1 className="text-2xl font-bold">Verify sign-in</h1>
              <p className="mt-2 text-muted-foreground">
                Enter the 6-digit code we sent to <strong>{email}</strong>
              </p>
              <form onSubmit={onTwoFaSubmit} className="mt-6 space-y-4 text-left">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Verification code</label>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    minLength={6}
                    maxLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full shadow-brand"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify and continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
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

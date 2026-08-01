'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { churchPublicPath } from '@/lib/church-slug';
import { applyAuthSessionFromMe } from '@/lib/apply-auth-session';
import { LoginCredentialsSchema, MagicLinkRequestSchema } from '@church-hub/shared-types';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import { loginWithCredentials, verifyLogin2fa, isLogin2faChallenge, isLoginSuccess } from '@/lib/auth-login';
import { requestMagicLink } from '@/lib/auth-links';
import { api } from '@/lib/api';
import { checkApiReachable } from '@/lib/api-health';
import { storeTrialRegisterPrefill } from '@/lib/marketing-trial';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { LoginTestAccountsPanel } from '@/components/auth/LoginTestAccountsPanel';
import { showLoginTestAccounts } from '@/lib/auth-test-logins';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type LoginMode = 'password' | 'magic';

type TwoFaState = {
  challengeId: string;
  email: string;
};

function useLoginSearchParams() {
  const [params, setParams] = useState({
    church: null as string | null,
    justRegistered: false,
    portalCreated: false,
    email: null as string | null,
    trial: null as string | null,
    mode: 'password' as LoginMode,
    idle: false,
  });
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams({
      church: sp.get('church'),
      justRegistered: sp.get('registered') === '1',
      portalCreated: sp.get('portal') === '1',
      email: sp.get('email'),
      trial: sp.get('trial'),
      mode: sp.get('mode') === 'magic' ? 'magic' : 'password',
      idle: sp.get('reason') === 'idle',
    });
  }, []);
  return params;
}

function apiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err as { response?: { data?: { message?: string | string[] } } }).response
      ?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'Could not verify trial access';
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    church: churchFromUrl,
    justRegistered,
    portalCreated,
    email: emailFromRegistration,
    trial: trialToken,
    mode: modeFromUrl,
    idle: signedOutIdle,
  } = useLoginSearchParams();
  const [mode, setMode] = useState<LoginMode>('password');
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [twoFa, setTwoFa] = useState<TwoFaState | null>(null);
  const [otp, setOtp] = useState('');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const { register, handleSubmit, setValue, getValues } = useForm<{
    email: string;
    password: string;
  }>({
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    checkApiReachable().then(setApiOnline);
  }, []);

  useEffect(() => {
    setMode(modeFromUrl);
  }, [modeFromUrl]);

  useEffect(() => {
    if (emailFromRegistration) {
      setValue('email', emailFromRegistration);
    }
  }, [emailFromRegistration, setValue]);

  useEffect(() => {
    if (!signedOutIdle) return;
    toast.message('Signed out due to inactivity', {
      description: 'Please sign in again to continue.',
    });
  }, [signedOutIdle]);

  useEffect(() => {
    if (!trialToken) return;
    let cancelled = false;
    setTrialLoading(true);
    api
      .get<{ email: string; firstName: string; lastName: string }>(
        `/marketing/trial-access/${encodeURIComponent(trialToken)}`,
      )
      .then(({ data }) => {
        if (cancelled) return;
        setValue('email', data.email);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setTrialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trialToken, setValue]);

  const completeLogin = async (mustChangePassword?: boolean) => {
    if (mustChangePassword) {
      toast.message('Please set a new password to continue');
      router.push('/dashboard/change-password');
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
        router.push('/dashboard/change-password');
        return;
      }
      const path = applyAuthSessionFromMe({
        ...data,
        churchSlug: data.churchSlug ?? churchFromUrl,
      });
      router.push(path);
    } catch {
      router.push('/dashboard');
    }
  };

  const showTestLogins = showLoginTestAccounts();

  const onPasswordSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);

    if (trialToken) {
      try {
        const { data: redeemed } = await api.post<{
          email: string;
          firstName: string;
          lastName: string;
          redirectTo: string;
        }>('/marketing/trial-access/redeem', {
          token: trialToken,
          password: data.password,
        });
        storeTrialRegisterPrefill({
          email: redeemed.email,
          firstName: redeemed.firstName,
          lastName: redeemed.lastName,
        });
        toast.success('Trial access verified');
        router.push('/register');
      } catch (err) {
        toast.error(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsed = LoginCredentialsSchema.safeParse(data);
    if (!parsed.success) {
      setLoading(false);
      toast.error(parsed.error.issues[0]?.message ?? 'Enter a valid email and password');
      return;
    }

    const result = await loginWithCredentials(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (isLogin2faChallenge(result)) {
      setTwoFa({ challengeId: result.challengeId, email: result.email });
      setOtp('');
      toast.message(result.message ?? 'Enter the verification code we emailed you');
      return;
    }
    if (isLoginSuccess(result)) {
      void completeLogin(result.mustChangePassword);
      return;
    }

    if (result.clearPassword) {
      setValue('password', '');
    }

    if (result.resetLinkSent) {
      toast.message('Check your registered email', {
        description:
          'We sent a password reset link after too many failed sign-in attempts. Open that email to set a new password.',
        duration: 10_000,
      });
      return;
    }

    toast.error(result.message);
  };

  const onTwoFaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFa) return;
    setLoading(true);
    const result = await verifyLogin2fa(twoFa.challengeId, otp);
    setLoading(false);
    if (isLoginSuccess(result)) {
      setTwoFa(null);
      void completeLogin(result.mustChangePassword);
      return;
    }
    if (!result.ok) {
      toast.error(result.message);
    }
  };

  const onMagicSubmit = async (data: { email: string }) => {
    const parsed = MagicLinkRequestSchema.safeParse({ email: data.email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return;
    }
    setLoading(true);
    const result = await requestMagicLink(parsed.data.email);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setMagicSent(true);
    toast.success(result.message);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthMobileBrand />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold">
            {trialToken
              ? 'Continue your Church_Hub trial'
              : twoFa
                ? 'Verify sign-in'
                : 'Welcome back'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {trialToken
              ? 'Enter the temporary password from your email to open registration.'
              : twoFa
                ? `Enter the 6-digit code we sent to ${twoFa.email}`
                : mode === 'magic'
                  ? 'We will email you a one-time sign-in link'
                  : 'Sign in to your church workspace'}
          </p>
          {apiOnline === false ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              API is not running. Start it with{' '}
              <code className="rounded bg-muted px-1 text-xs">
                pnpm --filter @church-hub/api dev
              </code>{' '}
              (or <code className="rounded bg-muted px-1 text-xs">pnpm --filter @church-hub/api start</code>{' '}
              after build).
            </div>
          ) : null}
          {churchFromUrl && (
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href={churchPublicPath(churchFromUrl)}>Visit church home page</Link>
              </Button>
            </div>
          )}

          {justRegistered && (
            <div
              className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"
              role="status"
            >
              <p className="font-semibold text-foreground">Registration successful!</p>
              {portalCreated ? (
                <p className="mt-2 text-muted-foreground">
                  Check your registered email
                  {emailFromRegistration ? (
                    <>
                      {' '}
                      (<strong>{emailFromRegistration}</strong>)
                    </>
                  ) : null}{' '}
                  for your <strong>temporary password</strong>, then sign in below.
                </p>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  Thank you for registering. Sign in below when your church team has set up your
                  account, or check your email for next steps.
                </p>
              )}
            </div>
          )}

          {!trialToken && !twoFa ? (
            <div className="mt-6 flex gap-2 rounded-lg border bg-muted/40 p-1">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition',
                  mode === 'password' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
                onClick={() => {
                  setMode('password');
                  setMagicSent(false);
                }}
              >
                Password
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition',
                  mode === 'magic' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
                onClick={() => {
                  setMode('magic');
                  setMagicSent(false);
                }}
              >
                Magic link
              </button>
            </div>
          ) : null}

          {twoFa ? (
            <form onSubmit={onTwoFaSubmit} className="mt-6 space-y-4">
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
              <Button type="submit" className="w-full shadow-brand" disabled={loading || otp.length !== 6}>
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
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setTwoFa(null);
                  setOtp('');
                }}
              >
                Back to sign in
              </Button>
            </form>
          ) : mode === 'magic' && !trialToken ? (
            magicSent ? (
              <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <Mail className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 font-semibold">Check your email</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If an account exists for <strong>{getValues('email')}</strong>, we sent a
                  one-time sign-in link.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setMagicSent(false)}
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onMagicSubmit)} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="you@yourchurch.org"
                    {...register('email')}
                    required
                  />
                </div>
                <Button type="submit" className="w-full shadow-brand" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Email me a sign-in link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="you@yourchurch.org"
                  {...register('email')}
                  required
                  readOnly={Boolean(trialToken)}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium">
                    {trialToken ? 'Temporary password' : 'Password'}
                  </label>
                  {!trialToken ? (
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  ) : null}
                </div>
                <Input type="password" placeholder="••••••••" {...register('password')} required />
              </div>
              <Button
                type="submit"
                className="w-full shadow-brand"
                disabled={loading || trialLoading}
              >
                {loading || trialLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {trialToken ? 'Verifying…' : 'Signing in…'}
                  </>
                ) : (
                  <>
                    {trialToken ? 'Continue to register' : 'Sign in'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {showTestLogins && !trialToken && mode === 'password' && !twoFa ? (
            <LoginTestAccountsPanel
              onUseAccount={(email, password) => {
                setValue('email', email);
                setValue('password', password);
              }}
            />
          ) : null}

          {!trialToken ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              No account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Start free trial
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <AuthSideVisual variant="login" />
    </div>
  );
}

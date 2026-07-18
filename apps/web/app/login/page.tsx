'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { churchPublicPath } from '@/lib/church-slug';
import { applyAuthSessionFromMe } from '@/lib/apply-auth-session';
import { ArrowRight, Loader2 } from 'lucide-react';
import { loginWithCredentials } from '@/lib/auth-login';
import { api } from '@/lib/api';
import { checkApiReachable } from '@/lib/api-health';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { LoginTestAccountsPanel } from '@/components/auth/LoginTestAccountsPanel';
import { showLoginTestAccounts } from '@/lib/auth-test-logins';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function useLoginSearchParams() {
  const [params, setParams] = useState({
    church: null as string | null,
    justRegistered: false,
    portalCreated: false,
    email: null as string | null,
  });
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams({
      church: sp.get('church'),
      justRegistered: sp.get('registered') === '1',
      portalCreated: sp.get('portal') === '1',
      email: sp.get('email'),
    });
  }, []);
  return params;
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { church: churchFromUrl, justRegistered, portalCreated, email: emailFromRegistration } =
    useLoginSearchParams();
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const { register, handleSubmit, setValue } = useForm<{ email: string; password: string }>({
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    checkApiReachable().then(setApiOnline);
  }, []);

  useEffect(() => {
    if (emailFromRegistration) {
      setValue('email', emailFromRegistration);
    }
  }, [emailFromRegistration, setValue]);

  const completeLogin = async (mustChangePassword?: boolean) => {
    if (mustChangePassword) {
      toast.message('Please set a new password to continue');
      router.push('/dashboard/change-password');
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

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    const result = await loginWithCredentials(data.email, data.password);
    setLoading(false);
    if (result.ok) completeLogin(result.mustChangePassword);
    else toast.error(result.message);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthMobileBrand />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your church workspace</p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@yourchurch.org" {...register('email')} required />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input type="password" placeholder="••••••••" {...register('password')} required />
            </div>
            <Button type="submit" className="w-full shadow-brand" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Prefer no password?{' '}
            <Link
              href="/forgot-password?mode=magic"
              className="font-medium text-primary hover:underline"
            >
              Email me a sign-in link
            </Link>
          </p>

          {showTestLogins ? (
            <LoginTestAccountsPanel
              onUseAccount={(email, password) => {
                setValue('email', email);
                setValue('password', password);
              }}
            />
          ) : null}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Start free trial
            </Link>
          </p>
        </div>
      </div>

      <AuthSideVisual variant="login" />
    </div>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { churchPublicPath } from '@/lib/church-slug';
import { applyAuthSessionFromMe } from '@/lib/apply-auth-session';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, Wand2 } from 'lucide-react';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  loginWithCredentials,
} from '@/lib/auth-login';
import { api } from '@/lib/api';
import { checkApiReachable } from '@/lib/api-health';
import {
  FALLBACK_TEST_ACCOUNTS,
  TEST_PASSWORD,
  type TestAccountDetail,
} from '@/lib/test-accounts';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const USER_ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'SaaS Platform Admin',
  ADMIN: 'Church Admin',
  PASTOR: 'Pastor',
  LEADER: 'Leader',
  MEMBER: 'Member',
  DRIVER: 'Driver',
};

function LoginPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const churchFromUrl = searchParams.get('church');
  const justRegistered = searchParams.get('registered') === '1';
  const portalCreated = searchParams.get('portal') === '1';
  const emailFromRegistration = searchParams.get('email');
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState<string | null>(null);
  const [testAccounts, setTestAccounts] = useState<TestAccountDetail[]>(FALLBACK_TEST_ACCOUNTS);
  const [testPassword, setTestPassword] = useState(TEST_PASSWORD);
  const [showDetails, setShowDetails] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>('admin');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const { register, handleSubmit, setValue } = useForm<{ email: string; password: string }>({
    defaultValues: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });

  useEffect(() => {
    checkApiReachable().then(setApiOnline);
  }, []);

  useEffect(() => {
    api
      .get<{ password: string; accounts: TestAccountDetail[] }>('/auth/test-accounts')
      .then((res) => {
        setTestAccounts(res.data.accounts);
        setTestPassword(res.data.password);
      })
      .catch(() => {
        setTestAccounts(FALLBACK_TEST_ACCOUNTS);
        setTestPassword(TEST_PASSWORD);
      });
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

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    const result = await loginWithCredentials(data.email, data.password);
    setLoading(false);
    if (result.ok) completeLogin(result.mustChangePassword);
    else toast.error(result.message);
  };

  const magicLogin = async (account: TestAccountDetail) => {
    setMagicLoading(account.key);
    setValue('email', account.email);
    setValue('password', testPassword);
    const result = await loginWithCredentials(account.email, testPassword);
    setMagicLoading(null);
    if (result.ok) {
      toast.success(`Signed in as ${account.label}`);
      completeLogin(result.mustChangePassword);
    } else {
      toast.error(
        result.ok === false
          ? `${result.message} — run: pnpm --filter @church-hub/api prisma:seed:test-users`
          : 'Login failed',
      );
    }
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
              <Input type="email" placeholder="admin@demo.church" {...register('email')} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <Input type="password" placeholder="••••••••" {...register('password')} required />
            </div>
            <Button type="submit" className="w-full shadow-brand" disabled={!!loading || !!magicLoading}>
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

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="gold">Test</Badge>
                <Wand2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Magic login</span>
              </div>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowDetails((v) => !v)}
              >
                {showDetails ? 'Hide' : 'Show'} role details
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Shared password for all test users:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{testPassword}</code>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              First setup? Run{' '}
              <code className="font-mono">pnpm --filter @church-hub/api prisma:seed:test-users</code>{' '}
              if buttons return invalid credentials.
            </p>

            <div className="mt-3 space-y-2">
              {testAccounts.map((account) => (
                <div
                  key={account.key}
                  className={cn(
                    'rounded-lg border bg-card transition-colors',
                    expandedKey === account.key && showDetails
                      ? 'border-primary/40'
                      : 'border-border',
                  )}
                >
                  <div className="flex items-stretch gap-2 p-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-[52px] flex-1 flex-col items-start justify-center py-2 text-left"
                      disabled={!!loading || !!magicLoading}
                      onClick={() => magicLogin(account)}
                    >
                      {magicLoading === account.key ? (
                        <Loader2 className="mb-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="mb-1 h-3 w-3 text-primary" />
                      )}
                      <span className="text-xs font-semibold leading-tight">{account.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {account.email}
                      </span>
                    </Button>
                    {showDetails && (
                      <button
                        type="button"
                        className="flex w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setExpandedKey((k) => (k === account.key ? null : account.key))
                        }
                        aria-label="Toggle details"
                      >
                        {expandedKey === account.key ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {showDetails && expandedKey === account.key && (
                    <div className="border-t border-border px-3 pb-3 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                      <p>{account.description}</p>
                      <dl className="mt-2 grid gap-1">
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">User role:</dt>
                          <dd>
                            <Badge variant="outline" className="text-[10px]">
                              {account.userRole}
                            </Badge>{' '}
                            ({USER_ROLE_LABELS[account.userRole] ?? account.userRole})
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">Member roles:</dt>
                          <dd className="flex flex-wrap gap-1">
                            {account.memberRoles.map((r) => (
                              <Badge key={r} variant="secondary" className="text-[10px]">
                                {r}
                              </Badge>
                            ))}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-foreground">Service units:</dt>
                          <dd>{account.serviceUnits.join(' · ') || '—'}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 font-medium text-foreground">Try after login:</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {account.testFocus.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

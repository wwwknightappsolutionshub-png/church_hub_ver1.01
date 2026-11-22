'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Loader2, Lock } from 'lucide-react';
import { passwordFormatError, PASSWORD_HINT } from '@church-hub/shared-types';
import {
  resendPasswordSetupLink,
  resetPasswordWithToken,
  validatePasswordResetToken,
} from '@/lib/auth-links';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TokenStatus = 'checking' | 'valid' | 'unusable' | 'missing';

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('checking');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const { register, handleSubmit } = useForm<{
    newPassword: string;
    confirmPassword: string;
  }>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const refreshTokenStatus = useCallback(async (raw: string) => {
    setTokenStatus('checking');
    const result = await validatePasswordResetToken(raw);
    if (!result.ok) {
      setTokenStatus('unusable');
      setExpiresAt(null);
      setShowRequestModal(true);
      return;
    }
    setTokenStatus(result.status);
    setExpiresAt(result.expiresAt ?? null);
    if (result.status !== 'valid') {
      setShowRequestModal(true);
    }
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('token');
    setToken(t);
    if (!t) {
      setTokenStatus('missing');
      return;
    }
    void refreshTokenStatus(t);
  }, [refreshTokenStatus]);

  useEffect(() => {
    if (tokenStatus !== 'valid' || !expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const left = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(left);
      if (left <= 0) {
        setTokenStatus('unusable');
        setShowRequestModal(true);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [tokenStatus, expiresAt]);

  const countdownLabel = useMemo(() => {
    if (secondsLeft == null) return null;
    if (secondsLeft <= 0) return 'Expired';
    return formatCountdown(secondsLeft);
  }, [secondsLeft]);

  const onSubmit = async (data: { newPassword: string; confirmPassword: string }) => {
    if (!token) {
      toast.error('Missing reset token. Request a new link.');
      setShowRequestModal(true);
      return;
    }
    if (tokenStatus !== 'valid') {
      setShowRequestModal(true);
      return;
    }
    const formatErr = passwordFormatError(data.newPassword);
    if (formatErr) {
      toast.error(formatErr);
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = await resetPasswordWithToken(token, data.newPassword);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message);
      if (/expired|used|invalid|no longer/i.test(result.message)) {
        setTokenStatus('unusable');
        setShowRequestModal(true);
      }
      return;
    }
    toast.success(result.message);
    router.push('/login');
  };

  const onRequestNewLink = async () => {
    if (!token) {
      toast.error('Open the link from your email or WhatsApp, then try again.');
      return;
    }
    setResending(true);
    const result = await resendPasswordSetupLink(token);
    setResending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setResendDone(true);
    toast.success(result.message);
  };

  const formEnabled = Boolean(token) && tokenStatus === 'valid';

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthMobileBrand />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a secure password for your Church_Hub account.
          </p>

          {tokenStatus === 'missing' ? (
            <div
              className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              This reset link is missing or incomplete.{' '}
              <Link href="/forgot-password" className="font-medium underline">
                Request a new one
              </Link>
              .
            </div>
          ) : tokenStatus === 'checking' ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your link…
            </div>
          ) : (
            <>
              {formEnabled && countdownLabel ? (
                <div
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground"
                  aria-live="polite"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Link expires in {countdownLabel}
                </div>
              ) : null}

              {!formEnabled ? (
                <div
                  className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  This set-password link is no longer usable.{' '}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => setShowRequestModal(true)}
                  >
                    Request a new link
                  </button>
                  .
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">New password</label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 12 characters"
                      minLength={12}
                      {...register('newPassword')}
                      required
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Confirm password</label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      minLength={12}
                      {...register('confirmPassword')}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full shadow-brand" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Update password
                      </>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <AuthSideVisual variant="login" />

      {showRequestModal ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-labelledby="request-new-link-title"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-border bg-background p-5 shadow-lg sm:rounded-2xl">
            <h2 id="request-new-link-title" className="text-lg font-semibold">
              Request a new link
            </h2>
            {resendDone ? (
              <p className="mt-2 text-sm text-muted-foreground">
                If we can match this link to an account, we sent a fresh set-password link to your
                email (and a WhatsApp notice if a phone is on file). It expires in 45 minutes.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                This link is no longer usable. Submit a request and we will email a new one-time
                link that expires in 45 minutes.
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRequestModal(false);
                  setResendDone(false);
                }}
              >
                Close
              </Button>
              {!resendDone ? (
                <Button type="button" disabled={resending || !token} onClick={() => void onRequestNewLink()}>
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Submit request'
                  )}
                </Button>
              ) : (
                <Button type="button" asChild>
                  <Link href="/login">Back to sign in</Link>
                </Button>
              )}
            </div>
            {!token ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Or go to{' '}
                <Link href="/forgot-password" className="underline">
                  forgot password
                </Link>{' '}
                and enter your email.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

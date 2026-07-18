'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { requestMagicLink, requestPasswordReset } from '@/lib/auth-links';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Mode = 'reset' | 'magic';

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>('reset');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, getValues } = useForm<{ email: string }>({
    defaultValues: { email: '' },
  });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('mode') === 'magic') setMode('magic');
  }, []);

  const onSubmit = async (data: { email: string }) => {
    setLoading(true);
    const result =
      mode === 'reset'
        ? await requestPasswordReset(data.email)
        : await requestMagicLink(data.email);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setSent(true);
    toast.success(result.message);
  };

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

          <h1 className="text-2xl font-bold">
            {mode === 'reset' ? 'Forgot password' : 'Magic sign-in'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === 'reset'
              ? 'Enter your account email and we will send a link to set a new password.'
              : 'Enter your account email and we will send a one-time link to sign in.'}
          </p>

          <div className="mt-4 flex gap-2 rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'reset' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
              onClick={() => {
                setMode('reset');
                setSent(false);
              }}
            >
              Reset password
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'magic' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
              onClick={() => {
                setMode('magic');
                setSent(false);
              }}
            >
              Magic link
            </button>
          </div>

          {sent ? (
            <div
              className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"
              role="status"
            >
              <p className="font-semibold text-foreground">Check your email</p>
              <p className="mt-2 text-muted-foreground">
                If an account exists for <strong>{getValues('email')}</strong>, we sent a link.
                It expires in 30 minutes.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setSent(false)}
              >
                Send again
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="you@yourchurch.org"
                  autoComplete="email"
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
                    <Mail className="mr-2 h-4 w-4" />
                    {mode === 'reset' ? 'Send reset link' : 'Send sign-in link'}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      <AuthSideVisual variant="login" />
    </div>
  );
}

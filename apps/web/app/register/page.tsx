'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { RegisterStartSchema, type RegisterStartInput } from '@church-hub/shared-types';
import { api, setAuthTokens } from '@/lib/api';
import { slugifyChurchName } from '@/lib/church-slug';
import { apiErrorMessage } from '@/lib/api-errors';
import {
  clearTrialRegisterPrefill,
  readTrialRegisterPrefill,
} from '@/lib/marketing-trial';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RegisterForm = RegisterStartInput;

type Step = 'details' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const slugTouched = useRef(false);
  const [fromTrial, setFromTrial] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterStartSchema),
    defaultValues: {
      churchName: '',
      churchSlug: undefined,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      acceptedTerms: undefined as unknown as true,
      acceptedPrivacy: undefined as unknown as true,
      acceptedMarketing: false,
    },
  });

  const churchSlug = watch('churchSlug');

  useEffect(() => {
    const prefill = readTrialRegisterPrefill();
    if (!prefill) return;
    setFromTrial(true);
    setValue('email', prefill.email);
    setValue('firstName', prefill.firstName);
    setValue('lastName', prefill.lastName);
  }, [setValue]);

  const onStart = async (data: RegisterForm) => {
    const slug = (data.churchSlug ?? '').trim() || slugifyChurchName(data.churchName);
    if (!slug) {
      toast.error('Enter a church name so we can create your URL slug');
      return;
    }
    setBusy(true);
    try {
      const { data: res } = await api.post<{
        registrationId: string;
        email: string;
        message: string;
      }>('/auth/register/start', {
        ...data,
        churchSlug: slug,
      });
      setRegistrationId(res.registrationId);
      setOtpEmail(res.email);
      setStep('otp');
      toast.success(res.message);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Registration failed — is the API running?'));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!registrationId) return;
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your email');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/register/verify',
        { registrationId, otp: code },
      );
      setAuthTokens(data.accessToken, data.refreshToken);
      clearTrialRegisterPrefill();
      toast.success('Church workspace created!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Verification failed'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const data = getValues();
    await onStart(data);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthMobileBrand />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
        <div className="w-full max-w-lg">
          <div className="mb-8 hidden lg:block">
            <Link href="/" className="inline-block">
              <BrandMark showTagline />
            </Link>
          </div>

          <h1 className="text-2xl font-bold">
            {step === 'details' ? 'Create your church workspace' : 'Verify your email'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === 'details'
              ? '14-day free trial · No credit card required · Email verification required'
              : `Enter the 6-digit code we sent to ${otpEmail}`}
          </p>

          {step === 'details' ? (
            <form onSubmit={handleSubmit(onStart)} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Church name</label>
                <Input
                  placeholder="Grace Community Church"
                  {...register('churchName', {
                    onChange: (e) => {
                      if (slugTouched.current) return;
                      setValue('churchSlug', slugifyChurchName(e.target.value), {
                        shouldDirty: true,
                      });
                    },
                  })}
                />
                {errors.churchName ? (
                  <p className="mt-1 text-xs text-destructive">{errors.churchName.message}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Church URL slug</label>
                <Input
                  placeholder="grace-community-church"
                  {...register('churchSlug', {
                    onChange: () => {
                      slugTouched.current = true;
                    },
                  })}
                />
                {errors.churchSlug ? (
                  <p className="mt-1 text-xs text-destructive">{errors.churchSlug.message}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {churchSlug
                      ? `Your public page: /c/${churchSlug}`
                      : 'Filled automatically from the church name — edit anytime'}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">First name</label>
                  <Input {...register('firstName')} />
                  {errors.firstName ? (
                    <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Last name</label>
                  <Input {...register('lastName')} />
                  {errors.lastName ? (
                    <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Admin email</label>
                <Input type="email" {...register('email')} readOnly={fromTrial} />
                {errors.email ? (
                  <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Password</label>
                <Input type="password" {...register('password')} />
                {errors.password ? (
                  <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Please enter a new password — not the temporary password from your email.
                  </p>
                )}
              </div>
              <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    {...register('acceptedTerms')}
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/legal/terms-of-service" target="_blank" className="font-medium text-primary hover:underline">
                      Terms of Service
                    </Link>
                  </span>
                </label>
                {errors.acceptedTerms ? (
                  <p className="text-xs text-destructive">{errors.acceptedTerms.message}</p>
                ) : null}
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    {...register('acceptedPrivacy')}
                  />
                  <span>
                    I have read the{' '}
                    <Link href="/legal/privacy-policy" target="_blank" className="font-medium text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.acceptedPrivacy ? (
                  <p className="text-xs text-destructive">{errors.acceptedPrivacy.message}</p>
                ) : null}
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-1"
                    {...register('acceptedMarketing')}
                  />
                  <span>Send me product tips and onboarding emails (optional)</span>
                </label>
              </div>
              <Button type="submit" className="w-full shadow-brand" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStep('details');
                  setOtp('');
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to details
              </button>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Verification code</label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="tracking-[0.3em] text-center text-lg"
                  maxLength={6}
                />
              </div>
              <Button
                type="button"
                className="w-full shadow-brand"
                disabled={busy || otp.length !== 6}
                onClick={() => void onVerify()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating workspace…
                  </>
                ) : (
                  <>
                    Verify & create workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Didn’t get it?{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  disabled={busy}
                  onClick={() => void resend()}
                >
                  Resend code
                </button>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <AuthSideVisual variant="register" />
    </div>
  );
}

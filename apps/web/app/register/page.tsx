'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api, setAuthTokens } from '@/lib/api';
import { slugifyChurchName } from '@/lib/church-slug';
import {
  clearTrialRegisterPrefill,
  readTrialRegisterPrefill,
} from '@/lib/marketing-trial';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RegisterForm = {
  churchName: string;
  churchSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const slugTouched = useRef(false);
  const [fromTrial, setFromTrial] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<RegisterForm>({
    defaultValues: {
      churchName: '',
      churchSlug: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
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

  const onSubmit = async (data: RegisterForm) => {
    const slug = data.churchSlug.trim() || slugifyChurchName(data.churchName);
    if (!slug) {
      toast.error('Enter a church name so we can create your URL slug');
      return;
    }
    try {
      const res = await api.post('/auth/register', {
        ...data,
        churchSlug: slug,
      });
      setAuthTokens(res.data.accessToken, res.data.refreshToken);
      clearTrialRegisterPrefill();
      toast.success('Church workspace created!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data
              ?.message
          : undefined;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message ?? 'Registration failed — is the API running?',
      );
    }
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

          <h1 className="text-2xl font-bold">Create your church workspace</h1>
          <p className="mt-2 text-muted-foreground">
            14-day free trial · No credit card required
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Church name</label>
              <Input
                placeholder="Grace Community Church"
                {...register('churchName', {
                  required: true,
                  onChange: (e) => {
                    if (slugTouched.current) return;
                    setValue('churchSlug', slugifyChurchName(e.target.value), {
                      shouldDirty: true,
                    });
                  },
                })}
                required
              />
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
              <p className="mt-1.5 text-xs text-muted-foreground">
                {churchSlug
                  ? `Your public page: /c/${churchSlug}`
                  : 'Filled automatically from the church name — edit anytime'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">First name</label>
                <Input {...register('firstName')} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Last name</label>
                <Input {...register('lastName')} required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Admin email</label>
              <Input type="email" {...register('email')} required readOnly={fromTrial} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <Input type="password" {...register('password')} required minLength={8} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Please enter a new password — not the temporary password from your email.
              </p>
            </div>
            <Button type="submit" className="w-full shadow-brand">
              Create workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

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

'use client';

import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { cn } from '@/lib/utils';

const LOGIN_FEATURES = [
  'Membership & family management',
  'Discipleship follow-up pipeline',
  'Offline evangelism capture',
  'Youth, bus & business modules',
];

const REGISTER_FEATURES = [
  '14-day free trial — no card required',
  'Your branded church home page',
  'Role-based staff & member access',
  'Modules you can enable as you grow',
];

const COPY = {
  login: {
    title: 'Manage every ministry from one place',
    description:
      'Enterprise-grade church community management trusted by congregations worldwide.',
    features: LOGIN_FEATURES,
  },
  register: {
    title: 'Your church deserves a modern home',
    description:
      'Launch a secure workspace for members, leaders, and pastors — built for ministry, not spreadsheets.',
    features: REGISTER_FEATURES,
  },
} as const;

interface AuthSideVisualProps {
  variant: 'login' | 'register';
  className?: string;
}

/** Right-hand visual column for login / register split layouts. */
export function AuthSideVisual({ variant, className }: AuthSideVisualProps) {
  const { title, description, features } = COPY[variant];

  return (
    <aside
      className={cn(
        'relative hidden min-h-[280px] w-full overflow-hidden lg:flex lg:w-1/2 lg:min-h-[100dvh]',
        className,
      )}
      aria-label="Church Hub platform highlights"
    >
      <Image
        src="/images/auth-side-visual.svg"
        alt=""
        aria-hidden
        fill
        priority
        className="object-cover object-center"
        sizes="50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/75 to-slate-900/40" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 20%, hsl(43 74% 55% / 0.2), transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative flex h-full min-h-[100dvh] flex-col justify-between p-10 xl:p-12">
        <BrandMark variant="light" showTagline />

        <div>
          <h2 className="font-heading text-3xl font-bold leading-tight text-white xl:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">{description}</p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(43,74%,58%)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Church_Hub · Secure · Ministry-first
        </p>
      </div>
    </aside>
  );
}

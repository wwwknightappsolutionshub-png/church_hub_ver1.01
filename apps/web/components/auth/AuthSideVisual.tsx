'use client';

import {
  BarChart3,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { cn } from '@/lib/utils';

const LOGIN_FEATURES = [
  'Membership & family management',
  'Discipleship follow-up pipeline',
  'Offline evangelism capture',
  'Youth, bus & business modules',
];

const REGISTER_FEATURES = [
  'Free trial — no card required',
  'Your branded church home page',
  'Role-based staff & member access',
  'Modules you can enable as you grow',
];

const COPY = {
  login: {
    eyebrow: 'Trusted by growing congregations',
    title: 'Operate your church like an enterprise',
    description:
      'One secure workspace for pastors, leaders, and members — membership, discipleship, outreach, and operations without spreadsheet chaos.',
    features: LOGIN_FEATURES,
  },
  register: {
    eyebrow: 'Built for ministry teams',
    title: 'Launch a modern church workspace',
    description:
      'Stand up a branded, role-based platform in days — then enable modules as your ministry grows.',
    features: REGISTER_FEATURES,
  },
} as const;

const TRUST_PILLS = [
  { icon: ShieldCheck, label: 'RBAC & audit logs' },
  { icon: Lock, label: 'Tenant isolation' },
  { icon: Users, label: 'Multi-campus ready' },
];

interface AuthSideVisualProps {
  variant: 'login' | 'register';
  className?: string;
}

function EnterpriseDashboardMock() {
  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-white/15 bg-slate-950/60 shadow-2xl backdrop-blur-sm"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        <span className="ml-2 truncate text-[10px] text-slate-400">church-hub.app / dashboard</span>
      </div>
      <div className="grid grid-cols-[72px_1fr]">
        <div className="space-y-2 border-r border-white/10 bg-slate-900/80 p-2.5">
          {[true, false, false, false].map((active, i) => (
            <div
              key={i}
              className={cn(
                'h-6 rounded-md',
                active ? 'bg-[hsl(43,74%,55%)]/30 ring-1 ring-[hsl(43,74%,55%)]/40' : 'bg-white/5',
              )}
            />
          ))}
        </div>
        <div className="space-y-2.5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-white">Ministry overview</p>
              <p className="text-[9px] text-slate-400">Live · Demo Community Church</p>
            </div>
            <BarChart3 className="h-3.5 w-3.5 text-[hsl(43,74%,58%)]" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Members', value: '2.8k' },
              { label: 'Outreach', value: '78%' },
              { label: 'Outreach', value: '+24%' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                <p className="text-[8px] uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="text-xs font-semibold text-white">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 rounded-lg bg-white/5 p-2 ring-1 ring-white/10">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-indigo-400 to-[hsl(43,74%,55%)]" />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Discipleship pipeline</span>
              <span>72% on track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Right-hand visual column for login / register split layouts. */
export function AuthSideVisual({ variant, className }: AuthSideVisualProps) {
  const { eyebrow, title, description, features } = COPY[variant];

  return (
    <aside
      className={cn(
        'auth-side-visual relative hidden min-h-[280px] w-full overflow-hidden md:flex md:w-2/5 lg:w-1/2 lg:min-h-[100dvh]',
        className,
      )}
      aria-label="Church Hub platform highlights"
    >
      {/* Enterprise backdrop: deep navy + subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(155deg, #0f172a 0%, #1e1b4b 42%, #172554 78%, #0f172a 100%)',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div
        className="absolute -right-24 top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(43 74% 55% / 0.35), transparent 70%)' }}
        aria-hidden
      />
      <div
        className="absolute -left-16 bottom-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(234 70% 55% / 0.45), transparent 70%)' }}
        aria-hidden
      />

      <div className="relative flex h-full min-h-[280px] flex-col justify-between gap-8 p-8 lg:min-h-[100dvh] lg:p-10 xl:p-12">
        <div className="flex items-start justify-between gap-4">
          <BrandMark variant="light" showTagline />
          <span className="hidden rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300 sm:inline">
            Enterprise
          </span>
        </div>

        <div className="space-y-8">
          <EnterpriseDashboardMock />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(43,74%,58%)]">
              {eyebrow}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-white lg:text-3xl xl:text-[2.15rem]">
              {title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300 lg:text-[15px]">
              {description}
            </p>
            <ul className="mt-5 space-y-2.5 lg:mt-6">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(43,74%,58%)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {TRUST_PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
              >
                <Icon className="h-3 w-3 text-[hsl(43,74%,58%)]" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Church_Hub · Secure · Ministry-first
        </p>
      </div>
    </aside>
  );
}

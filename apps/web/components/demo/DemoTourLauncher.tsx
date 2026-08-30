'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Loader2, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/button';
import { loginWithCredentials } from '@/lib/auth-login';
import {
  activateDemoTour,
  DEMO_TOUR_EMAIL,
  DEMO_TOUR_INTRO_HOLD_MS,
  DEMO_TOUR_PASSWORD,
  type DemoTourIntroStep,
} from '@/lib/demo-tour';
import { cn } from '@/lib/utils';

const INTRO_STEPS: { id: DemoTourIntroStep; title: string; subtitle: string }[] = [
  {
    id: 'register',
    title: 'Create your church workspace',
    subtitle: 'Register your congregation, invite leaders, and pick modules in minutes.',
  },
  {
    id: 'login',
    title: 'Secure sign-in for every role',
    subtitle: 'Pastors, admins, and members each get the right tools — protected by RBAC.',
  },
];

function IntroMockPanel({ step }: { step: DemoTourIntroStep }) {
  if (step === 'register') {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
        <p className="font-heading text-lg font-bold">Start your free trial</p>
        <p className="mt-1 text-sm text-muted-foreground">Demo Community Church</p>
        <div className="mt-5 space-y-3">
          {['Church name', 'Admin email', 'Password'].map((label) => (
            <div key={label} className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-5 flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          Create church workspace
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
      <p className="font-heading text-lg font-bold">Welcome back</p>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to Church Hub</p>
      <div className="mt-5 space-y-3">
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          {DEMO_TOUR_EMAIL}
        </div>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm tracking-widest text-muted-foreground">
          •••••••••••
        </div>
      </div>
      <div className="mt-5 flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
        Sign in
      </div>
    </div>
  );
}

export function DemoTourLauncher() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [introIndex, setIntroIndex] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'logging-in' | 'error'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [desktopOk, setDesktopOk] = useState(true);
  const [forceMobile, setForceMobile] = useState(false);

  const currentIntro = INTRO_STEPS[introIndex];

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const sync = () => setDesktopOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const beginDashboardTour = useCallback(async () => {
    setPhase('logging-in');
    setError(null);
    const result = await loginWithCredentials(DEMO_TOUR_EMAIL, DEMO_TOUR_PASSWORD);
    if (!result.ok) {
      setPhase('error');
      setError(result.message);
      return;
    }
    activateDemoTour();
    router.replace('/dashboard?tour=1');
  }, [router]);

  useEffect(() => {
    if (phase !== 'intro' || (!desktopOk && !forceMobile)) return;

    if (reduceMotion) {
      if (introIndex >= INTRO_STEPS.length - 1) {
        void beginDashboardTour();
        return;
      }
      setIntroIndex(INTRO_STEPS.length - 1);
      return;
    }

    const timer = setTimeout(() => {
      if (introIndex < INTRO_STEPS.length - 1) {
        setIntroIndex((i) => i + 1);
      } else {
        void beginDashboardTour();
      }
    }, DEMO_TOUR_INTRO_HOLD_MS);

    return () => clearTimeout(timer);
  }, [beginDashboardTour, desktopOk, forceMobile, introIndex, phase, reduceMotion]);

  if (!desktopOk && !forceMobile) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <Monitor className="mb-4 h-10 w-10 text-primary" aria-hidden />
        <h1 className="font-heading text-2xl font-bold">Desktop recommended</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The interactive product tour works best on a wide screen so you can see the full
          leadership sidebar and live dashboard modules.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <Button onClick={() => setForceMobile(true)}>Continue anyway</Button>
        </div>
      </div>
    );
  }

  if (phase === 'logging-in') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="mt-4 font-medium">Signing in to the demo church workspace…</p>
        <p className="mt-1 text-sm text-muted-foreground">Read-only tour — no changes will be saved.</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <p className="font-medium text-destructive">Could not start demo tour</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button onClick={() => void beginDashboardTour()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[hsl(var(--muted))]">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <BrandMark variant="dark" />
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Exit</Link>
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step {introIndex + 1} of {INTRO_STEPS.length}
        </p>
        <motion.h1
          key={currentIntro.id}
          className="mt-3 max-w-xl text-center font-heading text-3xl font-bold"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {currentIntro.title}
        </motion.h1>
        <motion.p
          key={`${currentIntro.id}-sub`}
          className="mt-3 max-w-lg text-center text-muted-foreground"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          {currentIntro.subtitle}
        </motion.p>

        <motion.div
          key={`${currentIntro.id}-panel`}
          className="mt-10 w-full max-w-lg"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
        >
          <IntroMockPanel step={currentIntro.id} />
        </motion.div>

        <div className="mt-8 flex items-center gap-2">
          {INTRO_STEPS.map((step, i) => (
            <span
              key={step.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === introIndex ? 'w-8 bg-primary' : 'w-1.5 bg-border',
              )}
              aria-hidden
            />
          ))}
        </div>

        <Button className="mt-8" onClick={() => void beginDashboardTour()}>
          Skip to dashboard tour
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

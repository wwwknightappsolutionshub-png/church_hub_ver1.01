'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Loader2, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { AuthSideVisual } from '@/components/auth/AuthSideVisual';
import { BrandMark } from '@/components/brand/BrandMark';
import { DemoTourMockDashboard } from '@/components/demo/DemoTourMockDashboard';
import { TourCursor } from '@/components/demo/TourCursor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugifyChurchName } from '@/lib/church-slug';
import { cn } from '@/lib/utils';

const SIGNUP_TOAST =
  'Congratulations on your Signup, check your email "inbox or Spam mail box" for further instructions';

const REGISTER_DEMO = {
  churchName: 'Grace Community Church',
  firstName: 'Amara',
  lastName: 'Okeke',
  email: 'amara.okeke@gracecc.org',
  password: 'GraceLead2026!',
};

const LOGIN_DEMO = {
  email: 'pastor.james@northside.faith',
  password: 'Shepherd#8841',
};

const TYPE_MS = 28;
const FIELD_PAUSE_MS = 220;
const CLICK_MS = 220;
const CURSOR_TRAVEL_MS = 650;
const POST_TOAST_MS = 2800;
const POST_LOGIN_CLICK_MS = 900;

type Phase = 'register' | 'login' | 'dashboard';

type CursorState = { x: number; y: number; clicking: boolean; visible: boolean };

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function typeInto(
  full: string,
  setValue: (v: string) => void,
  reduceMotion: boolean,
  signal: AbortSignal,
) {
  if (reduceMotion) {
    setValue(full);
    return;
  }
  let built = '';
  for (const ch of full) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    built += ch;
    setValue(built);
    await sleep(TYPE_MS, signal);
  }
}

function measureCenter(el: HTMLElement | null): { x: number; y: number } | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - 6,
    y: rect.top + rect.height / 2 - 4,
  };
}

export function DemoTourLauncher() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('register');
  const [desktopOk, setDesktopOk] = useState(true);
  const [forceMobile, setForceMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<CursorState>({
    x: 40,
    y: 200,
    clicking: false,
    visible: false,
  });

  const [churchName, setChurchName] = useState('');
  const [churchSlug, setChurchSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const registerSubmitRef = useRef<HTMLButtonElement>(null);
  const loginSubmitRef = useRef<HTMLButtonElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const sync = () => setDesktopOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const goDashboardMock = useCallback(() => {
    setCursor((c) => ({ ...c, visible: false }));
    setPhase('dashboard');
  }, []);

  const exitTour = useCallback(() => {
    router.push('/');
  }, [router]);

  const moveCursorTo = useCallback(
    async (el: HTMLElement | null, signal: AbortSignal, clicking = false) => {
      const target = measureCenter(el);
      if (!target) return;
      if (reduceMotion) {
        setCursor({ ...target, clicking, visible: true });
        return;
      }
      setCursor((c) => ({ ...c, ...target, clicking: false, visible: true }));
      await sleep(CURSOR_TRAVEL_MS, signal);
      if (clicking) {
        setCursor((c) => ({ ...c, clicking: true }));
        await sleep(CLICK_MS, signal);
        setCursor((c) => ({ ...c, clicking: false }));
      }
    },
    [reduceMotion],
  );

  useEffect(() => {
    if (!desktopOk && !forceMobile) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const ac = new AbortController();
    const { signal } = ac;

    const run = async () => {
      try {
        await sleep(reduceMotion ? 200 : 700, signal);

        setPhase('register');
        await typeInto(REGISTER_DEMO.churchName, setChurchName, !!reduceMotion, signal);
        setChurchSlug(slugifyChurchName(REGISTER_DEMO.churchName));
        await sleep(FIELD_PAUSE_MS, signal);

        await typeInto(REGISTER_DEMO.firstName, setFirstName, !!reduceMotion, signal);
        await sleep(FIELD_PAUSE_MS, signal);
        await typeInto(REGISTER_DEMO.lastName, setLastName, !!reduceMotion, signal);
        await sleep(FIELD_PAUSE_MS, signal);
        await typeInto(REGISTER_DEMO.email, setRegEmail, !!reduceMotion, signal);
        await sleep(FIELD_PAUSE_MS, signal);
        await typeInto(REGISTER_DEMO.password, setRegPassword, !!reduceMotion, signal);
        await sleep(FIELD_PAUSE_MS, signal);

        setAcceptedTerms(true);
        await sleep(reduceMotion ? 0 : 180, signal);
        setAcceptedPrivacy(true);
        await sleep(FIELD_PAUSE_MS, signal);

        await moveCursorTo(registerSubmitRef.current, signal, true);
        setBusy(true);
        await sleep(reduceMotion ? 200 : 700, signal);
        setBusy(false);
        toast.success(SIGNUP_TOAST, { duration: 4500 });
        await sleep(POST_TOAST_MS, signal);

        setPhase('login');
        setCursor((c) => ({ ...c, visible: false }));
        setLoginEmail('');
        setLoginPassword('');
        await sleep(reduceMotion ? 150 : 500, signal);

        await typeInto(LOGIN_DEMO.email, setLoginEmail, !!reduceMotion, signal);
        await sleep(FIELD_PAUSE_MS, signal);
        await typeInto(LOGIN_DEMO.password, setLoginPassword, !!reduceMotion, signal);
        await sleep(FIELD_PAUSE_MS, signal);

        await moveCursorTo(loginSubmitRef.current, signal, true);
        setBusy(true);
        await sleep(POST_LOGIN_CLICK_MS, signal);
        setBusy(false);

        goDashboardMock();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error(err);
      }
    };

    void run();
    return () => {
      ac.abort();
    };
  }, [desktopOk, forceMobile, goDashboardMock, moveCursorTo, reduceMotion]);

  if (!desktopOk && !forceMobile) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <Monitor className="mb-4 h-10 w-10 text-primary" aria-hidden />
        <h1 className="font-heading text-2xl font-bold">Desktop recommended</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The interactive product tour works best on a wide screen so you can see the full admin
          sidebar layout.
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

  if (phase === 'dashboard') {
    return <DemoTourMockDashboard onExit={exitTour} reduceMotion={reduceMotion} />;
  }

  return (
    <div className="relative min-h-[100dvh]" data-testid="demo-tour-intro">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between bg-card/90 px-4 py-2 backdrop-blur xl:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Product tour · {phase === 'register' ? '1 / 3 · Sign up' : '2 / 3 · Sign in'}
          <span className="ml-2 font-normal text-muted-foreground">(illustrative mockup)</span>
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Exit</Link>
          </Button>
          <Button size="sm" onClick={goDashboardMock}>
            Skip to dashboard preview
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <TourCursor
        x={cursor.x}
        y={cursor.y}
        clicking={cursor.clicking}
        visible={cursor.visible && !reduceMotion}
      />

      {phase === 'register' ? (
        <div className="flex min-h-[100dvh] flex-col pt-12 lg:flex-row" aria-label="Sign up demonstration">
          <AuthMobileBrand />
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
            <div className="w-full max-w-lg">
              <div className="mb-8 hidden lg:block">
                <BrandMark showTagline />
              </div>
              <h1 className="text-2xl font-bold">Create your church workspace</h1>
              <p className="mt-2 text-muted-foreground">
                Free trial · No credit card required · Email verification required
              </p>

              <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()} aria-hidden>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Church name</label>
                  <Input
                    readOnly
                    value={churchName}
                    placeholder="Grace Community Church"
                    className={cn(churchName && 'ring-1 ring-primary/30')}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Church URL slug</label>
                  <Input readOnly value={churchSlug} placeholder="grace-community-church" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {churchSlug
                      ? `Your public page: /c/${churchSlug}`
                      : 'Filled automatically from the church name — edit anytime'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">First name</label>
                    <Input readOnly value={firstName} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Last name</label>
                    <Input readOnly value={lastName} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Admin email</label>
                  <Input readOnly type="email" value={regEmail} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Password</label>
                  <Input readOnly type="password" value={regPassword} />
                </div>
                <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={acceptedTerms} readOnly />
                    <span>
                      I agree to the <span className="font-medium text-primary">Terms of Service</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={acceptedPrivacy} readOnly />
                    <span>
                      I have read the <span className="font-medium text-primary">Privacy Policy</span>
                    </span>
                  </label>
                </div>
                <Button
                  ref={registerSubmitRef}
                  type="button"
                  className="w-full shadow-brand"
                  disabled={busy}
                >
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
            </div>
          </div>
          <AuthSideVisual variant="register" />
        </div>
      ) : (
        <div className="flex min-h-[100dvh] flex-col pt-12 lg:flex-row" aria-label="Sign in demonstration">
          <AuthMobileBrand />
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:min-h-[100dvh]">
            <div className="w-full max-w-md">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="mt-2 text-muted-foreground">Sign in to your church workspace</p>

              <div className="mt-6 flex gap-2 rounded-lg border bg-muted/40 p-1">
                <div className="flex-1 rounded-md bg-background px-3 py-2 text-center text-sm font-medium shadow-sm">
                  Password
                </div>
                <div className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground">
                  Magic link
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()} aria-hidden>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <Input
                    readOnly
                    type="email"
                    placeholder="you@yourchurch.org"
                    value={loginEmail}
                    className={cn(loginEmail && 'ring-1 ring-primary/30')}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Password</label>
                  <Input readOnly type="password" placeholder="••••••••" value={loginPassword} />
                </div>
                <Button
                  ref={loginSubmitRef}
                  type="button"
                  className="w-full shadow-brand"
                  disabled={busy}
                >
                  {busy ? (
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
            </div>
          </div>
          <AuthSideVisual variant="login" />
        </div>
      )}
    </div>
  );
}

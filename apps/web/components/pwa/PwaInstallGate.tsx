'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  ChevronRight,
  Download,
  Share,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import {
  completeInstallStep,
  isAndroid,
  isIos,
  isIosSafari,
  isStandalonePwa,
  markNotificationsAddressed,
  requestWebPushPermission,
  resolveInitialGateStep,
  shouldShowPwaInstallGate,
  type PwaGateStep,
} from '@/lib/pwa-install';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallGate() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<PwaGateStep>('install');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>(
    'idle',
  );
  const [highlightInstallGuide, setHighlightInstallGuide] = useState(false);
  const installGuideRef = useRef<HTMLDivElement>(null);

  const refreshVisibility = useCallback(() => {
    if (!shouldShowPwaInstallGate()) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setStep(resolveInitialGateStep());
  }, []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useEffect(() => {
    refreshVisibility();

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('focus', refreshVisibility);
    window.addEventListener('visibilitychange', refreshVisibility);

    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const onStandaloneChange = () => refreshVisibility();
    standaloneMq.addEventListener('change', onStandaloneChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('focus', refreshVisibility);
      window.removeEventListener('visibilitychange', refreshVisibility);
      standaloneMq.removeEventListener('change', onStandaloneChange);
    };
  }, [refreshVisibility]);

  const goToNotificationsStep = useCallback((installAccepted = false) => {
    completeInstallStep(installAccepted ? { installAccepted: true } : undefined);
    setStep('notifications');
  }, []);

  useEffect(() => {
    if (step !== 'install') return;
    if (!isStandalonePwa()) return;
    goToNotificationsStep();
  }, [step, goToNotificationsStep]);

  useEffect(() => {
    if (step !== 'install' || !visible) return;
    const tick = () => {
      if (!isStandalonePwa()) return;
      goToNotificationsStep();
    };
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, [step, visible, goToNotificationsStep]);

  const runAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') {
      goToNotificationsStep(true);
    }
  };

  const handleInstallApp = () => {
    if (deferredPrompt && isAndroid()) {
      void runAndroidInstall();
      return;
    }
    setHighlightInstallGuide(true);
    installGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const enableNotifications = async () => {
    const result = await requestWebPushPermission();
    if (result === 'granted') {
      setNotifStatus('granted');
      markNotificationsAddressed();
      setVisible(false);
      return;
    }
    if (result === 'denied') setNotifStatus('denied');
    else setNotifStatus('unsupported');
  };

  const skipNotifications = () => {
    markNotificationsAddressed();
    setVisible(false);
  };

  const installFooterHint = (() => {
    if (deferredPrompt && isAndroid()) {
      return 'Tap Install app to add Church Hub to your phone, then open it from your home screen or app drawer.';
    }
    if (isIos()) {
      return 'Tap Install app for steps, then use Share → Add to Home Screen. Open the new icon to reach step 2.';
    }
    if (isAndroid()) {
      return 'Tap Install app for steps, or use Chrome menu (⋮) → Install app. Open from your home screen to continue.';
    }
    return 'Install Church Hub to your home screen, then open it from the new icon to continue.';
  })();

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-gate-title"
      data-testid="pwa-install-gate"
    >
      <div className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">
        <div className="border-b border-white/10 px-6 pb-4 pt-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/20">
            <Image
              src="/icons/icon-512.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300/90">
            Step {step === 'install' ? 1 : 2} of 2
          </p>
          <h2 id="pwa-gate-title" className="mt-2 text-center font-heading text-xl font-bold">
            {step === 'install' ? 'Add Church Hub to your phone' : 'Stay connected with alerts'}
          </h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-slate-300">
            {step === 'install'
              ? 'Install the app for a native-like experience — faster access than the browser, with the same path as our mobile app.'
              : 'Turn on notifications so you never miss announcements, events, prayer updates, and reminders from your church.'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'install' ? (
            <div className="space-y-4">
              <ul className="space-y-3 text-sm text-slate-200">
                <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                  <span>
                    <strong className="text-white">One tap from your home screen</strong> — open
                    Church Hub like a native app, without hunting for the website each time.
                  </span>
                </li>
                <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden />
                  <span>
                    <strong className="text-white">Built for ministry on the go</strong> — smoother
                    scrolling, full-screen view, and offline-friendly pages when signal is weak.
                  </span>
                </li>
              </ul>

              <div
                ref={installGuideRef}
                className={cn(
                  'rounded-xl border bg-indigo-500/10 p-4 transition-all duration-300',
                  highlightInstallGuide
                    ? 'border-indigo-300 ring-2 ring-indigo-400/60'
                    : 'border-indigo-400/30',
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                  How to install
                </p>
                {isIos() ? (
                  <ol className="mt-3 space-y-2 text-sm text-slate-100">
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">1.</span>
                      <span>
                        Tap the <Share className="inline h-4 w-4 align-text-bottom" /> Share button
                        {isIosSafari() ? ' in Safari (bottom bar on iPhone)' : ' in your browser'}.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">2.</span>
                      <span>
                        Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">3.</span>
                      <span>
                        Open Church Hub from your new home-screen icon — step 2 starts automatically.
                      </span>
                    </li>
                  </ol>
                ) : isAndroid() ? (
                  <ol className="mt-3 space-y-2 text-sm text-slate-100">
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">1.</span>
                      <span>
                        Tap <strong>Install app</strong> below{deferredPrompt ? '' : ', or Chrome menu (⋮) → Install app'}.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">2.</span>
                      <span>Confirm install, then open Church Hub from your app drawer or home screen.</span>
                    </li>
                  </ol>
                ) : (
                  <ol className="mt-3 space-y-2 text-sm text-slate-100">
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">1.</span>
                      <span>
                        Tap <strong>Install app</strong> below or use your browser menu →{' '}
                        <strong>Add to Home screen</strong>.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-300">2.</span>
                      <span>Launch from the new icon to unlock step 2.</span>
                    </li>
                  </ol>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-3 text-sm text-slate-200">
                <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                  <span>Service times, urgent alerts, and leadership messages delivered instantly.</span>
                </li>
                <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                  <span>Prayer responses, event reminders, and devotional nudges — even when the app is closed.</span>
                </li>
              </ul>

              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-slate-100">
                <p className="font-semibold text-emerald-100">Allow notifications</p>
                <p className="mt-2 text-slate-200">
                  When prompted, tap <strong>Allow</strong>. You can change this anytime in your
                  phone settings under Notifications → Church Hub.
                </p>
                {notifStatus === 'denied' ? (
                  <p className="mt-2 text-xs text-amber-200">
                    Notifications are blocked. Open Settings → Notifications → Church Hub and enable
                    alerts, then return here.
                  </p>
                ) : null}
                {notifStatus === 'unsupported' ? (
                  <p className="mt-2 text-xs text-slate-300">
                    This browser does not support web notifications. You can still use the installed
                    app.
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                className={cn(
                  'h-12 w-full gap-2 text-base font-semibold',
                  notifStatus === 'granted'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white hover:bg-emerald-400',
                )}
                onClick={() => void enableNotifications()}
                disabled={notifStatus === 'granted'}
              >
                <BellRing className="h-5 w-5" />
                {notifStatus === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              </Button>

              <button
                type="button"
                className="mx-auto block text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                onClick={skipNotifications}
              >
                Skip for now — continue to Church Hub
              </button>
            </div>
          )}
        </div>

        {step === 'install' ? (
          <div className="space-y-2 border-t border-white/10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-12 w-full gap-2 bg-indigo-500 text-base font-semibold text-white hover:bg-indigo-400"
              onClick={handleInstallApp}
              data-testid="pwa-gate-install-app"
            >
              <Download className="h-5 w-5" />
              Install app
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-slate-400">{installFooterHint}</p>
          </div>
        ) : (
          <div className="border-t border-white/10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-1 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => void enableNotifications()}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

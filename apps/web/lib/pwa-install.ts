/** Mobile PWA install gate — detect device, standalone mode, and gate completion. */

export const PWA_GATE_STORAGE_KEY = 'church-hub-pwa-gate-v1';

export type PwaGateStep = 'install' | 'notifications' | 'done';

export interface PwaGateState {
  step: PwaGateStep;
  notificationsAddressed: boolean;
}

const DEFAULT_GATE: PwaGateState = { step: 'install', notificationsAddressed: false };

export function isPwaInstallGateEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_PWA_INSTALL_GATE !== 'false';
}

/** Coarse phone detection — tablets in landscape may pass; gate targets phone-class viewports. */
export function isMobilePhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(max-width: 768px)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  return coarse && touch;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** True when opened from home-screen / installed PWA shell. */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (iosStandalone) return true;
  const modes = ['standalone', 'fullscreen', 'minimal-ui'] as const;
  return modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
}

/** User confirmed install or we detected standalone — advance to notification step. */
export function completeInstallStep(): boolean {
  markInstallCompleteAdvanceToNotifications();
  return isStandalonePwa();
}

export function readPwaGateState(): PwaGateState {
  if (typeof window === 'undefined') return DEFAULT_GATE;
  try {
    const raw = localStorage.getItem(PWA_GATE_STORAGE_KEY);
    if (!raw) return DEFAULT_GATE;
    const parsed = JSON.parse(raw) as Partial<PwaGateState>;
    return {
      step: parsed.step === 'done' || parsed.step === 'notifications' ? parsed.step : 'install',
      notificationsAddressed: Boolean(parsed.notificationsAddressed),
    };
  } catch {
    return DEFAULT_GATE;
  }
}

export function writePwaGateState(state: PwaGateState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PWA_GATE_STORAGE_KEY, JSON.stringify(state));
}

export function shouldShowPwaInstallGate(): boolean {
  if (!isPwaInstallGateEnabled()) return false;
  if (!isMobilePhoneViewport()) return false;

  const state = readPwaGateState();
  if (state.step === 'done' || state.notificationsAddressed) return false;

  // Step 2 (notifications) — show even in mobile browser after user confirmed install
  if (state.step === 'notifications') return true;

  // Step 1 — installed PWA shell skips straight to notifications
  if (isStandalonePwa()) return true;

  return true;
}

export function resolveInitialGateStep(): PwaGateStep {
  const state = readPwaGateState();
  if (state.notificationsAddressed || state.step === 'done') return 'done';
  if (state.step === 'notifications') return 'notifications';
  if (isStandalonePwa()) return 'notifications';
  return 'install';
}

export async function requestWebPushPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result === 'granted' ? 'granted' : 'denied';
}

export function markNotificationsAddressed(): void {
  writePwaGateState({ step: 'done', notificationsAddressed: true });
}

export function markInstallCompleteAdvanceToNotifications(): void {
  writePwaGateState({ step: 'notifications', notificationsAddressed: false });
}

/** Mobile PWA install gate — detect device, standalone mode, and gate completion. */

export const PWA_GATE_STORAGE_KEY = 'church-hub-pwa-gate-v2';

export type PwaGateStep = 'install' | 'notifications' | 'done';

export interface PwaGateState {
  step: PwaGateStep;
  notificationsAddressed: boolean;
  /** Android install prompt accepted while still in browser tab */
  installAccepted?: boolean;
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

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

export function isIosSafari(): boolean {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
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

/** Install step complete — standalone launch or Android prompt accepted. */
export function completeInstallStep(opts?: { installAccepted?: boolean }): boolean {
  const standalone = isStandalonePwa();
  writePwaGateState({
    step: 'notifications',
    notificationsAddressed: false,
    installAccepted: standalone || Boolean(opts?.installAccepted),
  });
  return standalone;
}

export function canShowNotificationsStep(): boolean {
  const state = readPwaGateState();
  return isStandalonePwa() || Boolean(state.installAccepted);
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
      installAccepted: Boolean(parsed.installAccepted),
    };
  } catch {
    return DEFAULT_GATE;
  }
}

export function writePwaGateState(state: PwaGateState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PWA_GATE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Public field forms (QR/NFC) must load as plain browser pages —
 * never block them behind "Install app".
 */
export function isPublicWebFormPath(pathname?: string): boolean {
  const path =
    pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!path) return false;
  return (
    path === '/outreach/capture' ||
    path.startsWith('/outreach/capture/') ||
    path.startsWith('/outreach/register')
  );
}

export function shouldShowPwaInstallGate(): boolean {
  if (!isPwaInstallGateEnabled()) return false;
  if (isPublicWebFormPath()) return false;
  if (!isMobilePhoneViewport()) return false;

  const state = readPwaGateState();
  if (state.step === 'done' || state.notificationsAddressed) return false;

  // Step 2 — only after install (standalone shell or Android prompt accepted)
  if (state.step === 'notifications') {
    return canShowNotificationsStep();
  }

  // Step 1 — installed PWA shell skips straight to notifications
  if (isStandalonePwa()) return true;

  return true;
}

export function resolveInitialGateStep(): PwaGateStep {
  const state = readPwaGateState();
  if (state.notificationsAddressed || state.step === 'done') return 'done';
  if (state.step === 'notifications' && canShowNotificationsStep()) return 'notifications';
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

export function markInstallCompleteAdvanceToNotifications(installAccepted = false): void {
  writePwaGateState({
    step: 'notifications',
    notificationsAddressed: false,
    installAccepted: installAccepted || isStandalonePwa(),
  });
}

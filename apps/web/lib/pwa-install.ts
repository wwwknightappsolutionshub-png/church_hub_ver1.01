/** Mobile PWA install gate — detect device, standalone mode, and gate completion. */

export const PWA_GATE_STORAGE_KEY = 'church-hub-pwa-gate-v2';
export const PWA_ACCOUNT_CREATED_KEY = 'church-hub-pwa-account-created';
export const PWA_EXIT_PROMPT_SHOWN_KEY = 'church-hub-pwa-exit-prompt-shown';
export const PWA_SHOW_INSTALL_EVENT = 'church-hub:show-pwa-install';

export type PwaGateStep = 'install' | 'notifications' | 'done';

export interface PwaGateState {
  step: PwaGateStep;
  notificationsAddressed: boolean;
  /** Android install prompt accepted while still in browser tab */
  installAccepted?: boolean;
  /** User dismissed the optional install modal (browser tab only) */
  installPromptDismissed?: boolean;
}

const DEFAULT_GATE: PwaGateState = { step: 'install', notificationsAddressed: false };

export function isPwaInstallGateEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_PWA_INSTALL_GATE !== 'false';
}

/** Phone + tablet touch viewports — install prompts target these, not desktop. */
export function isMobileOrTabletViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const tablet = window.matchMedia('(max-width: 1024px)').matches;
  const touch =
    window.matchMedia('(pointer: coarse)').matches ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  return tablet && touch;
}

/** @deprecated Use isMobileOrTabletViewport */
export function isMobilePhoneViewport(): boolean {
  return isMobileOrTabletViewport();
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
    installPromptDismissed: false,
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
      installPromptDismissed: Boolean(parsed.installPromptDismissed),
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

/** Marketing pages where exit-intent install prompt is allowed. */
export function isMarketingPath(pathname?: string): boolean {
  const path =
    pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!path) return false;
  return (
    path === '/' ||
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/register' ||
    path.startsWith('/legal/')
  );
}

/** Eligible for optional install modal (not standalone, not dismissed, mobile/tablet). */
export function isPwaInstallEligible(): boolean {
  if (!isPwaInstallGateEnabled()) return false;
  if (isPublicWebFormPath()) return false;
  if (!isMobileOrTabletViewport()) return false;
  if (isStandalonePwa()) return false;

  const state = readPwaGateState();
  if (state.step === 'done' || state.notificationsAddressed) return false;
  if (state.installPromptDismissed) return false;
  return true;
}

/** Step 2 — only inside installed PWA after install is complete. */
export function shouldShowPwaNotificationsGate(): boolean {
  if (!isPwaInstallGateEnabled()) return false;
  if (isPublicWebFormPath()) return false;
  if (!isMobileOrTabletViewport()) return false;

  const state = readPwaGateState();
  if (state.notificationsAddressed || state.step === 'done') return false;

  if (state.step === 'notifications' && canShowNotificationsStep()) return true;
  if (isStandalonePwa()) return true;

  return false;
}

/** @deprecated Install gate no longer blocks first visit — use shouldShowPwaNotificationsGate */
export function shouldShowPwaInstallGate(): boolean {
  return shouldShowPwaNotificationsGate();
}

export function resolveInitialGateStep(): PwaGateStep {
  const state = readPwaGateState();
  if (state.notificationsAddressed || state.step === 'done') return 'done';
  if (state.step === 'notifications' && canShowNotificationsStep()) return 'notifications';
  if (isStandalonePwa()) return 'notifications';
  return 'install';
}

export function markAccountCreatedShowInstall(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PWA_ACCOUNT_CREATED_KEY, '1');
}

export function consumeAccountCreatedInstallPrompt(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  if (sessionStorage.getItem(PWA_ACCOUNT_CREATED_KEY) !== '1') return false;
  sessionStorage.removeItem(PWA_ACCOUNT_CREATED_KEY);
  return true;
}

export function canShowExitIntentInstallPrompt(): boolean {
  if (!isPwaInstallEligible()) return false;
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(PWA_EXIT_PROMPT_SHOWN_KEY) !== '1';
}

export function markExitIntentInstallPromptShown(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PWA_EXIT_PROMPT_SHOWN_KEY, '1');
}

export function markInstallPromptDismissed(): void {
  const state = readPwaGateState();
  writePwaGateState({ ...state, installPromptDismissed: true });
}

export function requestPwaInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PWA_SHOW_INSTALL_EVENT));
}

export async function requestWebPushPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result === 'granted' ? 'granted' : 'denied';
}

export function markNotificationsAddressed(): void {
  const state = readPwaGateState();
  writePwaGateState({ ...state, step: 'done', notificationsAddressed: true });
}

export function markInstallCompleteAdvanceToNotifications(installAccepted = false): void {
  writePwaGateState({
    step: 'notifications',
    notificationsAddressed: false,
    installAccepted: installAccepted || isStandalonePwa(),
    installPromptDismissed: false,
  });
}

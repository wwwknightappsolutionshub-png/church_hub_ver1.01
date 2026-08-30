import { COOKIE_CONSENT_STORAGE_KEY } from '@/components/privacy/CookieConsentBanner';

export function reopenCookiePreferences() {
  try {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('churchhub:reopen-cookie-consent'));
}

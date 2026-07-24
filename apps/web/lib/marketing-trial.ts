/** Client-side helpers for marketing trial → register handoff. */

export type TrialRegisterPrefill = {
  email: string;
  firstName: string;
  lastName: string;
};

const STORAGE_KEY = 'churchhub_trial_register_prefill';

export function parseNameFromEmailLocalPart(
  email: string,
): { firstName: string; lastName: string } | null {
  const local = (email.split('@')[0] ?? '').trim();
  if (!local) return null;

  const parts = local
    .split(/[._+\-]+/)
    .map((p) => p.replace(/[^a-zA-Z]/g, ''))
    .filter((p) => p.length >= 2);

  if (parts.length < 2) return null;
  if (!parts.every((p) => /^[a-zA-Z]+$/.test(p))) return null;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return {
    firstName: capitalize(parts[0]),
    lastName: capitalize(parts[1]),
  };
}

export function storeTrialRegisterPrefill(data: TrialRegisterPrefill) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function readTrialRegisterPrefill(): TrialRegisterPrefill | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrialRegisterPrefill;
    if (!parsed?.email || !parsed?.firstName || !parsed?.lastName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTrialRegisterPrefill() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const DISMISS_KEY = 'churchhub_trial_modal_dismissed';

export function wasTrialModalDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTrialModalDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

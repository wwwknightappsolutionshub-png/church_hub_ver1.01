import axios from 'axios';
import { api } from '@/lib/api';
import { publicChurchApi } from '@/lib/public-church-api';

async function requestWithFallback<T>(
  request: (path: string) => Promise<{ data: T }>,
  paths: string[],
): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      const res = await request(path);
      return res.data;
    } catch (err) {
      lastError = err;
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        continue;
      }
      throw err;
    }
  }
  if (axios.isAxiosError(lastError) && lastError.response?.status === 404) {
    throw new Error(
      'Membership API routes not found. Restart the Church API (port 4000): pnpm --filter @church-hub/api dev',
    );
  }
  throw lastError;
}

export type PublicMembershipFormResponse = {
  churchName: string;
  slug: string;
  form: import('@church-hub/shared-types').LandingMembershipFormConfig;
  serviceUnits: { id: string; name: string; description?: string | null }[];
};

export type RegisterMembershipResponse = {
  id: string;
  message: string;
  emailSent?: boolean;
  portalAccountCreated?: boolean;
};

export function fetchPublicMembershipForm(slug: string) {
  const enc = encodeURIComponent(slug);
  return requestWithFallback<PublicMembershipFormResponse>(
    (path) => publicChurchApi.get(path),
    [
      `/church-landing/${enc}/membership/form`,
      `/churches/${enc}/membership/form`,
    ],
  );
}

export function registerPublicMembership(
  slug: string,
  payload: Record<string, unknown>,
) {
  const enc = encodeURIComponent(slug);
  return requestWithFallback<RegisterMembershipResponse>(
    (path) => publicChurchApi.post(path, payload),
    [
      `/church-landing/${enc}/membership/register`,
      `/churches/${enc}/membership/register`,
    ],
  );
}

export function fetchAdminMembershipForm() {
  return requestWithFallback<{
    form: import('@church-hub/shared-types').LandingMembershipFormConfig;
    defaults: import('@church-hub/shared-types').LandingMembershipFormConfig;
  }>((path) => api.get(path), [
    '/churches/landing/membership-form/admin',
    '/church-landing/admin/membership-form',
  ]);
}

export function saveAdminMembershipForm(payload: unknown) {
  return requestWithFallback<{ form: import('@church-hub/shared-types').LandingMembershipFormConfig }>(
    (path) => api.patch(path, payload),
    ['/churches/landing/membership-form', '/church-landing/admin/membership-form'],
  );
}

export function resetAdminMembershipForm() {
  return requestWithFallback<{ form: import('@church-hub/shared-types').LandingMembershipFormConfig }>(
    (path) => api.post(path),
    [
      '/churches/landing/membership-form/reset',
      '/church-landing/admin/membership-form/reset',
    ],
  );
}

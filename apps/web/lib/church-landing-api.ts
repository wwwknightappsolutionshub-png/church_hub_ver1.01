import axios from 'axios';
import { api } from '@/lib/api';
import {
  prepareLandingBrandingPatch,
  sanitizeChurchLandingForSave,
  type ChurchLandingAdminDto,
  type ChurchLandingContent,
  type LandingBrandingPatch,
} from '@church-hub/shared-types';

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
      'Church landing API not found. Restart the API: pnpm --filter @church-hub/api dev',
    );
  }
  throw lastError;
}

/** Normalize and strip invalid rows before PATCH so server validation passes */
export function prepareLandingForSave(
  content: ChurchLandingContent,
  churchName?: string,
): ChurchLandingContent {
  return sanitizeChurchLandingForSave(content, churchName);
}

export function fetchChurchLandingAdmin() {
  return requestWithFallback<ChurchLandingAdminDto>(
    (path) => api.get(path),
    ['/churches/landing/admin', '/church-landing/admin/landing'],
  );
}

export function saveChurchLanding(content: ChurchLandingContent, churchName?: string) {
  const payload = prepareLandingForSave(content, churchName);
  return requestWithFallback<ChurchLandingAdminDto>(
    (path) => api.patch(path, payload),
    ['/churches/landing', '/church-landing/admin/landing'],
  );
}

export function saveChurchLandingBranding(payload: LandingBrandingPatch) {
  return requestWithFallback<ChurchLandingAdminDto>(
    (path) => api.patch(path, payload),
    ['/churches/landing/branding', '/church-landing/admin/landing/branding'],
  );
}

/** Save landing content and branding in one request (works without separate branding route). */
export async function saveChurchLandingAll(
  content: ChurchLandingContent,
  branding: LandingBrandingPatch,
  churchName?: string,
  churchSlug?: string,
): Promise<ChurchLandingAdminDto> {
  const landing = prepareLandingForSave(content, churchName);
  const logo = branding.logoUrl?.trim();
  if (logo?.startsWith('data:') || logo?.startsWith('blob:')) {
    throw new Error(
      'Logo must be uploaded using "Upload logo" — embedded images cannot be saved. Re-upload the logo, then save again.',
    );
  }
  const brandingPatch = churchSlug
    ? prepareLandingBrandingPatch(
        { publicDomain: branding.publicDomain, logoUrl: branding.logoUrl },
        churchSlug,
      )
    : {
        publicDomain: branding.publicDomain?.trim() || null,
        logoUrl: branding.logoUrl,
      };
  return requestWithFallback<ChurchLandingAdminDto>(
    (path) => api.patch(path, { landing, branding: brandingPatch }),
    ['/churches/landing', '/church-landing/admin/landing'],
  );
}

export function applyChurchLandingTemplate(templateId: ChurchLandingContent['templateId']) {
  return requestWithFallback<ChurchLandingAdminDto>(
    (path) => api.post(path, { templateId }),
    ['/churches/landing/apply-template', '/church-landing/admin/landing/apply-template'],
  );
}

export function formatLandingSaveError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
    if (msg && typeof msg === 'object') {
      const flat = msg as {
        fieldErrors?: Record<string, string[]>;
        formErrors?: string[];
      };
      const parts = [
        ...(flat.formErrors ?? []),
        ...Object.entries(flat.fieldErrors ?? {}).flatMap(([k, v]) =>
          (Array.isArray(v) ? v : []).map((e) => `${k}: ${e}`),
        ),
      ];
      if (parts.length) return parts.slice(0, 6).join('; ');
    }
    if (err.response?.status === 401) return 'Session expired — sign in again';
    if (err.response?.status === 403) return 'You need church ADMIN access to save';
    if (err.response?.status === 413) {
      return 'Save payload too large — use Upload from device for images instead of pasting large URLs';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not save landing page';
}

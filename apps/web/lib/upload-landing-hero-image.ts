import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { resizeImageForUpload } from '@/lib/resize-image';

export interface LandingHeroUploadResult {
  url: string;
  path: string;
}

export async function uploadLandingHeroImage(file: File): Promise<LandingHeroUploadResult> {
  const blob = await resizeImageForUpload(file, {
    maxEdge: 1920,
    maxBytes: 900_000,
    quality: 0.88,
  });
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const form = new FormData();
  form.append('file', new File([blob], `hero.${ext}`, { type: blob.type }));

  try {
    const { data } = await api.post<LandingHeroUploadResult>('/uploads/landing-hero', form);
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      throw new Error(
        'Hero image upload API not found. Restart the API: pnpm --filter @church-hub/api dev',
      );
    }
    if (err instanceof AxiosError && typeof err.response?.data?.message === 'string') {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

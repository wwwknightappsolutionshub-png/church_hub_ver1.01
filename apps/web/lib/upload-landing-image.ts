import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { resizeImageForUpload } from '@/lib/resize-image';

export type LandingImageSlot = 'hero' | 'about' | 'announcement';

export interface LandingImageUploadResult {
  url: string;
  path: string;
}

const SLOT_CONFIG: Record<
  LandingImageSlot,
  { endpoint: string; maxEdge: number; maxBytes: number; quality?: number; filename: string }
> = {
  hero: {
    endpoint: '/uploads/landing-hero',
    maxEdge: 1920,
    maxBytes: 900_000,
    quality: 0.88,
    filename: 'hero',
  },
  about: {
    endpoint: '/uploads/landing-about-photo',
    maxEdge: 1200,
    maxBytes: 600_000,
    quality: 0.88,
    filename: 'pastor',
  },
  announcement: {
    endpoint: '/uploads/landing-announcement-image',
    maxEdge: 1200,
    maxBytes: 600_000,
    quality: 0.88,
    filename: 'announcement',
  },
};

export async function uploadLandingImage(
  file: File,
  slot: LandingImageSlot,
): Promise<LandingImageUploadResult> {
  const config = SLOT_CONFIG[slot];
  const blob = await resizeImageForUpload(file, {
    maxEdge: config.maxEdge,
    maxBytes: config.maxBytes,
    quality: config.quality,
  });
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const form = new FormData();
  form.append('file', new File([blob], `${config.filename}.${ext}`, { type: blob.type }));

  try {
    const { data } = await api.post<LandingImageUploadResult>(config.endpoint, form);
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      throw new Error(
        'Image upload API not found. Restart the API: pnpm --filter @church-hub/api dev',
      );
    }
    if (err instanceof AxiosError && typeof err.response?.data?.message === 'string') {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

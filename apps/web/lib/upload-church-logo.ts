import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { resizeImageForUpload } from '@/lib/resize-image';

export interface ChurchLogoUploadResult {
  url: string;
  path: string;
}

export async function uploadChurchLogo(file: File): Promise<ChurchLogoUploadResult> {
  const blob = await resizeImageForUpload(file, { maxEdge: 512, maxBytes: 400_000 });
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const form = new FormData();
  form.append('file', new File([blob], `logo.${ext}`, { type: blob.type }));

  try {
    const { data } = await api.post<ChurchLogoUploadResult>('/uploads/church-logo', form);
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      throw new Error(
        'Logo upload API not found. Restart the API: pnpm --filter @church-hub/api dev',
      );
    }
    if (err instanceof AxiosError && typeof err.response?.data?.message === 'string') {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

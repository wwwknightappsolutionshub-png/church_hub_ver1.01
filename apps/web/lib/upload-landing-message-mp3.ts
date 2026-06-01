import { AxiosError } from 'axios';
import { api } from '@/lib/api';

export interface LandingMessageMp3UploadResult {
  url: string;
  path: string;
}

export async function uploadLandingMessageMp3(file: File): Promise<LandingMessageMp3UploadResult> {
  const form = new FormData();
  form.append('file', file);

  try {
    const { data } = await api.post<LandingMessageMp3UploadResult>(
      '/uploads/landing-message-mp3',
      form,
    );
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      throw new Error(
        'Message audio upload API not found. Restart the API: pnpm --filter @church-hub/api dev',
      );
    }
    if (err instanceof AxiosError && typeof err.response?.data?.message === 'string') {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

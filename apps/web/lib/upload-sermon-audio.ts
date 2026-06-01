import { AxiosError } from 'axios';
import { api } from '@/lib/api';

export interface SermonAudioUploadResult {
  url: string;
  path: string;
}

export async function uploadSermonAudio(file: File): Promise<SermonAudioUploadResult> {
  const form = new FormData();
  form.append('file', file);

  try {
    const { data } = await api.post<SermonAudioUploadResult>('/uploads/sermon-audio', form);
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      throw new Error(
        'Sermon audio upload API not found. Restart the API: pnpm --filter @church-hub/api dev',
      );
    }
    if (err instanceof AxiosError && typeof err.response?.data?.message === 'string') {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

/** Best-effort duration from a local file before upload. */
export function readLocalAudioDurationSec(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = audio.duration;
      resolve(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

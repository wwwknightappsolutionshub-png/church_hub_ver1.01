import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { blobToDataUrl, resizeImageForUpload } from '@/lib/resize-image';

export interface ProfileAvatarUploadResult {
  url: string;
  path: string;
}

const MULTIPART_PATHS = ['/auth/profile-avatar', '/uploads/profile-avatar'] as const;
const MAX_DATA_URL_LENGTH = 750_000;

async function postMultipart(blob: Blob, filename: string): Promise<ProfileAvatarUploadResult> {
  const form = new FormData();
  form.append('file', new File([blob], filename, { type: blob.type }));

  let lastError: unknown;
  for (const path of MULTIPART_PATHS) {
    try {
      const { data } = await api.post<ProfileAvatarUploadResult>(path, form);
      return data;
    } catch (err) {
      lastError = err;
      const status = err instanceof AxiosError ? err.response?.status : undefined;
      if (status === 404 || status === 405) continue;
      throw err;
    }
  }
  throw lastError;
}

async function postDataUrl(dataUrl: string): Promise<ProfileAvatarUploadResult> {
  try {
    const { data } = await api.post<ProfileAvatarUploadResult>('/auth/profile-avatar-data', {
      imageDataUrl: dataUrl,
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError && (err.response?.status === 404 || err.response?.status === 405)) {
      return { url: dataUrl, path: dataUrl };
    }
    throw err;
  }
}

/** Upload resized profile photo; falls back to data URL when file endpoints are unavailable. */
export async function uploadProfileAvatar(file: File): Promise<ProfileAvatarUploadResult> {
  const blob = await resizeImageForUpload(file, { maxEdge: 512, maxBytes: 280_000 });
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const filename = `avatar.${ext}`;

  try {
    return await postMultipart(blob, filename);
  } catch (multipartErr) {
    const status =
      multipartErr instanceof AxiosError ? multipartErr.response?.status : undefined;
    if (status && status !== 404 && status !== 405) {
      throw multipartErr;
    }
  }

  const dataUrl = await blobToDataUrl(blob);
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Photo is too large. Try a smaller image or crop before uploading.');
  }

  return postDataUrl(dataUrl);
}

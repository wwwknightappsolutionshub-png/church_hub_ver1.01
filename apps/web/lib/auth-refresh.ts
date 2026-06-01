import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { api, clearAuthTokens, setAuthTokens } from '@/lib/api';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const { data } = await api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    });
    setAuthTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearAuthTokens();
    return null;
  }
}

/** Attach once to the shared axios instance — refreshes JWT on 401 and retries once. */
export function attachAuthRefreshInterceptor(): void {
  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (
        error.response?.status !== 401 ||
        !config ||
        config._retry ||
        config.url?.includes('/auth/refresh') ||
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/logout')
      ) {
        return Promise.reject(error);
      }

      config._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      if (!token) return Promise.reject(error);

      config.headers.Authorization = `Bearer ${token}`;
      return api.request(config);
    },
  );
}

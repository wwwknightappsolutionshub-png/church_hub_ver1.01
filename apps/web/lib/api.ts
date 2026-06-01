import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary — manual Content-Type breaks uploads.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export function setAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

import axios, { AxiosError, type AxiosInstance } from 'axios';

import { authStore } from './auth-store';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(`${baseURL}/auth/refresh`, { refreshToken });
    authStore.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    authStore.clear();
    return null;
  }
};

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as
      | (typeof err.config & { _retried?: boolean })
      | undefined;
    if (
      err.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/')
    ) {
      original._retried = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const fresh = await refreshPromise;
      refreshPromise = null;
      if (fresh) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${fresh}`;
        return api.request(original);
      }
    }
    throw err;
  },
);

export const apiErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
};

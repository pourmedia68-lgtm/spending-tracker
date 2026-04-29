import { useSyncExternalStore } from 'react';

import { api } from '@/lib/api';
import { authStore, type AuthUser } from '@/lib/auth-store';

const subscribe = (cb: () => void) => authStore.subscribe(cb);
const snapshot = () => ({
  user: authStore.getUser(),
  accessToken: authStore.getAccessToken(),
});
const serverSnapshot = () => ({ user: null, accessToken: null });

export interface UseAuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

export const useAuth = (): UseAuthState => {
  const { user, accessToken } = useSyncExternalStore(
    subscribe,
    snapshot,
    serverSnapshot,
  );

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', { email, password });
    if (data.user.role !== 'ADMIN') {
      throw new Error('This account does not have admin access.');
    }
    authStore.setAll(data.accessToken, data.refreshToken, data.user);
    return data.user;
  };

  const logout = () => {
    const refreshToken = authStore.getRefreshToken();
    if (refreshToken) {
      // Best-effort revoke. Ignore errors so the user is always signed out
      // locally even if the API is unreachable.
      api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    authStore.clear();
  };

  return {
    user,
    isAuthenticated: Boolean(accessToken && user),
    isAdmin: user?.role === 'ADMIN',
    login,
    logout,
  };
};

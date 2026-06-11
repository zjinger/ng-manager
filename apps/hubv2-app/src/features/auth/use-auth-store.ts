import { create } from 'zustand';
import { getStoredUser, setStoredUser, clearAuth, setStoredStatus, getStoredStatus } from '@/lib/auth/utils';
import { client, setApiBaseUrl, setUnauthorizedHandler } from '@/lib/api/client';
import { encryptLoginPassword } from '@/lib/auth/crypto';
import type { AdminProfile, LoginChallenge } from './types';

interface AuthState {
  status: 'idle' | 'signIn' | 'signOut';
  user: AdminProfile | null;
  isLoading: boolean;
  signIn: (username: string, password: string, remember?: boolean, apiBaseUrl?: string) => Promise<void>;
  signOut: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  isLoading: false,

  signIn: async (username: string, password: string, remember = true, apiBaseUrl?: string) => {
    set({ isLoading: true });
    try {
      if (apiBaseUrl) {
        setApiBaseUrl(apiBaseUrl);
      }

      // Step 1: Get challenge
      const challenge = await client.get<LoginChallenge>('/admin/auth/login/challenge');

      // Step 2: Encrypt password
      const cipherText = encryptLoginPassword(password, challenge.nonce);

      // Step 3: Submit login
      const user = await client.post<AdminProfile>('/admin/auth/login', {
        username,
        nonce: challenge.nonce,
        cipherText,
        remember,
      });

      // Step 4: Store and update state
      if (remember) {
        setStoredUser(user);
        setStoredStatus('signIn');
      } else {
        clearAuth();
      }
      set({ status: 'signIn', user, isLoading: false });
    } catch (error) {
      clearAuth();
      set({ status: 'signOut', user: null, isLoading: false });
      throw error;
    }
  },

  signOut: () => {
    clearAuth();
    set({ status: 'signOut', user: null });
    client.post('/admin/auth/logout').catch(() => {});
  },

  hydrate: async () => {
    const storedStatus = getStoredStatus();
    const storedUser = getStoredUser();

    if (storedStatus === 'signIn' && storedUser) {
      set({ status: 'signIn', user: storedUser });
    }

    try {
      // Verify session is still valid
      const currentUser = await client.get<AdminProfile>('/admin/auth/me');
      setStoredUser(currentUser);
      setStoredStatus('signIn');
      set({ status: 'signIn', user: currentUser });
    } catch {
      clearAuth();
      set({ status: 'signOut', user: null });
    }
  },
}));

setUnauthorizedHandler(() => {
  clearAuth();
  useAuthStore.setState({ status: 'signOut', user: null, isLoading: false });
});

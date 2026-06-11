import { create } from 'zustand';
import { getStoredUser, setStoredUser, clearAuth, setStoredStatus, getStoredStatus } from '@/lib/auth/utils';
import { client } from '@/lib/api/client';
import { encryptLoginPassword } from '@/lib/auth/crypto';
import type { AdminProfile, LoginChallenge } from './types';

interface AuthState {
  status: 'idle' | 'signIn' | 'signOut';
  user: AdminProfile | null;
  isLoading: boolean;
  signIn: (username: string, password: string, remember?: boolean) => Promise<void>;
  signOut: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  isLoading: false,

  signIn: async (username: string, password: string, remember = true) => {
    set({ isLoading: true });
    try {
      // Step 1: Get challenge
      const challenge = (await client.get('/admin/auth/login/challenge')) as LoginChallenge;

      // Step 2: Encrypt password
      const cipherText = encryptLoginPassword(password, challenge.nonce);

      // Step 3: Submit login
      const user = (await client.post('/admin/auth/login', {
        username,
        nonce: challenge.nonce,
        cipherText,
        remember,
      })) as AdminProfile;

      // Step 4: Store and update state
      setStoredUser(user);
      setStoredStatus('signIn');
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

    if (storedStatus !== 'signIn' || !storedUser) {
      set({ status: 'signOut', user: null });
      return;
    }

    try {
      // Verify session is still valid
      const currentUser = (await client.get('/admin/auth/me')) as AdminProfile;
      setStoredUser(currentUser);
      set({ status: 'signIn', user: currentUser });
    } catch {
      clearAuth();
      set({ status: 'signOut', user: null });
    }
  },
}));

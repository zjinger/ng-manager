import type { AuthUser } from '../../../core/auth/auth.types';

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface ProfileViewModel {
  user: AuthUser | null;
  initials: string;
}

import { Inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HubApiService } from '../http/hub-api.service';
import { HubApiError } from '../http/api-error.interceptor';
import { HUB_LOGIN_AES_KEY, encryptLoginPassword } from '../utils/crypto.util';

export type AdminUserStatus = 'active' | 'disabled';
export type AdminUserRole = 'admin' | 'user';

export interface AdminProfile {
  id: string;
  userId?: string | null;
  username: string;
  nickname?: string | null;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  status: AdminUserStatus;
  role: AdminUserRole;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LoginChallenge {
  nonce: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  public readonly profile = signal<AdminProfile | null>(null);
  public readonly checking = signal(false);

  private hasCheckedSession = false;
  private refreshPromise: Promise<AdminProfile | null> | null = null;

  public constructor(
    private readonly api: HubApiService,
    @Inject(HUB_LOGIN_AES_KEY) private readonly loginAesKey: string
  ) {}

  public async ensureSession(force = false): Promise<AdminProfile | null> {
    if (!force && this.hasCheckedSession) {
      return this.profile();
    }

    if (this.refreshPromise !== null) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshProfile().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  public async refreshProfile(): Promise<AdminProfile | null> {
    this.checking.set(true);

    try {
      const profile = await firstValueFrom(this.api.get<AdminProfile>('/api/admin/auth/me'));
      this.profile.set(profile);
      this.hasCheckedSession = true;
      return profile;
    } catch (error) {
      if (error instanceof HubApiError && error.status === 401) {
        this.profile.set(null);
        this.hasCheckedSession = true;
        return null;
      }
      throw error;
    } finally {
      this.checking.set(false);
    }
  }

  public async login(username: string, password: string): Promise<AdminProfile> {
    const challenge = await firstValueFrom(
      this.api.get<LoginChallenge>('/api/admin/auth/login/challenge')
    );

    const encrypted = await encryptLoginPassword(`${challenge.nonce}:${password}`, this.loginAesKey);

    const profile = await firstValueFrom(
      this.api.post<
        AdminProfile,
        { username: string; nonce: string; iv: string; cipherText: string }
      >('/api/admin/auth/login', {
        username,
        nonce: challenge.nonce,
        iv: encrypted.iv,
        cipherText: encrypted.cipherText
      })
    );

    this.profile.set(profile);
    this.hasCheckedSession = true;
    return profile;
  }

  public async changePassword(oldPassword: string, newPassword: string): Promise<AdminProfile> {
    const profile = await firstValueFrom(
      this.api.post<AdminProfile, { oldPassword: string; newPassword: string }>(
        '/api/admin/auth/change-password',
        { oldPassword, newPassword }
      )
    );

    this.profile.set(profile);
    this.hasCheckedSession = true;
    return profile;
  }

  public async logout(): Promise<void> {
    await firstValueFrom(this.api.post<{ ok: boolean }, Record<string, never>>('/api/admin/auth/logout', {}));
    this.profile.set(null);
    this.hasCheckedSession = true;
  }

  public clearSession(): void {
    this.profile.set(null);
    this.hasCheckedSession = true;
  }
}


import { computed, inject, Injectable, signal } from '@angular/core';

import type { HubAuthUser } from './user.types';
import { ApiClient, ApiSuccess } from '../api';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { LocalStateStore, LS_KEYS } from '../local-state';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly apiClient = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly ls = inject(LocalStateStore);

  private readonly currentUserState = signal<HubAuthUser | null>(null);
  private readonly initializedState = signal(false);

  readonly currentUser = computed(() => this.currentUserState());
  readonly currentUserId = computed(() => this.currentUserState()?.userId);
  readonly initialized = computed(() => this.initializedState());

  //   是否已经绑定用户
  readonly isAuthenticated = computed(() => !!this.currentUserState());

  loadCurrentUser(): void {
    // TODO:后面换成apiClient
    const token = this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, '').trim();
    if (!token) return;
    this.http
      .get<ApiSuccess<HubAuthUser>>('/hubv2/api/personal/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .subscribe({
        next: (data) => {
          this.setCurrentUser(data.data);
          this.currentUserState.update((user) => {
            return { ...user, token };
          });
          this.markInitialized();
        },
        error: () => {
          this.setCurrentUser(null);
        },
      });
  }

  ensureUserLoaded(): void {
    if (!this.initializedState()) {
      this.loadCurrentUser();
    }
  }

  setCurrentUser(user: HubAuthUser | null): void {
    this.currentUserState.set(user);
  }

  markInitialized(): void {
    this.initializedState.set(true);
  }

  reset(): void {
    this.currentUserState.set(null);
    this.initializedState.set(false);
  }
}

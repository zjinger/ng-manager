import { computed, inject, Injectable, signal } from '@angular/core';

import type { HubAuthUser } from './user.types';
import { ApiClient, ApiSuccess } from '../api';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { LocalStateStore, LS_KEYS } from '../local-state';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly apiClient = inject(ApiClient);
  private readonly projectState = inject(ProjectStateService);
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
    const projectId = this.projectState.currentProjectId();
    if (!token || !projectId) return;

    from(
      this.apiClient.hubRequestWithPersonalToken<HubAuthUser>({
        path: '/me',
        projectId,
      }),
    ).subscribe({
      next: (data) => {
        this.setCurrentUser(data);
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

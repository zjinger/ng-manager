import { computed, inject, Injectable, signal } from '@angular/core';

import { UiNotifierService } from '@app/core/ui-notifier.service';
import { from } from 'rxjs';
import { ApiClient } from '../../api';
import { LocalStateStore, LS_KEYS } from '../../local-state';
import { ProjectContextStore } from '../project-context/project-context.store';
import type { HubAuthUser } from './user.types';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly apiClient = inject(ApiClient);
  private readonly projectContextStore = inject(ProjectContextStore);
  private readonly ls = inject(LocalStateStore);
  private readonly notify = inject(UiNotifierService);

  private readonly currentUserState = signal<HubAuthUser | null>(null);
  private readonly hubUserTokenState = signal<string | null>(null);
  private readonly initializedState = signal(false);

  readonly currentUser = computed(() => this.currentUserState());
  readonly currentUserId = computed(() =>
    !!this.currentUserState() ? this.currentUserState()!.userId : '',
  );
  readonly hubUserToken = computed(() => this.hubUserTokenState());
  readonly initialized = computed(() => this.initializedState());

  //   是否已经绑定用户
  readonly isAuthenticated = computed(() => !!this.currentUserState());
  readonly hasHubUserToken = computed(() => !!this.hubUserTokenState());

  // 获取当前用户(包括token信息)
  loadCurrentUser(): void {
    const token = this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, '').trim();
    const projectId = this.projectContextStore.currentProjectId();
    if (!token || !projectId) return;
    this.setHubUserToken(token);
    from(
      this.apiClient.hubRequestWithPersonalToken<HubAuthUser>({
        path: '/me',
        projectId,
      }),
    ).subscribe({
      next: (data) => {
        this.setCurrentUser(data);
        this.markInitialized();
      },
      error: () => {
        this.notify.error('Personal Token 验证失败');
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

  setHubUserToken(token: string | null): void {
    const nextToken = !!token ? token.trim() : '';
    if (nextToken) {
      this.ls.set(LS_KEYS.token.hubV2PersonalToken, nextToken);
      this.hubUserTokenState.set(nextToken);
      return;
    }
    this.hubUserTokenState.set(null);
    this.currentUserState.set(null);
    this.ls.remove(LS_KEYS.token.hubV2PersonalToken);
  }

  ensureHubUserTokenLoaded(): void {
    if (!this.hubUserTokenState()) {
      this.setHubUserToken(this.ls.get<string>(LS_KEYS.token.hubV2PersonalToken, ''));
    }
  }

  markInitialized(): void {
    this.initializedState.set(true);
  }

  reset(): void {
    this.currentUserState.set(null);
    this.initializedState.set(false);
  }
}

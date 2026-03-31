import { computed, Injectable, signal } from '@angular/core';

import type { HubAuthUser } from './user.types';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly currentUserState = signal<HubAuthUser | null>({
    token:'ngm_uptk_c1a288dcfb661999a9d52597725cee43e61574d1536f1f1b'
  });
  private readonly initializedState = signal(false);

  readonly currentUser = computed(() => this.currentUserState());
  readonly initialized = computed(() => this.initializedState());

  //   是否已经绑定用户
  readonly isAuthenticated = computed(() => !!this.currentUserState());

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

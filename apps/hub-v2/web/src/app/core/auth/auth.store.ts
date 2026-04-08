import { computed, Injectable, signal } from '@angular/core';

import type { AuthUser } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly currentUserState = signal<AuthUser | null>(null);
  private readonly initializedState = signal(false);

  readonly currentUser = computed(() => this.currentUserState());
  readonly initialized = computed(() => this.initializedState());
  readonly isAuthenticated = computed(() => !!this.currentUserState());

  setCurrentUser(user: AuthUser | null): void {
    this.currentUserState.set(user);
  }

  markInitialized(): void {
    this.initializedState.set(true);
  }

  reset(): void {
    this.currentUserState.set(null);
    this.initializedState.set(false);
  }

  readonly userInitial = computed(() =>
    (this.currentUser()?.nickname || this.currentUser()?.username || 'U').slice(0, 1)
  );
}

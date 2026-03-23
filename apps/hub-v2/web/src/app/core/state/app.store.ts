import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly loadingState = signal(false);

  readonly loading = computed(() => this.loadingState());

  setLoading(loading: boolean): void {
    this.loadingState.set(loading);
  }
}

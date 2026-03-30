import { Injectable, computed, signal } from '@angular/core';

export type DashboardRefreshEvent = {
  version: number;
  entityTypes: string[];
  source: 'ws' | 'manual';
};

@Injectable({ providedIn: 'root' })
export class DashboardRefreshBusService {
  private readonly eventState = signal<DashboardRefreshEvent>({
    version: 0,
    entityTypes: [],
    source: 'manual',
  });
  readonly event = computed(() => this.eventState());

  notify(input?: { entityTypes?: string[]; source?: DashboardRefreshEvent['source'] }): void {
    this.eventState.update((previous) => ({
      version: previous.version + 1,
      entityTypes: input?.entityTypes ?? [],
      source: input?.source ?? 'manual',
    }));
  }
}

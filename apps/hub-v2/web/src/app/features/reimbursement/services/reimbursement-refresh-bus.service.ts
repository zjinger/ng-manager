import { computed, Injectable, signal } from '@angular/core';

export type ReimbursementRefreshEvent = {
  version: number;
  claimId: string | null;
  action: string | null;
  source: 'ws' | 'manual';
};

@Injectable({ providedIn: 'root' })
export class ReimbursementRefreshBusService {
  private readonly eventState = signal<ReimbursementRefreshEvent>({
    version: 0,
    claimId: null,
    action: null,
    source: 'manual',
  });

  readonly event = computed(() => this.eventState());

  notify(input?: { claimId?: string | null; action?: string | null; source?: ReimbursementRefreshEvent['source'] }): void {
    this.eventState.update((previous) => ({
      version: previous.version + 1,
      claimId: input?.claimId ?? null,
      action: input?.action ?? null,
      source: input?.source ?? 'manual',
    }));
  }
}

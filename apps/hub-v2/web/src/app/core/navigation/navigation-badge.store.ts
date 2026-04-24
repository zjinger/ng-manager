import { computed, inject, Injectable, signal } from '@angular/core';

import { DashboardApiService } from '../../features/dashboard/services/dashboard-api.service';

@Injectable({ providedIn: 'root' })
export class NavigationBadgeStore {
  private readonly dashboardApi = inject(DashboardApiService);

  private readonly issueCountState = signal(0);
  private readonly rdCountState = signal(0);

  readonly issueCount = computed(() => this.issueCountState());
  readonly rdCount = computed(() => this.rdCountState());

  load(options?: { force?: boolean }): void {
    void options;
    this.dashboardApi.getStats().subscribe({
      next: (stats) => {
        this.issueCountState.set(stats.assignedIssues ?? 0);
        this.rdCountState.set(stats.assignedRdItems ?? stats.inProgressRdItems ?? 0);
      },
      error: () => {
        this.issueCountState.set(0);
        this.rdCountState.set(0);
      },
    });
  }
}

import { computed, inject, Injectable, signal } from '@angular/core';

import { DashboardApiService } from '../services/dashboard-api.service';
import type { DashboardHomeData } from '../models/dashboard.model';

@Injectable()
export class DashboardStore {
  private readonly dashboardApi = inject(DashboardApiService);

  private readonly dataState = signal<DashboardHomeData | null>(null);
  private readonly loadingState = signal(false);

  readonly data = computed(() => this.dataState());
  readonly loading = computed(() => this.loadingState());

  load(): void {
    this.loadingState.set(true);
    this.dashboardApi.getHomeData().subscribe({
      next: (data) => {
        this.dataState.set(data);
        this.loadingState.set(false);
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }
}

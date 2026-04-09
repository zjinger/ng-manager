import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { DashboardApiService } from '../services/dashboard-api.service';
import type { DashboardHomeData } from '../models/dashboard.model';

@Injectable()
export class DashboardStore {
  private readonly dashboardApi = inject(DashboardApiService);

  private readonly dataState = signal<DashboardHomeData | null>(null);
  private readonly loadingState = signal(false);

  readonly data = computed(() => this.dataState());
  readonly loading = computed(() => this.loadingState());

  load(options?: { force?: boolean; silent?: boolean }): void {
    const silent = !!options?.silent;
    if (!silent) {
      this.loadingState.set(true);
    }
    this.dashboardApi.getHomeData(options).subscribe({
      next: (data) => {
        this.dataState.set(data);
        if (!silent) {
          this.loadingState.set(false);
        }
      },
      error: () => {
        if (!silent) {
          this.loadingState.set(false);
        }
      },
    });
  }

  refreshByEntityTypes(entityTypes: string[]): void {
    const data = this.dataState();
    if (!data) {
      this.load({ force: true });
      return;
    }

    const unique = new Set(entityTypes.filter(Boolean));
    if (unique.size === 0) {
      this.load({ force: true, silent: true });
      return;
    }

    const shouldRefreshStats = [...unique].some((type) => type === 'issue' || type === 'rd');
    const shouldRefreshTodos = shouldRefreshStats;
    const shouldRefreshReportedIssues = unique.has('issue');
    const shouldRefreshActivities = [...unique].some(
      (type) => type === 'issue' || type === 'rd' || type === 'announcement' || type === 'document' || type === 'release'
    );
    const shouldRefreshAnnouncements = unique.has('announcement');
    const shouldRefreshDocuments = unique.has('document');

    const requests: {
      stats?: ReturnType<DashboardApiService['getStats']>;
      todos?: ReturnType<DashboardApiService['getTodos']>;
      reportedIssues?: ReturnType<DashboardApiService['getReportedIssues']>;
      activities?: ReturnType<DashboardApiService['getActivities']>;
      announcements?: ReturnType<DashboardApiService['getAnnouncements']>;
      documents?: ReturnType<DashboardApiService['getDocuments']>;
    } = {};

    if (shouldRefreshStats) {
      requests.stats = this.dashboardApi.getStats();
    }
    if (shouldRefreshTodos) {
      requests.todos = this.dashboardApi.getTodos();
    }
    if (shouldRefreshReportedIssues) {
      requests.reportedIssues = this.dashboardApi.getReportedIssues();
    }
    if (shouldRefreshActivities) {
      requests.activities = this.dashboardApi.getActivities();
    }
    if (shouldRefreshAnnouncements) {
      requests.announcements = this.dashboardApi.getAnnouncements();
    }
    if (shouldRefreshDocuments) {
      requests.documents = this.dashboardApi.getDocuments();
    }

    if (Object.keys(requests).length === 0) {
      return;
    }

    forkJoin(requests).subscribe({
      next: (partial) => {
        const current = this.dataState();
        if (!current) {
          this.load({ force: true, silent: true });
          return;
        }
        this.dataState.set({
          stats: partial.stats ?? current.stats,
          todos: partial.todos ?? current.todos,
          reportedIssues: partial.reportedIssues ?? current.reportedIssues,
          activities: partial.activities ?? current.activities,
          announcements: partial.announcements ?? current.announcements,
          documents: partial.documents ?? current.documents,
        });
      },
      error: () => {
        this.load({ force: true, silent: true });
      },
    });
  }
}

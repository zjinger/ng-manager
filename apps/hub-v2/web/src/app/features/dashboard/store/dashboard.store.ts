import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { DashboardApiService } from '../services/dashboard-api.service';
import type { DashboardHomeData } from '../models/dashboard.model';

@Injectable()
export class DashboardStore {
  private readonly dashboardApi = inject(DashboardApiService);

  private readonly dataState = signal<DashboardHomeData | null>(null);
  private readonly loadingState = signal(false);
  private readonly todosTotalState = signal(0);

  readonly data = computed(() => this.dataState());
  readonly loading = computed(() => this.loadingState());
  readonly todosTotal = computed(() => this.todosTotalState());

  load(options?: { force?: boolean; silent?: boolean }): void {
    const silent = !!options?.silent;
    if (!silent) {
      this.loadingState.set(true);
    }
    forkJoin({
      home: this.dashboardApi.getHomeData(options),
      todosPage: this.dashboardApi.getTodosPage({ page: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ home, todosPage }) => {
        this.dataState.set(home);
        this.todosTotalState.set(todosPage.total);
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
      todosTotal?: ReturnType<DashboardApiService['getTodosPage']>;
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
      requests.todosTotal = this.dashboardApi.getTodosPage({ page: 1, pageSize: 1 });
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
        if (partial.todosTotal) {
          this.todosTotalState.set(partial.todosTotal.total);
        }
      },
      error: () => {
        this.load({ force: true, silent: true });
      },
    });
  }
}

import { computed, inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

import type { PageResult } from '@core/types';
import type { CreateProjectInput, ProjectListQuery, ProjectSummary } from '../models/project.model';
import { ProjectApiService } from '../services/project-api.service';

const DEFAULT_QUERY: ProjectListQuery = {
  page: 1,
  pageSize: 100,
  keyword: '',
  status: 'active',
};

@Injectable()
export class ProjectListStore {
  private readonly projectApi = inject(ProjectApiService);
  private readonly message = inject(NzMessageService);

  private readonly queryState = signal<ProjectListQuery>({ ...DEFAULT_QUERY });
  private readonly resultState = signal<PageResult<ProjectSummary> | null>(null);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());

  initialize(): void {
    this.load();
  }

  updateQuery(patch: Partial<ProjectListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? 1,
    }));
    this.load();
  }

  load(): void {
    this.loadingState.set(true);
    this.projectApi.list(this.queryState()).subscribe({
      next: (result) => {
        this.resultState.set(result);
        this.loadingState.set(false);
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }

  create(input: CreateProjectInput, done?: (created: ProjectSummary) => void): void {
    this.busyState.set(true);
    this.projectApi.create(input).subscribe({
      next: (created) => {
        this.busyState.set(false);
        done?.(created);
        this.insertOrRefresh(created);
      },
      error: (error: unknown) => {
        this.busyState.set(false);
      },
    });
  }

  patchOrRefresh(updated: ProjectSummary): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const query = this.queryState();
    const hasFilter = !!query.keyword?.trim() || !!query.status?.trim();
    if (hasFilter) {
      this.load();
      return;
    }

    const index = result.items.findIndex((item) => item.id === updated.id);
    if (index < 0) {
      return;
    }

    const items = [...result.items];
    const current = result.items[index];
    items[index] = {
      ...current,
      ...updated,
      memberCount: updated.memberCount ?? current.memberCount,
      favoriteAt: Object.prototype.hasOwnProperty.call(updated, 'favoriteAt') ? updated.favoriteAt : current.favoriteAt,
    };
    this.resultState.set({
      ...result,
      items,
    });
  }

  patchAndSort(updated: ProjectSummary): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const index = result.items.findIndex((item) => item.id === updated.id);
    if (index < 0) {
      this.load();
      return;
    }

    const items = result.items.map((item) =>
      item.id === updated.id
        ? {
            ...item,
            ...updated,
            memberCount: updated.memberCount ?? item.memberCount,
            favoriteAt: Object.prototype.hasOwnProperty.call(updated, 'favoriteAt') ? updated.favoriteAt : item.favoriteAt,
          }
        : item
    );

    this.resultState.set({
      ...result,
      items: this.sortProjects(items),
    });
  }

  private insertOrRefresh(created: ProjectSummary): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const query = this.queryState();
    const hasFilter = !!query.keyword?.trim() || !!query.status?.trim() || query.page > 1;
    if (hasFilter) {
      this.load();
      return;
    }

    const items = [created, ...result.items].slice(0, query.pageSize);
    this.resultState.set({
      ...result,
      items,
      total: result.total + 1,
    });
  }

  private sortProjects(items: ProjectSummary[]): ProjectSummary[] {
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aFavorite = a.item.favoriteAt;
        const bFavorite = b.item.favoriteAt;
        if (aFavorite && bFavorite && aFavorite !== bFavorite) {
          return bFavorite.localeCompare(aFavorite);
        }
        if (aFavorite && !bFavorite) {
          return -1;
        }
        if (!aFavorite && bFavorite) {
          return 1;
        }
        return this.compareDefaultProjectOrder(a.item, b.item) || a.index - b.index;
      })
      .map(({ item }) => item);
  }

  private compareDefaultProjectOrder(a: ProjectSummary, b: ProjectSummary): number {
    const created = b.createdAt.localeCompare(a.createdAt);
    if (created !== 0) {
      return created;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  }
}

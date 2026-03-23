import { computed, inject, Injectable, signal } from '@angular/core';

import type { PageResult } from '../../../core/types/page.types';
import type { CreateProjectInput, ProjectListQuery, ProjectSummary } from '../models/project.model';
import { ProjectApiService } from '../services/project-api.service';

const DEFAULT_QUERY: ProjectListQuery = {
  page: 1,
  pageSize: 20,
  keyword: '',
  status: '',
};

@Injectable()
export class ProjectListStore {
  private readonly projectApi = inject(ProjectApiService);

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

  create(input: CreateProjectInput, done?: () => void): void {
    this.busyState.set(true);
    this.projectApi.create(input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }
}

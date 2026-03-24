import { computed, inject, Injectable, signal } from '@angular/core';

import { ProjectContextStore } from '../../../core/state/project-context.store';
import type { PageResult } from '../../../core/types/page.types';
import type { CreateIssueInput, IssueEntity, IssueListQuery } from '../models/issue.model';
import { IssueApiService } from '../services/issue-api.service';

const DEFAULT_QUERY: IssueListQuery = {
  page: 1,
  pageSize: 20,
  keyword: '',
  projectId: '',
  status: '',
  priority: '',
};

@Injectable()
export class IssueListStore {
  private readonly issueApi = inject(IssueApiService);
  private readonly projectContext = inject(ProjectContextStore);

  private readonly queryState = signal<IssueListQuery>({ ...DEFAULT_QUERY });
  private readonly resultState = signal<PageResult<IssueEntity> | null>(null);
  private readonly loadingState = signal(false);
  private loadToken = 0;

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly loading = computed(() => this.loadingState());
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly page = computed(() => this.queryState().page ?? 1);
  readonly pageSize = computed(() => this.queryState().pageSize ?? 20);

  initialize(): void {
    const projectId = this.projectContext.currentProjectId() ?? '';
    this.queryState.update((query) => ({ ...query, projectId }));
    this.load();
  }

  refreshForProject(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: projectId ?? '',
      page: 1,
    }));

    if (!projectId) {
      this.resultState.set({ items: [], page: 1, pageSize: queryPageSize(this.queryState()), total: 0 });
      this.loadingState.set(false);
      return;
    }

    this.loadingState.set(true);
    this.resultState.set(null);
    this.load();
  }

  updateQuery(patch: Partial<IssueListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? query.page ?? 1,
    }));
    this.load();
  }

  load(): void {
    const query = this.queryState();
    if (!query.projectId) {
      this.resultState.set({ items: [], page: 1, pageSize: queryPageSize(query), total: 0 });
      this.loadingState.set(false);
      return;
    }

    const token = ++this.loadToken;
    this.loadingState.set(true);
    this.issueApi.list(query).subscribe({
      next: (result) => {
        if (token !== this.loadToken) {
          return;
        }
        this.resultState.set(result);
        this.loadingState.set(false);
      },
      error: () => {
        if (token !== this.loadToken) {
          return;
        }
        this.loadingState.set(false);
      },
    });
  }

  create(input: Omit<CreateIssueInput, 'projectId'> & { projectId?: string }): void {
    const projectId = input.projectId ?? this.projectContext.currentProjectId() ?? '';
    const title = input.title.trim();
    if (!projectId || !title) {
      return;
    }

    this.loadingState.set(true);
    this.issueApi
      .create({
        ...input,
        projectId,
        title,
      })
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.loadingState.set(false);
        },
      });
  }
}

function queryPageSize(query: IssueListQuery): number {
  return query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
}

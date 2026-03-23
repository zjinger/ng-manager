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

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly loading = computed(() => this.loadingState());

  initialize(): void {
    const projectId = this.projectContext.currentProjectId() ?? '';
    this.queryState.update((query) => ({ ...query, projectId }));
    this.load();
  }

  updateQuery(patch: Partial<IssueListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? 1,
    }));
    this.load();
  }

  load(): void {
    this.loadingState.set(true);
    this.issueApi.list(this.queryState()).subscribe({
      next: (result) => {
        this.resultState.set(result);
        this.loadingState.set(false);
      },
      error: () => {
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

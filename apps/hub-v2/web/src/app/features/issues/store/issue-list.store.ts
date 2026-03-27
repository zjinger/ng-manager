import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';

import { ProjectContextStore } from '@core/state';
import type { PageResult } from '@core/types';
import type { CreateIssueInput, IssueEntity, IssueListQuery } from '../models/issue.model';
import { IssueApiService } from '../services/issue-api.service';

const DEFAULT_QUERY: IssueListQuery = {
  page: 1,
  pageSize: 20,
  keyword: '',
  projectId: '',
  status: [],
  priority: [],
  reporterIds: [],
  assigneeIds: [],
  moduleCodes: [],
  versionCodes: [],
  environmentCodes: [],
  includeAssigneeParticipants: true,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
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

  refresh(): void {
    this.load();
  }

  patchOrRefresh(updated: IssueEntity): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const query = this.queryState();
    const hasComplexFilter =
      (query.status?.length ?? 0) > 0 ||
      (query.priority?.length ?? 0) > 0 ||
      (query.reporterIds?.length ?? 0) > 0 ||
      (query.assigneeIds?.length ?? 0) > 0 ||
      (query.moduleCodes?.length ?? 0) > 0 ||
      (query.versionCodes?.length ?? 0) > 0 ||
      (query.environmentCodes?.length ?? 0) > 0 ||
      !!query.keyword?.trim();

    if (hasComplexFilter) {
      this.load();
      return;
    }

    const index = result.items.findIndex((item) => item.id === updated.id);
    if (index < 0) {
      return;
    }

    const items = [...result.items];
    items[index] = updated;
    this.resultState.set({
      ...result,
      items,
    });
  }

  private load(): void {
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

  create(input: Omit<CreateIssueInput, 'projectId'> & { projectId?: string; attachmentFiles?: File[] }): void {
    const projectId = input.projectId ?? this.projectContext.currentProjectId() ?? '';
    const title = input.title.trim();
    if (!projectId || !title) {
      return;
    }
    const attachmentFiles = input.attachmentFiles ?? [];
    const assigneeId = input.assigneeId ?? null;
    const participantIds = [...new Set((input.participantIds ?? []).map((item) => item.trim()).filter(Boolean))].filter(
      (id) => id !== assigneeId
    );
    const createPayload = { ...input } as Omit<CreateIssueInput, 'projectId'> & { attachmentFiles?: File[] };
    delete createPayload.attachmentFiles;

    this.loadingState.set(true);
    this.issueApi
      .create({
        ...createPayload,
        projectId,
        title,
      })
      .subscribe({
        next: (created) => {
          const participantTasks = participantIds.map((userId) => this.issueApi.addParticipant(created.id, userId));
          const participant$ = participantTasks.length ? forkJoin(participantTasks) : of([]);
          const attachment$ = attachmentFiles.length
            ? forkJoin(attachmentFiles.map((file) => this.issueApi.uploadFile(file, created.id))).pipe(
                switchMap((uploads) =>
                  uploads.length ? forkJoin(uploads.map((upload) => this.issueApi.addAttachment(created.id, upload.id))) : of([])
                )
              )
            : of([]);

          forkJoin([participant$, attachment$]).subscribe({
            next: () => this.load(),
            error: () => this.load(),
          });
        },
        error: () => {
          this.loadingState.set(false);
        },
      });
  }
}

function queryPageSize(query: IssueListQuery): number {
  return query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
}

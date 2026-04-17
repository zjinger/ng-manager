import { computed, inject, Injectable, signal } from '@angular/core';
import type { Observable } from 'rxjs';

import { ProjectContextStore } from '@core/state';
import type { PageResult } from '@core/types';
import type {
  AdvanceRdStageInput,
  BlockRdItemInput,
  CloseRdItemInput,
  CreateRdItemInput,
  RdItemEntity,
  RdListQuery,
  RdStageEntity,
  UpdateRdItemInput
} from '../models/rd.model';
import { RdApiService } from '../services/rd-api.service';

const DEFAULT_QUERY: RdListQuery = {
  page: 1,
  pageSize: 20,
  projectId: '',
  stageId: '',
  stageIds: [],
  status: [],
  type: [],
  priority: [],
  assigneeIds: [],
  keyword: '',
};

@Injectable()
export class RdStore {
  private readonly rdApi = inject(RdApiService);
  private readonly projectContext = inject(ProjectContextStore);

  private readonly queryState = signal<RdListQuery>({ ...DEFAULT_QUERY });
  private readonly resultState = signal<PageResult<RdItemEntity> | null>(null);
  private readonly stagesState = signal<RdStageEntity[]>([]);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);
  private loadToken = 0;

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly stages = computed(() => this.stagesState());
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());
  readonly page = computed(() => this.queryState().page ?? 1);
  readonly pageSize = computed(() => this.queryState().pageSize ?? 20);

  initialize(): void {
    const projectId = this.projectContext.currentProjectId() ?? '';
    this.queryState.update((query) => ({ ...query, projectId }));
    if (!projectId) {
      this.resultState.set({ items: [], page: 1, pageSize: 50, total: 0 });
      this.stagesState.set([]);
      return;
    }
    this.loadStages(projectId);
    this.load();
  }

  refreshForProject(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: projectId ?? '',
      stageId: '',
      stageIds: [],
      page: 1,
    }));
    if (!projectId) {
      this.resultState.set({ items: [], page: 1, pageSize: 50, total: 0 });
      this.stagesState.set([]);
      this.loadingState.set(false);
      return;
    }
    this.loadingState.set(true);
    this.resultState.set(null);
    this.loadStages(projectId);
    this.load();
  }

  updateQuery(patch: Partial<RdListQuery>): void {
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
      this.resultState.set({ items: [], page: 1, pageSize: 50, total: 0 });
      this.loadingState.set(false);
      return;
    }

    const token = ++this.loadToken;
    this.loadingState.set(true);
    this.rdApi.listItems(query).subscribe({
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

  private loadStages(projectId: string): void {
    this.rdApi.listStages(projectId).subscribe({
      next: (items) => this.stagesState.set(items.filter((item) => item.enabled)),
      error: () => this.stagesState.set([]),
    });
  }

  create(input: Omit<CreateRdItemInput, 'projectId'> & { projectId?: string }, done?: () => void): void {
    const projectId = input.projectId ?? this.projectContext.currentProjectId() ?? '';
    const title = input.title.trim();
    if (!projectId || !title) {
      return;
    }

    this.busyState.set(true);
    this.rdApi
      .create({
        ...input,
        projectId,
        title,
      })
      .subscribe({
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

  update(itemId: string, input: UpdateRdItemInput): void {
    this.runAction(() => this.rdApi.update(itemId, input));
  }

  start(itemId: string): void {
    this.runAction(() => this.rdApi.start(itemId));
  }

  block(itemId: string, input: BlockRdItemInput): void {
    this.runAction(() => this.rdApi.block(itemId, input));
  }

  resume(itemId: string): void {
    this.runAction(() => this.rdApi.resume(itemId));
  }

  complete(itemId: string): void {
    this.runAction(() => this.rdApi.complete(itemId));
  }

  updateItemInList(item: RdItemEntity): void {
    this.patchOrRefresh(item);
  }

  advanceStage(itemId: string, input: AdvanceRdStageInput): void {
    this.runAction(() => this.rdApi.advanceStage(itemId, input));
  }

  accept(itemId: string): void {
    this.runAction(() => this.rdApi.accept(itemId));
  }

  close(itemId: string, input?: CloseRdItemInput): void {
    this.runAction(() => this.rdApi.close(itemId, input));
  }

  private runAction(request: () => Observable<RdItemEntity>): void {
    this.busyState.set(true);
    request().subscribe({
      next: (updated) => {
        this.busyState.set(false);
        this.patchOrRefresh(updated);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  private patchOrRefresh(updated: RdItemEntity): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const query = this.queryState();
    const hasComplexFilter =
      !!query.stageId?.trim() ||
      (query.stageIds?.length ?? 0) > 0 ||
      (query.status?.length ?? 0) > 0 ||
      (query.type?.length ?? 0) > 0 ||
      (query.priority?.length ?? 0) > 0 ||
      (query.assigneeIds?.length ?? 0) > 0 ||
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
}

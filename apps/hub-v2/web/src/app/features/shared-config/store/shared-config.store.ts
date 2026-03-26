import { computed, inject, Injectable, signal } from '@angular/core';

import { ProjectContextStore } from '@core/state';
import type {
  CreateSharedConfigInput,
  SharedConfigEntity,
  SharedConfigListQuery,
  UpdateSharedConfigInput,
} from '../models/shared-config.model';
import { SharedConfigApiService } from '../services/shared-config-api.service';

const DEFAULT_QUERY: SharedConfigListQuery = {
  page: 1,
  pageSize: 20,
  keyword: '',
  status: '',
  scope: '',
  projectId: '',
  category: '',
};

@Injectable()
export class SharedConfigStore {
  private readonly api = inject(SharedConfigApiService);
  private readonly projectContext = inject(ProjectContextStore);

  private readonly queryState = signal<SharedConfigListQuery>({ ...DEFAULT_QUERY });
  private readonly itemsState = signal<SharedConfigEntity[]>([]);
  private readonly totalState = signal(0);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly items = computed(() => this.itemsState());
  readonly total = computed(() => this.totalState());
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());

  initialize(): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: this.projectContext.currentProjectId() ?? '',
    }));
    this.load();
  }

  refreshForProject(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: projectId ?? '',
      page: 1,
    }));
    this.load();
  }

  updateQuery(patch: Partial<SharedConfigListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? 1,
    }));
    this.load();
  }

  load(): void {
    this.loadingState.set(true);
    this.api.list(this.queryState()).subscribe({
      next: (result) => {
        this.itemsState.set(result.items);
        this.totalState.set(result.total);
        this.loadingState.set(false);
      },
      error: () => {
        this.itemsState.set([]);
        this.totalState.set(0);
        this.loadingState.set(false);
      },
    });
  }

  create(input: CreateSharedConfigInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.create(input).subscribe({
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

  update(configId: string, input: UpdateSharedConfigInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.update(configId, input).subscribe({
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

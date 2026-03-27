import { computed, inject, Injectable, signal } from '@angular/core';

import type { FeedbackEntity, FeedbackListQuery, FeedbackStatus } from '../models/feedback.model';
import { FeedbackApiService } from '../services/feedback-api.service';

const DEFAULT_QUERY: FeedbackListQuery = {
  page: 1,
  pageSize: 20,
  keyword: '',
  status: [],
  category: [],
  source: [],
  projectId: '',
};

@Injectable()
export class FeedbackStore {
  private readonly api = inject(FeedbackApiService);

  private readonly queryState = signal<FeedbackListQuery>({ ...DEFAULT_QUERY });
  private readonly itemsState = signal<FeedbackEntity[]>([]);
  private readonly totalState = signal(0);
  private readonly loadingState = signal(false);
  private readonly detailLoadingState = signal(false);
  private readonly selectedIdState = signal<string | null>(null);
  private readonly selectedState = signal<FeedbackEntity | null>(null);
  private readonly savingState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly items = computed(() => this.itemsState());
  readonly total = computed(() => this.totalState());
  readonly loading = computed(() => this.loadingState());
  readonly detailLoading = computed(() => this.detailLoadingState());
  readonly saving = computed(() => this.savingState());
  readonly selectedId = computed(() => this.selectedIdState());
  readonly selected = computed(() => this.selectedState());
  readonly page = computed(() => this.queryState().page);
  readonly pageSize = computed(() => this.queryState().pageSize);

  initialize(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: projectId ?? '',
      page: 1,
    }));
    this.load();
  }

  refreshForProject(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: projectId ?? '',
      page: 1,
    }));
    this.selectedIdState.set(null);
    this.selectedState.set(null);
    this.load();
  }

  updateQuery(patch: Partial<FeedbackListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? query.page,
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

        const currentSelectedId = this.selectedIdState();
        if (!currentSelectedId) {
          return;
        }
        const inList = result.items.find((item) => item.id === currentSelectedId) ?? null;
        if (inList) {
          this.selectedState.set(inList);
          return;
        }
        this.loadDetail(currentSelectedId);
      },
      error: () => {
        this.itemsState.set([]);
        this.totalState.set(0);
        this.loadingState.set(false);
      },
    });
  }

  select(feedbackId: string | null): void {
    this.selectedIdState.set(feedbackId);
    if (!feedbackId) {
      this.selectedState.set(null);
      return;
    }
    const inList = this.itemsState().find((item) => item.id === feedbackId) ?? null;
    if (inList) {
      this.selectedState.set(inList);
      return;
    }
    this.loadDetail(feedbackId);
  }

  updateStatus(status: FeedbackStatus, done?: () => void): void {
    const current = this.selectedState();
    if (!current) {
      return;
    }
    this.savingState.set(true);
    this.api.updateStatus(current.id, status).subscribe({
      next: (updated) => {
        this.savingState.set(false);
        this.selectedState.set(updated);
        this.itemsState.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        done?.();
      },
      error: () => {
        this.savingState.set(false);
      },
    });
  }

  private loadDetail(feedbackId: string): void {
    this.detailLoadingState.set(true);
    this.api.getById(feedbackId).subscribe({
      next: (item) => {
        this.selectedState.set(item);
        this.detailLoadingState.set(false);
      },
      error: () => {
        this.detailLoadingState.set(false);
      },
    });
  }
}

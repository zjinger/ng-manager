import { computed, inject, Injectable, signal } from '@angular/core';
import type { Observable } from 'rxjs';

import type { PageResult } from '@core/types';
import type {
  CloseRdTaskSheetInput,
  CreateRdTaskSheetInput,
  RdTaskSheetDetail,
  RdTaskSheetEntity,
  RdTaskSheetListQuery,
  ReplyRdTaskSheetInput,
  UpdateRdTaskSheetInput,
} from '../models/rd-task-sheet.model';
import { RdTaskSheetApiService } from '../services/rd-task-sheet-api.service';

const DEFAULT_QUERY: RdTaskSheetListQuery = {
  page: 1,
  pageSize: 20,
  scope: 'related',
  projectId: '',
  unlinked: false,
  status: [],
  keyword: '',
};

@Injectable()
export class RdTaskSheetStore {
  private readonly api = inject(RdTaskSheetApiService);
  private readonly queryState = signal<RdTaskSheetListQuery>({ ...DEFAULT_QUERY });
  private readonly resultState = signal<PageResult<RdTaskSheetEntity> | null>(null);
  private readonly selectedState = signal<RdTaskSheetDetail | null>(null);
  private readonly loadingState = signal(false);
  private readonly detailLoadingState = signal(false);
  private readonly busyState = signal(false);
  private loadToken = 0;

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly page = computed(() => this.queryState().page ?? 1);
  readonly pageSize = computed(() => this.queryState().pageSize ?? 20);
  readonly selected = computed(() => this.selectedState());
  readonly loading = computed(() => this.loadingState());
  readonly detailLoading = computed(() => this.detailLoadingState());
  readonly busy = computed(() => this.busyState());

  load(): void {
    const token = ++this.loadToken;
    this.loadingState.set(true);
    this.api.list(this.queryState()).subscribe({
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

  updateQuery(patch: Partial<RdTaskSheetListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? query.page ?? 1,
    }));
    this.load();
  }

  reset(): void {
    this.queryState.set({ ...DEFAULT_QUERY });
    this.load();
  }

  select(sheetId: string | null): void {
    if (!sheetId) {
      this.selectedState.set(null);
      return;
    }
    this.detailLoadingState.set(true);
    this.api.getById(sheetId).subscribe({
      next: (detail) => {
        this.selectedState.set(detail);
        this.detailLoadingState.set(false);
      },
      error: () => {
        this.selectedState.set(null);
        this.detailLoadingState.set(false);
      },
    });
  }

  create(input: CreateRdTaskSheetInput, done?: (detail: RdTaskSheetDetail) => void): void {
    this.runDetailAction(() => this.api.create(input), done);
  }

  update(sheetId: string, input: UpdateRdTaskSheetInput, done?: (detail: RdTaskSheetDetail) => void): void {
    this.runDetailAction(() => this.api.update(sheetId, input), done);
  }

  issue(sheetId: string): void {
    this.runDetailAction(() => this.api.issue(sheetId));
  }

  startProcessing(sheetId: string): void {
    this.runDetailAction(() => this.api.startProcessing(sheetId));
  }

  reply(sheetId: string, input: ReplyRdTaskSheetInput, done?: (detail: RdTaskSheetDetail) => void): void {
    this.runDetailAction(() => this.api.reply(sheetId, input), done);
  }

  close(sheetId: string, input: CloseRdTaskSheetInput, done?: (detail: RdTaskSheetDetail) => void): void {
    this.runDetailAction(() => this.api.close(sheetId, input), done);
  }

  attach(sheetId: string, uploadId: string): void {
    this.runDetailAction(() => this.api.attachUpload(sheetId, uploadId));
  }

  detach(sheetId: string, attachmentId: string): void {
    this.runDetailAction(() => this.api.detachUpload(sheetId, attachmentId));
  }

  private runDetailAction(request: () => Observable<RdTaskSheetDetail>, done?: (detail: RdTaskSheetDetail) => void): void {
    this.busyState.set(true);
    request().subscribe({
      next: (detail) => {
        this.busyState.set(false);
        this.selectedState.set(detail);
        this.patchList(detail);
        done?.(detail);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  private patchList(detail: RdTaskSheetDetail): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }
    const index = result.items.findIndex((item) => item.id === detail.id);
    if (index < 0) {
      this.load();
      return;
    }
    const items = [...result.items];
    items[index] = detail;
    this.resultState.set({ ...result, items });
  }
}

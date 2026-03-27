import { computed, inject, Injectable, signal } from '@angular/core';
import { RdApiService } from '../services/rd-api.service';
import {
  AdvanceRdStageInput,
  BlockRdItemInput,
  RdItemEntity,
  RdListQuery,
  RdListResult,
  RdLogEntity,
  RdStageEntity,
} from '../models/rd.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RdStore {
  private readonly rdApi = inject(RdApiService);

  private readonly rdItemsPageListState = signal<RdItemEntity[]>([]);
  private readonly rdItemsCountState = signal(0);
  private readonly stagesState = signal<RdStageEntity[]>([]);
  private readonly currentRdItemState = signal<RdItemEntity | null>(null);
  private readonly currentRdLogsState = signal<RdLogEntity[]>([]);
  private readonly queryState = signal<RdListQuery>({
    page: 1,
    pageSize: 20,
    stageId: '',
    status: '',
    type: '',
    priority: '',
    assigneeId: '',
    keyword: '',
  });
  private readonly busyState = signal(false);
  private readonly loadingState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly currentRdItem = computed(() => this.currentRdItemState());
  readonly currentRdLogs = computed(() => this.currentRdLogsState());
  readonly stages = computed(() => this.stagesState());
  readonly rdItemsCount = computed(() => this.rdItemsCountState());
  readonly rdItemsPageList = computed(() => this.rdItemsPageListState());
  readonly busy = computed(() => this.busyState());
  readonly rdItemsLoading = computed(() => this.loadingState());

  async loadRdItems(page: number = 1, pageSize: number = 20) {
    this.loadingState.set(true);
    const res = (await this.rdApi.getRdItemsList(this.query())) as RdListResult;
    this.rdItemsPageListState.set(res.items);
    this.rdItemsCountState.set(res.total);
    this.loadingState.set(false);
  }

  async loadCurrentRdItem(itemId: string) {
    this.busyState.set(true);
    const itemRes = (await this.rdApi.getRdItem(itemId)) as RdItemEntity;
    const logsRes = (await this.rdApi.getRdItemLogs(itemId)).items as RdLogEntity[];
    this.currentRdItemState.set(itemRes);
    this.currentRdLogsState.set(logsRes);
    this.busyState.set(false);
  }

  setCurrentRdItem(item: RdItemEntity | null) {
    this.currentRdItemState.set(item);
  }

  updateQuery(patch: Partial<RdListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? query.page ?? 1,
    }));
    this.loadRdItems();
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

  advanceStage(itemId: string, input: AdvanceRdStageInput): void {
    this.runAction(() => this.rdApi.advanceStage(itemId, input));
  }

  accept(itemId: string): void {
    this.runAction(() => this.rdApi.accept(itemId));
  }

  close(itemId: string): void {
    this.runAction(() => this.rdApi.close(itemId));
  }

  delete(itemId: string): void {
    this.runAction(() => this.rdApi.delete(itemId));
  }

  private runAction(request: () => Observable<unknown>): void {
    this.busyState.set(true);
    request().subscribe({
      next: () => {
        this.busyState.set(false);
        this.loadRdItems();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }
}

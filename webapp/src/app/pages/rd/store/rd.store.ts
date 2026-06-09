import { computed, inject, Injectable, signal } from '@angular/core';
import { ProjectContextStore } from '@app/core/stores/project-context/project-context.store';
import { UserStore } from '@app/core/stores/user/user.store';
import { from } from 'rxjs';
import {
  AdvanceRdStageInput,
  BlockRdItemInput,
  RdItemEntity,
  RdItemProgress,
  RdListQuery,
  RdLogEntity,
  RdMemberBlockEntity,
  RdStageEntity,
  RdStageHistoryEntry,
  RdStageTaskEntity,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
  UpdateRdStageInput,
} from '../models/rd.model';
import { RdApiService } from '../services/rd-api.service';

@Injectable({
  providedIn: 'root',
})
export class RdStore {
  private readonly rdApi = inject(RdApiService);
  private readonly projectContextStore = inject(ProjectContextStore);

  readonly projectId = computed(() => this.projectContextStore.currentProjectId());

  private readonly rdItemsPageListState = signal<RdItemEntity[]>([]);
  private readonly rdItemsCountState = signal(0);

  // 选中rd
  private readonly currentRdItemState = signal<RdItemEntity | null>(null);
  private readonly currentRdLogsState = signal<RdLogEntity[]>([]);
  private readonly currentRdProgressState = signal<RdItemProgress[]>([]);
  private readonly currentRdStageHistoryState = signal<RdStageHistoryEntry[]>([]);
  private readonly currentRdStageTasksState = signal<RdStageTaskEntity[]>([]);
  private readonly currentRdMemberBlocksState = signal<RdMemberBlockEntity[]>([]);

  private readonly stagesState = signal<RdStageEntity[]>([]);
  private readonly projectMembersState = this.projectContextStore.currentProjectMembers;
  private readonly queryState = signal<RdListQuery>({
    page: 1,
    pageSize: 20,
    stageId: '',
    status: [],
    type: [],
    priority: [],
    assigneeId: '',
    keyword: '',
  });
  private readonly busyState = signal(false);
  private readonly loadingState = signal(false);
  private readonly currentRdLoadingState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly currentRdItem = computed(() => this.currentRdItemState());
  readonly currentRdLogs = computed(() => this.currentRdLogsState());
  readonly currentRdProgress = computed(() => this.currentRdProgressState());
  readonly currentRdStageHistory = computed(() => this.currentRdStageHistoryState());
  readonly currentRdStageTasks = computed(() => this.currentRdStageTasksState());
  readonly currentRdMemberBlocks = computed(() => this.currentRdMemberBlocksState());
  readonly stages = computed(() => this.stagesState());
  readonly rdItemsCount = computed(() => this.rdItemsCountState());
  readonly rdItemsPageList = computed(() => this.rdItemsPageListState());
  readonly projectMembers = computed(() => this.projectMembersState());
  readonly busy = computed(() => this.busyState());
  readonly rdItemsLoading = computed(() => this.loadingState());
  readonly currentRdLoading = computed(() => this.currentRdLoadingState());

  initialize(): void {
    try {
      const projectId = this.projectId();
      if (!projectId) return;
      Promise.all([
        this.loadStages(),
        this.loadRdItems(),
        this.projectContextStore.loadProjectMembers(projectId),
      ]);
    } catch (e) {}
  }

  async loadRdItems() {
    try {
      const projectId = this.projectId();
      if (!projectId) return;
      this.loadingState.set(true);
      const res = await this.rdApi.getRdItemsList(projectId, this.query());
      this.rdItemsPageListState.set(res.items);
      this.rdItemsCountState.set(res.total);
      this.loadingState.set(false);
    } catch (e) {
      this.loadingState.set(false);
    }
  }

  async loadStages() {
    const projectId = this.projectId();
    if (!projectId) return;
    try {
      const stages = (await this.rdApi.getRdStages(projectId)).items;
      this.stagesState.set(stages);
    } catch (e) {
      this.stagesState.set([]);
    }
  }

  async loadCurrentRdItem(itemId: string) {
    const projectId = this.projectId();
    if (!projectId) return;
    this.currentRdLoadingState.set(true);
    try {
      const [itemRes, logsRes, progressRes, stageHistoryRes, stageTasksRes, memberBlocksRes] =
        await Promise.allSettled([
          this.rdApi.getRdItem(projectId, itemId),
          this.rdApi.getRdItemLogs(projectId, itemId),
          this.rdApi.getRdProgress(projectId, itemId),
          this.rdApi.getRdStageHistory(projectId, itemId),
          this.rdApi.getRdStageTasks(projectId, itemId),
          this.rdApi.getRdMemberBlocks(projectId, itemId),
        ]);

      if (itemRes.status === 'fulfilled') {
        this.currentRdItemState.set(itemRes.value);
      }
      this.currentRdLogsState.set(logsRes.status === 'fulfilled' ? logsRes.value.items : []);
      this.currentRdProgressState.set(progressRes.status === 'fulfilled' ? progressRes.value.items : []);
      this.currentRdStageHistoryState.set(stageHistoryRes.status === 'fulfilled' ? stageHistoryRes.value.items : []);
      this.currentRdStageTasksState.set(stageTasksRes.status === 'fulfilled' ? stageTasksRes.value.items : []);
      this.currentRdMemberBlocksState.set(memberBlocksRes.status === 'fulfilled' ? memberBlocksRes.value.items : []);
    } finally {
      this.currentRdLoadingState.set(false);
    }
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
  }

  update(itemId: string, input: UpdateRdItemInput): void {
    const projectId = this.projectId();
    if (!projectId) return;
    this.runAction(() => this.rdApi.update(projectId, itemId, input));
  }

  start(itemId: string): void {
    const projectId = this.projectId()!;
    this.runAction(() => this.rdApi.start(projectId, itemId));
  }

  // progress(itemId: string, input: UpdateRdProgressInput): void {
  //   this.runAction(() => this.rdApi.progress(this.projectId()!, itemId, input));
  // }

  block(itemId: string, input: BlockRdItemInput): void {
    this.runAction(() => this.rdApi.block(this.projectId()!, itemId, input));
  }

  resume(itemId: string): void {
    this.runAction(() => this.rdApi.resume(this.projectId()!, itemId));
  }

  resolve(itemId: string): void {
    const projectId = this.projectId();

    if (!projectId) return;
    this.runAction(() => this.rdApi.resolve(projectId, itemId));
  }

  advanceStage(itemId: string, input: AdvanceRdStageInput): void {
    // this.runAction(() => this.rdApi.advanceStage(itemId, input));
  }

  updateProgress(input: UpdateRdItemProgressInput) {
    const current = this.currentRdItem();
    if (!current) {
      return;
    }
    this.runAction(() => this.rdApi.updateProgress(current.id, input));
  }

  accept(itemId: string): void {
    const projectId = this.projectId();

    if (!projectId) return;
    this.runAction(() => this.rdApi.accept(projectId, itemId));
  }

  close(itemId: string, summary: string): void {
    const projectId = this.projectId();

    if (!projectId) return;
    this.runAction(() => this.rdApi.close(projectId, itemId, summary));
  }

  async resolveMemberBlock(itemId: string, blockId: string, note?: string): Promise<void> {
    const projectId = this.projectId();
    if (!projectId) return;
    this.busyState.set(true);
    try {
      await this.rdApi.resolveMemberBlock(projectId, itemId, blockId, note);
      await this.loadCurrentRdItem(itemId);
      await this.loadRdItems();
      this.busyState.set(false);
    } catch {
      this.busyState.set(false);
    }
  }

  delete(itemId: string): void {
    const projectId = this.projectId()!;
    this.busyState.set(true);
    from(this.rdApi.delete(projectId, itemId)).subscribe({
      next: () => {
        this.busyState.set(false);
        const list = this.rdItemsPageListState();
        if (!list) {
          this.loadRdItems();
          return;
        }

        const items = list.filter((item) => item.id !== itemId);
        if (items.length === list.length) {
          this.loadRdItems();
          return;
        }

        this.rdItemsCountState.update((count) => count - 1);
        this.rdItemsPageListState.update((list) => items);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  private runAction(request: () => Promise<RdItemEntity>): void {
    this.busyState.set(true);
    from(request()).subscribe({
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
    const list = this.rdItemsPageListState();
    if (!list) {
      this.loadRdItems();
      return;
    }

    const index = list.findIndex((item) => item.id === updated.id);
    if (index < 0) {
      return;
    }

    this.loadCurrentRdItem(updated.id);
    const items = [...list];
    items[index] = updated;
    this.rdItemsPageListState.set(items);
  }
}

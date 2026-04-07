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
  UpdateRdItemInput,
} from '../models/rd.model';
import { from, Observable } from 'rxjs';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { UserStore } from '@app/core/stores/user.store';

@Injectable({
  providedIn: 'root',
})
export class RdStore {
  private readonly rdApi = inject(RdApiService);
  private readonly projectState = inject(ProjectStateService);
  private readonly userStore = inject(UserStore);

  private readonly projectId = computed(() => this.projectState.currentProjectId()!);
  private readonly userToken = computed(() => this.userStore.currentUser()?.token ?? '');

  // private readonly projectId = computed(() => this.projectState.currentProjectId());
  private readonly rdItemsPageListState = signal<RdItemEntity[]>([]);
  private readonly rdItemsCountState = signal(0);
  private readonly currentRdItemState = signal<RdItemEntity | null>(null);
  private readonly currentRdLogsState = signal<RdLogEntity[]>([]);
  private readonly stagesState = signal<RdStageEntity[]>([]);
  private readonly projectMembersState = this.projectState.currentProjectMembers;
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

  readonly query = computed(() => this.queryState());
  readonly currentRdItem = computed(() => this.currentRdItemState());
  readonly currentRdLogs = computed(() => this.currentRdLogsState());
  readonly stages = computed(() => this.stagesState());
  readonly rdItemsCount = computed(() => this.rdItemsCountState());
  readonly rdItemsPageList = computed(() => this.rdItemsPageListState());
  readonly projectMembers = computed(() => this.projectMembersState());
  readonly busy = computed(() => this.busyState());
  readonly rdItemsLoading = computed(() => this.loadingState());

  initialize(): void {
    try {
      const projectId = this.projectId();
      if (!projectId) return;
      this.loadStages();
      this.loadRdItems();
      this.projectState.loadProjectMembers(projectId);
    } catch (e) {}
  }

  async loadRdItems() {
    try {
      const projectId = this.projectId();
      if (!projectId) return;
      this.loadingState.set(true);
      const res = await this.rdApi.getRdItemsList(this.projectId(), this.query());
      this.rdItemsPageListState.set(res.items);
      this.rdItemsCountState.set(res.total);
      this.loadingState.set(false);
    } catch (e) {
      this.loadingState.set(false);
    }
  }

  async loadStages() {
    const projectId = this.projectId();
    try {
      const stages = (await this.rdApi.getRdStages(projectId)).items;
      this.stagesState.set(stages);
      console.log(stages);
    } catch (e) {
      this.stagesState.set([]);
    }
  }

  async loadCurrentRdItem(itemId: string) {
    const projectId = this.projectId();
    if (!projectId) return;
    this.busyState.set(true);
    const itemRes = (await this.rdApi.getRdItem(this.projectId(), itemId)) as RdItemEntity;
    const logsRes = (await this.rdApi.getRdItemLogs(this.projectId(), itemId))
      .items as RdLogEntity[];
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

  update(itemId: string, input: UpdateRdItemInput): void {
    const projectId = this.projectId();
    if (!projectId) return;
    this.runAction(() => this.rdApi.update(projectId, itemId, input));
  }

  start(itemId: string): void {
    const projectId = this.projectId()!;
    this.runAction(() => this.rdApi.start(projectId, itemId));
  }

  progress(itemId: string, progress: number): void {
    this.runAction(() => this.rdApi.progress(this.projectId()!, itemId, progress));
  }

  block(itemId: string, input: BlockRdItemInput): void {
    this.runAction(() => this.rdApi.block(this.projectId(), itemId, input));
  }

  resume(itemId: string): void {
    this.runAction(() => this.rdApi.resume(this.projectId(), itemId));
  }

  resolve(itemId: string): void {
    const projectId = this.projectId();

    if (!projectId) return;
    this.runAction(() => this.rdApi.resolve(projectId, itemId));
  }

  advanceStage(itemId: string, input: AdvanceRdStageInput): void {
    // this.runAction(() => this.rdApi.advanceStage(itemId, input));
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

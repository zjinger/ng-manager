import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { ISSUE_PRIORITY_LABELS, RD_STATUS_LABELS } from '@shared/constants';
import { ActiveFilterTag, ActiveFiltersBarComponent, PageHeaderComponent, ListStateComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { RdBoardComponent } from '../../components/rd-board/rd-board.component';
import { RdDetailDrawerComponent } from '../../components/rd-detail-drawer/rd-detail-drawer.component';
import { RdFilterBarComponent, type RdViewMode } from '../../components/rd-filter-bar/rd-filter-bar.component';
import { RdListTableComponent } from '../../components/rd-list-table/rd-list-table.component';
import { RdAdvanceStageDialogComponent } from '../../dialogs/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdBlockDialogComponent } from '../../dialogs/rd-block-dialog/rd-block-dialog.component';
import { RdCloseDialogComponent } from '../../dialogs/rd-close-dialog/rd-close-dialog.component';
import { RdCreateDialogComponent } from '../../dialogs/rd-create-dialog/rd-create-dialog.component';
import { RdEditDialogComponent } from '../../dialogs/rd-edit-dialog/rd-edit-dialog.component';
import { RdProgressUpdateDialogComponent } from '../../dialogs/rd-progress-update-dialog/rd-progress-update-dialog.component';
import { getRdMemberIds, type CreateRdItemInput, type RdItemEntity, type RdItemProgress, type RdListQuery, type RdLogEntity, type RdStageHistoryEntry } from '../../models/rd.model';
import { MemberProgressItem } from '../../components/rd-progress-panel/rd-progress-panel.component';
import { RdApiService } from '../../services/rd-api.service';
import { RdPermissionService } from '../../services/rd-permission.service';
import { RdStore } from '../../store/rd.store';
import { map } from 'rxjs';

@Component({
  selector: 'app-rd-board-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ListStateComponent,
    RdFilterBarComponent,
    RdBoardComponent,
    RdListTableComponent,
    RdDetailDrawerComponent,
    RdAdvanceStageDialogComponent,
    RdCreateDialogComponent,
    RdBlockDialogComponent,
    RdCloseDialogComponent,
    RdEditDialogComponent,
    RdProgressUpdateDialogComponent,
    NzPaginationModule,
    ActiveFiltersBarComponent,
  ],
  providers: [RdStore],
  template: `
    <app-page-header title="研发项" [subtitle]="subtitle()" />

    <app-rd-filter-bar
      [query]="store.query()"
      [stages]="store.stages()"
      [members]="members()"
      [currentUserId]="currentUserId() || ''"
      [viewMode]="viewMode()"
      [canCreate]="projectContext.currentProjectIsActive()"
      (submit)="applyFilters($event)"
      (reset)="resetFilters()"
      (create)="createOpen.set(true)"
      (viewModeChange)="viewMode.set($event)"
    />
    <app-active-filters-bar [tags]="activeFilterBarTags()" (remove)="onActiveFilterRemove($event)" (clear)="resetFilters()" />

    @if (!projectContext.currentProjectId()) {
      <app-list-state [empty]="true" emptyTitle="请先在左侧选择项目" emptyDescription="选择项目后再查看对应研发项。" />
    } @else {
      <app-list-state
        [loading]="store.loading()"
        [empty]="store.items().length === 0"
        loadingText="正在加载研发项…"
        emptyTitle="当前项目下还没有研发项数据"
      >
        @if (viewMode() === 'board') {
          <app-rd-board
            [stages]="store.stages()"
            [items]="store.items()"
            [selectedItemId]="selectedItemId()"
            (selectItem)="openDetail($event)"
          />
        } @else {
          <app-rd-list-table
            [stages]="store.stages()"
            [items]="store.items()"
            [members]="members()"
            [page]="store.page()"
            [pageSize]="store.pageSize()"
            [selectedItemId]="selectedItemId()"
            (selectItem)="openDetail($event)"
          />
        }

        @if (store.total() > 0) {
          <div class="rd-pagination">
            <nz-pagination
              [nzTotal]="store.total()"
              [nzPageIndex]="store.page()"
              [nzPageSize]="store.pageSize()"
              [nzPageSizeOptions]="[10, 20, 50, 100]"
              [nzShowSizeChanger]="true"
              [nzShowQuickJumper]="true"
              [nzShowTotal]="totalTpl"
              (nzPageIndexChange)="onPageIndexChange($event)"
              (nzPageSizeChange)="onPageSizeChange($event)"
            ></nz-pagination>
            <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
          </div>
        }
      </app-list-state>
    }

    <app-rd-detail-drawer
      [open]="!!selectedItem()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [logs]="selectedLogs()"
      [stages]="store.stages()"
      [stageHistory]="selectedStageHistory()"
      [canEditBasic]="canEditSelectedBasic()"
      [canAdvance]="canAdvanceSelectedItem()"
      [canAccept]="canAcceptSelectedItem()"
      [canClose]="canCloseSelectedItem()"
      [memberProgressList]="selectedMemberProgressList()"
      [currentUserId]="currentUserId() || ''"
      (actionClick)="handleSelectedAction($event)"
      (editRequest)="openEditDialog()"
      (close)="closeDetail()"
      (updateProgressClick)="openProgressUpdate($event)"
    />

    <app-rd-progress-update-dialog
      [open]="progressUpdateOpen()"
      [busy]="store.busy()"
      [memberName]="progressUpdateData()?.memberName || ''"
      [currentProgress]="progressUpdateData()?.currentProgress || 0"
      (save)="confirmUpdateProgress($event)"
      (cancel)="closeProgressUpdate()"
    />

    <app-rd-create-dialog
      [open]="createOpen()"
      [busy]="store.busy()"
      [stages]="store.stages()"
      [members]="members()"
      [projectName]="projectContext.currentProject()?.name || ''"
      (cancel)="createOpen.set(false)"
      (create)="createRd($event)"
    />

    <app-rd-block-dialog
      [open]="blockOpen()"
      [busy]="store.busy()"
      [item]="blockingItem()"
      (cancel)="closeBlockDialog()"
      (confirm)="confirmBlock($event.blockerReason)"
    />

    <app-rd-close-dialog
      [open]="closeOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      (cancel)="closeOpen.set(false)"
      (confirm)="confirmClose($event.reason)"
    />

    <app-rd-edit-dialog
      [open]="editOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      (cancel)="editOpen.set(false)"
      (save)="saveSelectedBasic($event)"
    />

    <app-rd-advance-stage-dialog
      [open]="advanceStageOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [stages]="store.stages()"
      [members]="members()"
      [currentMemberIds]="selectedMemberIdsForAdvance()"
      (cancel)="advanceStageOpen.set(false)"
      (confirm)="confirmAdvanceStage($event)"
    />
  `,
  styles: [
    `
      .rd-pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdBoardPageComponent {
  readonly store = inject(RdStore);
  readonly authStore = inject(AuthStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly rdApi = inject(RdApiService);
  private readonly rdPermission = inject(RdPermissionService);
  private readonly message = inject(NzMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly viewMode = signal<RdViewMode>('list');
  readonly createOpen = signal(false);
  readonly blockOpen = signal(false);
  readonly closeOpen = signal(false);
  readonly editOpen = signal(false);
  readonly advanceStageOpen = signal(false);
  readonly progressUpdateOpen = signal(false);
  readonly progressUpdateData = signal<{ userId: string; memberName: string; currentProgress: number } | null>(null);
  readonly blockingItem = signal<RdItemEntity | null>(null);
  readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });
  readonly actionQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('action'))), {
    initialValue: this.route.snapshot.queryParamMap.get('action'),
  });
  readonly selectedItemId = computed(() => this.detailQuery());
  readonly selectedItem = computed(
    () => this.store.items().find((item) => item.id === this.selectedItemId()) ?? null
  );
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly selectedLogs = signal<RdLogEntity[]>([]);
  readonly selectedStageHistory = signal<RdStageHistoryEntry[]>([]);
  readonly selectedProgressList = signal<RdItemProgress[]>([]);
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
  readonly selectedMemberProgressList = computed<MemberProgressItem[]>(() => {
    const item = this.selectedItem();
    const list = this.normalizeProgressByUser(this.selectedProgressList());
    const currentId = this.currentUserId();
    const memberMap = new Map(this.members().map((m) => [m.userId, m.displayName]));
    const avatarMap = new Map(this.members().map((m) => [m.userId, m.avatarUrl]));
    const progressByUserId = new Map(list.map((p) => [p.userId, p]));
    const legacyMemberIds = getRdMemberIds(item);
    const useLegacyAssigneeProgressFallback =
      list.length === 0 &&
      legacyMemberIds.length === 1 &&
      !!item?.assigneeId &&
      legacyMemberIds[0] === item.assigneeId;
    const normalizedList = [...list];
    for (const userId of legacyMemberIds) {
      if (!progressByUserId.has(userId)) {
        const fallbackProgress =
          useLegacyAssigneeProgressFallback && userId === item?.assigneeId ? Number(item?.progress ?? 0) : 0;
        normalizedList.push({
          id: `legacy-${userId}`,
          itemId: item?.id || '',
          userId,
          userName: userId === item?.assigneeId ? (item.assigneeName ?? userId) : userId,
          progress: Math.max(0, Math.min(100, fallbackProgress)),
          note: null,
          updatedAt: item?.updatedAt ?? '',
        });
      }
    }

    return normalizedList.map((p) => ({
      ...p,
      itemId: item?.id || '',
      memberName:
        memberMap.get(p.userId) ||
        (p.userId === item?.assigneeId ? (item.assigneeName ?? null) : null) ||
        p.userName ||
        p.userId,
      isCurrentUser: p.userId === currentId,
      avatarUrl: avatarMap.get(p.userId) ?? null,
      updatedAt: p.updatedAt,
    }));
  });
  readonly selectedMemberIdsForAdvance = computed(() => getRdMemberIds(this.selectedItem()));
  readonly canEditSelectedBasic = computed(() =>
    this.rdPermission.canEditBasic(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canCloseSelectedItem = computed(() => {
    const item = this.selectedItem();
    if (!this.rdPermission.canClose(item, this.currentUserId())) {
      return false;
    }
    if (!item) {
      return false;
    }
    if (item.status === 'accepted') {
      return false;
    }
    return true;
  });
  readonly canAdvanceSelectedItem = computed(
    () =>
      this.hasNextStage(this.selectedItem()) &&
      this.rdPermission.canAdvance(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canAcceptSelectedItem = computed(() =>
    this.rdPermission.canAccept(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly subtitle = computed(() => {
    const project = this.projectContext.currentProject();
    const projectName = project?.name ?? '当前项目';
    const projectStatusText = project?.status === 'inactive' ? '（已归档）' : '';
    return `${projectName} ${projectStatusText} · 共 ${this.store.total()} 个研发项`;
  });
  readonly activeFilterTags = computed(() => {
    const query = this.store.query();
    const firstSeen = new Set<string>();
    const withPrefix = (group: string, prefix: string, valueLabel: string) => {
      const first = !firstSeen.has(group);
      if (first) {
        firstSeen.add(group);
      }
      return first ? `${prefix}: ${valueLabel}` : valueLabel;
    };
    const tags: Array<{ kind: 'stageIds' | 'status' | 'priority' | 'assigneeIds' | 'keyword'; value: string; label: string }> = [];
    const stageIds = query.stageIds ?? [];
    if (stageIds.length > 0) {
      for (const stageId of stageIds) {
        const stageName = this.store.stages().find((item) => item.id === stageId)?.name || stageId;
        tags.push({
          kind: 'stageIds',
          value: stageId,
          label: withPrefix('stageIds', '阶段', stageName),
        });
      }
    }
    const statuses = query.status ?? [];
    if (statuses.length > 0) {
      for (const status of statuses) {
        tags.push({
          kind: 'status',
          value: status,
          label: withPrefix('status', '状态', RD_STATUS_LABELS[status] || status),
        });
      }
    }
    const priorities = query.priority ?? [];
    if (priorities.length > 0) {
      for (const priority of priorities) {
        tags.push({
          kind: 'priority',
          value: priority,
          label: withPrefix('priority', '优先级', ISSUE_PRIORITY_LABELS[priority] || priority),
        });
      }
    }
    const assigneeIds = query.assigneeIds ?? [];
    if (assigneeIds.length > 0) {
      for (const assigneeId of assigneeIds) {
        const name = this.members().find((item) => item.userId === assigneeId)?.displayName || assigneeId;
        tags.push({
          kind: 'assigneeIds',
          value: assigneeId,
          label: withPrefix('assigneeIds', '负责人', name),
        });
      }
    }
    if (query.keyword?.trim()) {
      tags.push({
        kind: 'keyword',
        value: query.keyword.trim(),
        label: withPrefix('keyword', '关键词', query.keyword.trim()),
      });
    }
    return tags;
  });
  readonly activeFilterBarTags = computed<ActiveFilterTag[]>(() =>
    this.activeFilterTags().map((tag) => ({
      ...tag,
      className: this.filterTagClass(tag.kind).replace('filter-tag ', ''),
    }))
  );
  private lastProjectId: string | null | undefined = undefined;

  constructor() {
    effect((onCleanup) => {
      const projectId = this.projectContext.currentProjectId();
      const isFirstRun = this.lastProjectId === undefined;
      const projectChanged = !isFirstRun && this.lastProjectId !== projectId;
      const shouldRefresh = isFirstRun || projectChanged;
      this.lastProjectId = projectId;

      if (!shouldRefresh) {
        return;
      }

      this.store.refreshForProject(projectId);
      if (projectChanged) {
        this.closeDetail();
      }
      if (!projectId) {
        this.members.set([]);
        return;
      }

      const subscription = this.projectApi.listMembers(projectId).subscribe({
        next: (items) => this.members.set(items),
        error: () => this.members.set([]),
      });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const action = this.actionQuery();
      if (action !== 'create') {
        return;
      }
      this.createOpen.set(true);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { action: null },
        queryParamsHandling: 'merge',
      });
    });

    effect(() => {
      const items = this.store.items();
      const selectedId = this.selectedItemId();
      if (!selectedId) {
        return;
      }
      if (!items.some((item) => item.id === selectedId)) {
        this.closeDetail();
      }
    });

    effect((onCleanup) => {
      const selectedId = this.selectedItemId();
      const selectedUpdatedAt = this.selectedItem()?.updatedAt;
      if (!selectedId) {
        this.selectedLogs.set([]);
        this.selectedStageHistory.set([]);
        this.selectedProgressList.set([]);
        return;
      }
      void selectedUpdatedAt;
      const logsSub = this.rdApi.listLogs(selectedId).subscribe({
        next: (logs) => this.selectedLogs.set(logs),
        error: () => this.selectedLogs.set([]),
      });
      const progressSub = this.rdApi.listProgress(selectedId).subscribe({
        next: (progress) => this.selectedProgressList.set(progress),
        error: () => this.selectedProgressList.set([]),
      });
      const stageHistorySub = this.rdApi.listStageHistory(selectedId).subscribe({
        next: (items) => this.selectedStageHistory.set(items),
        error: () => this.selectedStageHistory.set([]),
      });
      onCleanup(() => {
        logsSub.unsubscribe();
        progressSub.unsubscribe();
        stageHistorySub.unsubscribe();
      });
    });
  }

  applyFilters(query: RdListQuery): void {
    this.store.updateQuery({
      keyword: query.keyword?.trim(),
      stageIds: query.stageIds,
      status: query.status,
      priority: query.priority,
      assigneeIds: query.assigneeIds,
      page: 1,
    });
  }

  resetFilters(): void {
    this.store.updateQuery({
      page: 1,
      keyword: '',
      stageId: '',
      stageIds: [],
      status: [],
      type: [],
      priority: [],
      assigneeIds: [],
    });
  }

  removeFilterTag(kind: 'stageIds' | 'status' | 'priority' | 'assigneeIds' | 'keyword', value: string): void {
    const current = this.store.query();
    if (kind === 'stageIds') {
      this.store.updateQuery({ page: 1, stageIds: (current.stageIds ?? []).filter((item) => item !== value) });
      return;
    }
    if (kind === 'status') {
      this.store.updateQuery({
        page: 1,
        status: (current.status ?? []).filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'priority') {
      this.store.updateQuery({
        page: 1,
        priority: (current.priority ?? []).filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'assigneeIds') {
      this.store.updateQuery({
        page: 1,
        assigneeIds: (current.assigneeIds ?? []).filter((item) => item !== value),
      });
      return;
    }
    this.store.updateQuery({ page: 1, keyword: '' });
  }

  onActiveFilterRemove(event: { kind: string; value: string }): void {
    this.removeFilterTag(event.kind as 'stageIds' | 'status' | 'priority' | 'assigneeIds' | 'keyword', event.value);
  }

  onPageIndexChange(page: number): void {
    this.store.updateQuery({ page });
  }

  onPageSizeChange(pageSize: number): void {
    const nextPageSize = Number(pageSize) || this.store.pageSize();
    if (nextPageSize === this.store.pageSize()) {
      return;
    }
    this.store.updateQuery({ page: 1, pageSize: nextPageSize });
  }

  createRd(input: Omit<CreateRdItemInput, 'projectId'>): void {
    this.store.create(input, () => this.createOpen.set(false));
  }

  openDetail(item: RdItemEntity): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
    });
  }

  closeDetail(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: null },
      queryParamsHandling: 'merge',
    });
    this.selectedLogs.set([]);
    this.selectedStageHistory.set([]);
    this.advanceStageOpen.set(false);
    this.closeOpen.set(false);
    this.editOpen.set(false);
  }

  handleAction(item: RdItemEntity, action: 'advance' | 'accept' | 'close' | 'reopen'): void {
    this.openDetail(item);
    switch (action) {
      case 'advance':
        if (!this.canAdvanceSelectedItem()) {
          return;
        }
        this.warnIfAdvanceWithIncompleteProgress(this.selectedMemberProgressList());
        this.advanceStageOpen.set(true);
        break;
      case 'close':
        if (!this.canCloseSelectedItem()) {
          return;
        }
        this.closeOpen.set(true);
        break;
      case 'accept':
        if (!this.canAcceptSelectedItem()) {
          return;
        }
        this.store.accept(item.id);
        break;
      case 'reopen':
        if (!this.canCloseSelectedItem()) {
          return;
        }
        this.rdApi.reopen(item.id).subscribe({
          next: (updated) => this.store.updateItemInList(updated),
        });
        break;
    }
  }

  handleSelectedAction(action: 'advance' | 'accept' | 'close' | 'reopen'): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.handleAction(current, action);
  }

  saveSelectedBasic(input: { title: string; description: string | null }): void {
    if (!this.canEditSelectedBasic()) {
      return;
    }
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.update(current.id, {
      version: current.version,
      title: input.title,
      description: input.description,
    });
    this.editOpen.set(false);
  }

  confirmBlock(blockerReason: string): void {
    const item = this.blockingItem();
    if (!item) {
      return;
    }
    this.store.block(item.id, { blockerReason });
    this.closeBlockDialog();
  }

  confirmAdvanceStage(input: { stageId: string; memberIds: string[]; description?: string; planStartAt?: string; planEndAt?: string }): void {
    const current = this.selectedItem();
    if (!current || !input.stageId.trim()) {
      return;
    }
    this.store.advanceStage(current.id, {
      stageId: input.stageId.trim(),
      memberIds: input.memberIds,
      description: input.description?.trim() || undefined,
      planStartAt: input.planStartAt?.trim() || undefined,
      planEndAt: input.planEndAt?.trim() || undefined,
    });
    this.advanceStageOpen.set(false);
  }

  confirmClose(reason: string): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.close(current.id, { reason });
    this.closeOpen.set(false);
  }

  openEditDialog(): void {
    if (!this.canEditSelectedBasic() || this.selectedItem()?.status === 'closed') {
      return;
    }
    this.editOpen.set(true);
  }

  openProgressUpdate(data: { userId: string; memberName: string; currentProgress: number; quickStart?: boolean }): void {
    if (this.selectedItem()?.status === 'closed') {
      return;
    }
    if (data.quickStart) {
      this.quickStartProgress();
      return;
    }
    this.progressUpdateData.set(data);
    this.progressUpdateOpen.set(true);
  }

  closeProgressUpdate(): void {
    this.progressUpdateOpen.set(false);
    this.progressUpdateData.set(null);
  }

  confirmUpdateProgress(input: { progress: number; note: string }): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.rdApi.updateProgress(current.id, input).subscribe({
      next: (item) => {
        this.store.updateItemInList(item);
        this.loadSelectedProgress(item.id);
        this.loadSelectedLogs(item.id);
        this.progressUpdateOpen.set(false);
      },
      error: () => {
      },
    });
  }

  closeBlockDialog(): void {
    this.blockOpen.set(false);
    this.blockingItem.set(null);
  }

  private loadSelectedProgress(itemId: string): void {
    this.rdApi.listProgress(itemId).subscribe({
      next: (progress) => this.selectedProgressList.set(progress),
      error: () => this.selectedProgressList.set([]),
    });
  }

  private loadSelectedLogs(itemId: string): void {
    this.rdApi.listLogs(itemId).subscribe({
      next: (logs) => this.selectedLogs.set(logs),
      error: () => this.selectedLogs.set([]),
    });
  }

  private quickStartProgress(): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.rdApi.updateProgress(current.id, { progress: 1, note: '' }).subscribe({
      next: (item) => {
        this.store.updateItemInList(item);
        this.loadSelectedProgress(item.id);
        this.loadSelectedLogs(item.id);
      },
      error: () => {
      },
    });
  }

  filterTagClass(kind: 'stageIds' | 'status' | 'priority' | 'assigneeIds' | 'keyword'): string {
    if (kind === 'status') return 'filter-tag filter-tag--status';
    if (kind === 'priority') return 'filter-tag filter-tag--priority';
    if (kind === 'assigneeIds') return 'filter-tag filter-tag--people';
    if (kind === 'stageIds') return 'filter-tag filter-tag--scope';
    return 'filter-tag filter-tag--keyword';
  }

  private warnIfAdvanceWithIncompleteProgress(list: MemberProgressItem[]): void {
    const incomplete = list.filter((item) => Number(item.progress) < 100);
    if (incomplete.length === 0) {
      return;
    }
    const names = incomplete
      .map((item) => item.memberName?.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('、');
    this.message.warning(`执行人进度未全部达到 100%${names ? `（${names}${incomplete.length > 3 ? ' 等' : ''}）` : ''}，请确认后继续进入下一阶段。`);
  }

  private hasNextStage(item: RdItemEntity | null): boolean {
    if (!item) {
      return false;
    }
    const all = [...this.store.stages()]
      .filter((stage) => stage.enabled)
      .sort((a, b) => {
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        const aCreated = Date.parse(a.createdAt || '');
        const bCreated = Date.parse(b.createdAt || '');
        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return aCreated - bCreated;
        }
        return a.id.localeCompare(b.id);
      });
    if (all.length === 0) {
      return false;
    }
    if (!item.stageId) {
      return all.length > 0;
    }
    const currentIndex = all.findIndex((stage) => stage.id === item.stageId);
    if (currentIndex < 0) {
      return all.length > 0;
    }
    return currentIndex < all.length - 1;
  }

  private normalizeProgressByUser(list: RdItemProgress[]): RdItemProgress[] {
    const dedup = new Map<string, RdItemProgress>();
    for (const row of list) {
      const existing = dedup.get(row.userId);
      if (!existing) {
        dedup.set(row.userId, row);
        continue;
      }
      const existingAt = Date.parse(existing.updatedAt || "");
      const rowAt = Date.parse(row.updatedAt || "");
      if (Number.isFinite(rowAt) && (!Number.isFinite(existingAt) || rowAt >= existingAt)) {
        dedup.set(row.userId, row);
      }
    }
    return Array.from(dedup.values());
  }
}

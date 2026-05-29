import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { ISSUE_PRIORITY_LABELS, RD_STATUS_LABELS } from '@shared/constants';
import { ActiveFilterTag, ActiveFiltersBarComponent, PageHeaderComponent, ListStateComponent } from '@shared/ui';
import type { IssueEntity } from '../../../issues/models/issue.model';
import { IssueApiService } from '../../../issues/services/issue-api.service';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { RdBoardComponent } from '../../components/rd-board/rd-board.component';
import { RdDetailDrawerComponent } from '../../components/rd-detail-drawer/rd-detail-drawer.component';
import { RdFilterBarComponent, type RdViewMode } from '../../components/rd-filter-bar/rd-filter-bar.component';
import { RdListTableComponent } from '../../components/rd-list-table/rd-list-table.component';
import { RdAdvanceStageDialogComponent } from '../../dialogs/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdCloseDialogComponent } from '../../dialogs/rd-close-dialog/rd-close-dialog.component';
import { RdCompleteDialogComponent } from '../../dialogs/rd-complete-dialog/rd-complete-dialog.component';
import { RdCreateDialogComponent } from '../../dialogs/rd-create-dialog/rd-create-dialog.component';
import { RdEditDialogComponent, type RdEditDialogSaveInput } from '../../dialogs/rd-edit-dialog/rd-edit-dialog.component';
import { RdProgressUpdateDialogComponent, type RdProgressUpdateDialogSaveInput } from '../../dialogs/rd-progress-update-dialog/rd-progress-update-dialog.component';
import { getRdMemberIds, RD_TYPE_LABELS, type CreateRdItemInput, type RdItemEntity, type RdItemProgress, type RdListQuery, type RdLogEntity, type RdMemberBlockEntity, type RdStageHistoryEntry } from '../../models/rd.model';
import type { MemberProgressItem } from '../../components/rd-progress-panel/rd-progress-panel.component';
import { RdApiService } from '../../services/rd-api.service';
import { RdPermissionService } from '../../services/rd-permission.service';
import { RdStore } from '../../store/rd.store';
import { map } from 'rxjs';

const LINKED_ISSUES_PAGE_SIZE = 10;
type RdFilterTagKind = 'stageIds' | 'status' | 'type' | 'priority' | 'assigneeIds' | 'sortBy' | 'sortOrder' | 'keyword' | 'includeClosed';

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
    RdCloseDialogComponent,
    RdCompleteDialogComponent,
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
      [busy]="store.busy() || progressUpdating()"
      [item]="selectedItem()"
      [logs]="selectedLogs()"
      [stages]="store.stages()"
      [stageHistory]="selectedStageHistory()"
      [linkedIssues]="selectedLinkedIssues()"
      [linkedIssuesTotal]="selectedLinkedIssuesTotal()"
      [linkedIssuesLoading]="selectedLinkedIssuesLoading()"
      [canEditBasic]="canEditSelectedBasic()"
      [canAdvance]="canAdvanceSelectedItem()"
      [canComplete]="canCompleteSelectedItem()"
      [canAccept]="canAcceptSelectedItem()"
      [canClose]="canCloseSelectedItem()"
      [memberProgressList]="selectedMemberProgressList()"
      [memberBlocks]="selectedMemberBlocks()"
      [canResolveMemberBlocks]="canResolveSelectedMemberBlocks()"
      [currentUserId]="currentUserId() || ''"
      (actionClick)="handleSelectedAction($event)"
      (editRequest)="openEditDialog()"
      (close)="closeDetail()"
      (updateProgressClick)="openProgressUpdate($event)"
      (resolveMemberBlockClick)="resolveMemberBlock($event.blockId)"
      (loadMoreLinkedIssues)="loadMoreSelectedLinkedIssues()"
    />

    <app-rd-progress-update-dialog
      [open]="progressUpdateOpen()"
      [busy]="store.busy() || progressUpdating()"
      [memberName]="progressUpdateData()?.memberName || ''"
      [currentProgress]="progressUpdateData()?.currentProgress || 0"
      [activeBlock]="progressUpdateActiveBlock()"
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

    <app-rd-close-dialog
      [open]="closeOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      (cancel)="closeOpen.set(false)"
      (confirm)="confirmClose($event.reason)"
    />

    <app-rd-complete-dialog
      [open]="completeOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [memberProgressList]="selectedMemberProgressList()"
      (cancel)="completeOpen.set(false)"
      (confirm)="confirmComplete($event.reason)"
    />

    <app-rd-edit-dialog
      [open]="editOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [members]="members()"
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
  private readonly issueApi = inject(IssueApiService);
  private readonly rdPermission = inject(RdPermissionService);
  private readonly message = inject(NzMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly viewMode = signal<RdViewMode>('list');
  readonly createOpen = signal(false);
  readonly closeOpen = signal(false);
  readonly completeOpen = signal(false);
  readonly editOpen = signal(false);
  readonly advanceStageOpen = signal(false);
  readonly progressUpdateOpen = signal(false);
  readonly progressUpdateData = signal<{ userId: string; memberName: string; currentProgress: number } | null>(null);
  readonly progressUpdating = signal(false);
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
  readonly selectedMemberBlocks = signal<RdMemberBlockEntity[]>([]);
  readonly selectedLinkedIssues = signal<IssueEntity[]>([]);
  readonly selectedLinkedIssuesTotal = signal(0);
  readonly selectedLinkedIssuesPage = signal(1);
  readonly selectedLinkedIssuesLoading = signal(false);
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
  readonly selectedMemberProgressList = computed<MemberProgressItem[]>(() => {
    const item = this.selectedItem();
    const list = this.normalizeProgressByUser(this.selectedProgressList());
    const currentId = this.currentUserId();
    const memberMap = new Map(this.members().map((m) => [m.userId, m.displayName]));
    const avatarMap = new Map(this.members().map((m) => [m.userId, m.avatarUrl]));
    const progressByUserId = new Map(list.map((p) => [p.userId, p]));
    const legacyMemberIds = getRdMemberIds(item);
    const activeMemberIds = new Set(legacyMemberIds);
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
        const fallbackUpdatedAt = useLegacyAssigneeProgressFallback && fallbackProgress > 0 ? (item?.updatedAt ?? '') : '';
        normalizedList.push({
          id: `legacy-${userId}`,
          itemId: item?.id || '',
          userId,
          userName: userId === item?.assigneeId ? (item.assigneeName ?? userId) : userId,
          progress: Math.max(0, Math.min(100, fallbackProgress)),
          note: null,
          updatedAt: fallbackUpdatedAt,
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
      isActiveMember: activeMemberIds.has(p.userId),
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
  readonly canCompleteSelectedItem = computed(() =>
    this.rdPermission.canForceComplete(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canAcceptSelectedItem = computed(() =>
    this.rdPermission.canAccept(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canResolveSelectedMemberBlocks = computed(() =>
    this.rdPermission.canVerify(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly progressUpdateActiveBlock = computed(() => {
    const userId = this.progressUpdateData()?.userId;
    if (!userId) {
      return null;
    }
    return this.selectedMemberBlocks().find((block) => block.userId === userId && block.status === 'active') ?? null;
  });
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
    const tags: Array<{ kind: RdFilterTagKind; value: string; label: string }> = [];
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
    const statuses = query.includeClosed === true ? (query.status ?? []) : (query.status ?? []).filter((item) => item !== 'closed');
    if (statuses.length > 0) {
      for (const status of statuses) {
        tags.push({
          kind: 'status',
          value: status,
          label: withPrefix('status', '状态', RD_STATUS_LABELS[status] || status),
        });
      }
    }
    const types = query.type ?? [];
    if (types.length > 0) {
      for (const type of types) {
        tags.push({
          kind: 'type',
          value: type,
          label: withPrefix('type', '类型', RD_TYPE_LABELS[type] || type),
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
    if (query.includeClosed === true) {
      tags.push({
        kind: 'includeClosed',
        value: 'true',
        label: '包含已关闭',
      });
    }
    if (query.sortBy !== 'createdAt') {
      tags.push({
        kind: 'sortBy',
        value: query.sortBy || 'updatedAt',
        label: withPrefix('sortBy', '排序字段', '更新时间'),
      });
    }
    if (query.sortOrder !== 'desc') {
      tags.push({
        kind: 'sortOrder',
        value: query.sortOrder || 'asc',
        label: withPrefix('sortOrder', '排序方向', query.sortOrder === 'asc' ? '正序' : '倒序'),
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
        this.selectedMemberBlocks.set([]);
        this.selectedLinkedIssues.set([]);
        this.selectedLinkedIssuesTotal.set(0);
        this.selectedLinkedIssuesPage.set(1);
        this.selectedLinkedIssuesLoading.set(false);
        return;
      }
      void selectedUpdatedAt;
      this.selectedLinkedIssues.set([]);
      this.selectedLinkedIssuesTotal.set(0);
      this.selectedLinkedIssuesPage.set(1);
      this.selectedLinkedIssuesLoading.set(false);
      const logsSub = this.rdApi.listLogs(selectedId).subscribe({
        next: (logs) => this.selectedLogs.set(logs),
        error: () => this.selectedLogs.set([]),
      });
      const progressSub = this.rdApi.listProgress(selectedId).subscribe({
        next: (progress) => this.selectedProgressList.set(progress),
        error: () => this.selectedProgressList.set([]),
      });
      const memberBlocksSub = this.rdApi.listMemberBlocks(selectedId).subscribe({
        next: (items) => this.selectedMemberBlocks.set(items),
        error: () => this.selectedMemberBlocks.set([]),
      });
      const stageHistorySub = this.rdApi.listStageHistory(selectedId).subscribe({
        next: (items) => this.selectedStageHistory.set(items),
        error: () => this.selectedStageHistory.set([]),
      });
      const linkedIssuesSub = this.issueApi
        .list({ projectId: this.projectContext.currentProjectId() || undefined, rdItemId: selectedId, page: 1, pageSize: LINKED_ISSUES_PAGE_SIZE })
        .subscribe({
          next: (result) => {
            this.selectedLinkedIssues.set(result.items);
            this.selectedLinkedIssuesPage.set(result.page);
            this.selectedLinkedIssuesTotal.set(result.total);
            this.selectedLinkedIssuesLoading.set(false);
          },
          error: () => {
            this.selectedLinkedIssues.set([]);
            this.selectedLinkedIssuesTotal.set(0);
            this.selectedLinkedIssuesPage.set(1);
            this.selectedLinkedIssuesLoading.set(false);
          },
        });
      onCleanup(() => {
        logsSub.unsubscribe();
        progressSub.unsubscribe();
        memberBlocksSub.unsubscribe();
        stageHistorySub.unsubscribe();
        linkedIssuesSub.unsubscribe();
      });
    });
  }

  applyFilters(query: RdListQuery): void {
    this.store.updateQuery({ ...query, keyword: query.keyword?.trim(), page: 1 });
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
      includeClosed: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  removeFilterTag(kind: RdFilterTagKind, value: string): void {
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
    if (kind === 'type') {
      this.store.updateQuery({
        page: 1,
        type: (current.type ?? []).filter((item) => item !== value),
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
    if (kind === 'sortBy') {
      this.store.updateQuery({ page: 1, sortBy: 'createdAt' });
      return;
    }
    if (kind === 'sortOrder') {
      this.store.updateQuery({ page: 1, sortOrder: 'desc' });
      return;
    }
    if (kind === 'includeClosed') {
      this.store.updateQuery({
        page: 1,
        includeClosed: false,
        status: (current.status ?? []).filter((item) => item !== 'closed'),
      });
      return;
    }
    this.store.updateQuery({ page: 1, keyword: '' });
  }

  onActiveFilterRemove(event: { kind: string; value: string }): void {
    this.removeFilterTag(event.kind as RdFilterTagKind, event.value);
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
    this.selectedProgressList.set([]);
    this.selectedMemberBlocks.set([]);
    this.selectedLinkedIssues.set([]);
    this.selectedLinkedIssuesTotal.set(0);
    this.selectedLinkedIssuesPage.set(1);
    this.selectedLinkedIssuesLoading.set(false);
    this.advanceStageOpen.set(false);
    this.closeOpen.set(false);
    this.completeOpen.set(false);
    this.editOpen.set(false);
  }

  handleAction(item: RdItemEntity, action: 'advance' | 'complete' | 'accept' | 'close' | 'reopen'): void {
    this.openDetail(item);
    switch (action) {
      case 'advance':
        if (!this.canAdvanceSelectedItem()) {
          return;
        }
        this.warnIfAdvanceWithActiveBlocks();
        this.warnIfAdvanceWithIncompleteProgress(this.selectedMemberProgressList());
        this.advanceStageOpen.set(true);
        break;
      case 'complete':
        if (!this.canCompleteSelectedItem()) {
          return;
        }
        this.completeOpen.set(true);
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

  handleSelectedAction(action: 'advance' | 'complete' | 'accept' | 'close' | 'reopen'): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.handleAction(current, action);
  }

  saveSelectedBasic(input: RdEditDialogSaveInput): void {
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
      memberIds: input.memberIds,
      verifierId: input.verifierId,
    });
    this.editOpen.set(false);
  }

  resolveMemberBlock(blockId: string): void {
    const current = this.selectedItem();
    if (!current || this.progressUpdating()) {
      return;
    }
    this.rdApi.resolveMemberBlock(current.id, blockId).subscribe({
      next: () => {
        this.loadSelectedMemberBlocks(current.id);
        this.loadSelectedLogs(current.id);
      },
    });
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

  confirmComplete(reason: string): void {
    const current = this.selectedItem();
    if (!current || !this.canCompleteSelectedItem()) {
      return;
    }
    this.store.complete(current.id, { reason }, () => this.completeOpen.set(false));
  }

  openEditDialog(): void {
    if (!this.canEditSelectedBasic() || this.selectedItem()?.status === 'closed') {
      return;
    }
    this.editOpen.set(true);
  }

  openProgressUpdate(data: { userId: string; memberName: string; currentProgress: number; quickStart?: boolean }): void {
    if (this.selectedItem()?.status === 'closed' || this.progressUpdating()) {
      return;
    }
    if (data.quickStart) {
      this.confirmUpdateProgress({ progress: Math.max(1, data.currentProgress), note: '' });
      return;
    }
    this.progressUpdateData.set(data);
    this.progressUpdateOpen.set(true);
  }

  closeProgressUpdate(): void {
    this.progressUpdateOpen.set(false);
    this.progressUpdateData.set(null);
  }

  confirmUpdateProgress(input: RdProgressUpdateDialogSaveInput): void {
    const current = this.selectedItem();
    if (!current || this.progressUpdating()) {
      return;
    }
    this.progressUpdating.set(true);
    this.rdApi.updateProgress(current.id, input).subscribe({
      next: (item) => {
        this.store.updateItemInList(item);
        this.loadSelectedProgress(item.id);
        this.loadSelectedLogs(item.id);
        this.loadSelectedMemberBlocks(item.id);
        this.progressUpdating.set(false);
        this.closeProgressUpdate();
      },
      error: () => {
        this.progressUpdating.set(false);
      },
    });
  }

  loadMoreSelectedLinkedIssues(): void {
    const selectedId = this.selectedItemId();
    if (
      !selectedId ||
      this.selectedLinkedIssuesLoading() ||
      this.selectedLinkedIssues().length >= this.selectedLinkedIssuesTotal()
    ) {
      return;
    }
    const nextPage = this.selectedLinkedIssuesPage() + 1;
    this.selectedLinkedIssuesLoading.set(true);
    this.issueApi
      .list({
        projectId: this.projectContext.currentProjectId() || undefined,
        rdItemId: selectedId,
        page: nextPage,
        pageSize: LINKED_ISSUES_PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          if (this.selectedItemId() !== selectedId) {
            this.selectedLinkedIssuesLoading.set(false);
            return;
          }
          const existingIds = new Set(this.selectedLinkedIssues().map((issue) => issue.id));
          const nextItems = result.items.filter((issue) => !existingIds.has(issue.id));
          this.selectedLinkedIssues.update((items) => [...items, ...nextItems]);
          this.selectedLinkedIssuesPage.set(result.page);
          this.selectedLinkedIssuesTotal.set(result.total);
          this.selectedLinkedIssuesLoading.set(false);
        },
        error: () => {
          this.selectedLinkedIssuesLoading.set(false);
        },
      });
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

  private loadSelectedMemberBlocks(itemId: string): void {
    this.rdApi.listMemberBlocks(itemId).subscribe({
      next: (items) => this.selectedMemberBlocks.set(items),
      error: () => this.selectedMemberBlocks.set([]),
    });
  }

  filterTagClass(kind: RdFilterTagKind): string {
    if (kind === 'status') return 'filter-tag filter-tag--status';
    if (kind === 'type') return 'filter-tag filter-tag--type';
    if (kind === 'priority') return 'filter-tag filter-tag--priority';
    if (kind === 'assigneeIds') return 'filter-tag filter-tag--people';
    if (kind === 'stageIds') return 'filter-tag filter-tag--scope';
    if (kind === 'includeClosed') return 'filter-tag filter-tag--status';
    if (kind === 'sortBy' || kind === 'sortOrder') return 'filter-tag filter-tag--sort';
    return 'filter-tag filter-tag--keyword';
  }

  private warnIfAdvanceWithIncompleteProgress(list: MemberProgressItem[]): void {
    const incomplete = list.filter((item) => item.isActiveMember && Number(item.progress) < 100);
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

  private warnIfAdvanceWithActiveBlocks(): void {
    const active = this.selectedMemberBlocks().filter((item) => item.status === 'active');
    if (active.length === 0) {
      return;
    }
    const names = active
      .map((item) => item.userName?.trim() || item.userId)
      .slice(0, 3)
      .join('、');
    this.message.warning(`当前仍有 ${active.length} 个成员阻塞${names ? `（${names}${active.length > 3 ? ' 等' : ''}）` : ''}，请确认后继续进入下一阶段。`);
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

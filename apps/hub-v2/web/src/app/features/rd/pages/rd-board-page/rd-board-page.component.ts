import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { ISSUE_PRIORITY_LABELS, RD_STATUS_LABELS } from '@shared/constants';
import { PageHeaderComponent, ListStateComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { RdBoardComponent } from '../../components/rd-board/rd-board.component';
import { RdDetailDrawerComponent } from '../../components/rd-detail-drawer/rd-detail-drawer.component';
import { RdFilterBarComponent, type RdViewMode } from '../../components/rd-filter-bar/rd-filter-bar.component';
import { RdListTableComponent } from '../../components/rd-list-table/rd-list-table.component';
import { RdAdvanceStageDialogComponent } from '../../dialogs/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdBlockDialogComponent } from '../../dialogs/rd-block-dialog/rd-block-dialog.component';
import { RdCreateDialogComponent } from '../../dialogs/rd-create-dialog/rd-create-dialog.component';
import type { CreateRdItemInput, RdItemEntity, RdListQuery, RdLogEntity } from '../../models/rd.model';
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
    NzPaginationModule,
    NzTagModule,
  ],
  providers: [RdStore],
  template: `
    <app-page-header title="研发项" [subtitle]="subtitle()" />

    <app-rd-filter-bar
      [query]="store.query()"
      [stages]="store.stages()"
      [members]="members()"
      [viewMode]="viewMode()"
      [canCreate]="projectContext.currentProjectIsActive()"
      (submit)="applyFilters($event)"
      (reset)="resetFilters()"
      (create)="createOpen.set(true)"
      (viewModeChange)="viewMode.set($event)"
    />
    @if (activeFilterTags().length > 0) {
      <div class="active-filters">
        <span class="active-filters__label">当前筛选</span>
        @for (tag of activeFilterTags(); track tag.kind + ':' + tag.value) {
          <nz-tag nzMode="closeable" [class]="filterTagClass(tag.kind)" (nzOnClose)="removeFilterTag(tag.kind, tag.value)">{{ tag.label }}</nz-tag>
        }
        <button type="button" class="active-filters__clear" (click)="resetFilters()">清空全部</button>
      </div>
    }

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
      [canBlock]="canBlockSelectedItem()"
      [canEditProgress]="canEditSelectedProgress()"
      [canEditBasic]="canEditSelectedBasic()"
      [canStart]="canStartSelectedItem()"
      [canResume]="canResumeSelectedItem()"
      [canComplete]="canCompleteSelectedItem()"
      [canAdvance]="canAdvanceSelectedItem()"
      [canDelete]="canDeleteSelectedItem()"
      (actionClick)="handleSelectedAction($event)"
      (progressChange)="updateSelectedProgress($event)"
      (basicSave)="saveSelectedBasic($event)"
      (deleteClick)="deleteSelectedItem()"
      (close)="closeDetail()"
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

    <app-rd-advance-stage-dialog
      [open]="advanceStageOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [stages]="store.stages()"
      (cancel)="advanceStageOpen.set(false)"
      (confirm)="confirmAdvanceStage($event.stageId)"
    />
  `,
  styles: [
    `
      .rd-pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
      .active-filters {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0 14px;
        flex-wrap: wrap;
      }
      .active-filters__label {
        color: var(--text-muted);
        font-size: 14px;
      }
      .active-filters__clear {
        border: 0;
        background: transparent;
        color: var(--primary-500);
        font-size: 13px;
        font-weight: 600;
        padding: 6px 8px;
        cursor: pointer;
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag {
        display: inline-flex;
        align-items: center;
        height: 30px;
        line-height: 30px;
        margin-inline-end: 0;
        border-radius: 999px;
        padding-inline: 12px;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
        color: var(--text-primary);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag .ant-tag-close-icon {
        margin-inline-start: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--status {
        background: rgba(37, 99, 235, 0.1);
        border-color: rgba(37, 99, 235, 0.35);
        color: rgb(30, 64, 175);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--priority {
        background: rgba(245, 158, 11, 0.14);
        border-color: rgba(245, 158, 11, 0.35);
        color: rgb(146, 64, 14);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--people {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.35);
        color: rgb(6, 95, 70);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--scope {
        background: rgba(99, 102, 241, 0.12);
        border-color: rgba(99, 102, 241, 0.35);
        color: rgb(67, 56, 202);
      }
      :host ::ng-deep .active-filters .ant-tag.filter-tag--keyword {
        background: rgba(236, 72, 153, 0.12);
        border-color: rgba(236, 72, 153, 0.35);
        color: rgb(157, 23, 77);
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly viewMode = signal<RdViewMode>('list');
  readonly createOpen = signal(false);
  readonly blockOpen = signal(false);
  readonly advanceStageOpen = signal(false);
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
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
  readonly canEditSelectedProgress = computed(() => this.rdPermission.canEditProgress(this.selectedItem(), this.currentUserId()));
  readonly canStartSelectedItem = computed(() => this.rdPermission.canStart(this.selectedItem(), this.currentUserId()));
  readonly canCompleteSelectedItem = computed(() => this.rdPermission.canComplete(this.selectedItem(), this.currentUserId()));
  readonly canEditSelectedBasic = computed(() =>
    this.rdPermission.canEditBasic(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canDeleteSelectedItem = computed(() =>
    this.rdPermission.canDelete(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canBlockSelectedItem = computed(() =>
    this.rdPermission.canBlock(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canResumeSelectedItem = computed(() =>
    this.rdPermission.canResume(this.selectedItem(), this.currentUserId(), this.members())
  );
  readonly canAdvanceSelectedItem = computed(() =>
    this.rdPermission.canAdvance(this.selectedItem(), this.currentUserId(), this.members())
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
        return;
      }
      void selectedUpdatedAt;
      const subscription = this.rdApi.listLogs(selectedId).subscribe({
        next: (logs) => this.selectedLogs.set(logs),
        error: () => this.selectedLogs.set([]),
      });
      onCleanup(() => subscription.unsubscribe());
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
    this.advanceStageOpen.set(false);
  }

  handleAction(item: RdItemEntity, action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    this.openDetail(item);
    switch (action) {
      case 'start':
        if (!this.canStartSelectedItem()) {
          return;
        }
        this.store.start(item.id);
        break;
      case 'block':
        if (!this.canBlockSelectedItem()) {
          return;
        }
        this.blockingItem.set(item);
        this.blockOpen.set(true);
        break;
      case 'resume':
        if (!this.canResumeSelectedItem()) {
          return;
        }
        this.store.resume(item.id);
        break;
      case 'complete':
        if (!this.canCompleteSelectedItem()) {
          return;
        }
        this.store.complete(item.id);
        break;
      case 'advance':
        if (!this.canAdvanceSelectedItem()) {
          return;
        }
        this.advanceStageOpen.set(true);
        break;
    }
  }

  handleSelectedAction(action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.handleAction(current, action);
  }

  updateSelectedProgress(progress: number): void {
    if (!this.canEditSelectedProgress()) {
      return;
    }
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.update(current.id, { version: current.version, progress });
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
  }

  deleteSelectedItem(): void {
    if (!this.canDeleteSelectedItem()) {
      return;
    }
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.delete(current.id);
    this.closeDetail();
  }

  confirmBlock(blockerReason: string): void {
    const item = this.blockingItem();
    if (!item) {
      return;
    }
    this.store.block(item.id, { blockerReason });
    this.closeBlockDialog();
  }

  confirmAdvanceStage(stageId: string): void {
    const current = this.selectedItem();
    if (!current || !stageId.trim()) {
      return;
    }
    this.store.advanceStage(current.id, { stageId: stageId.trim() });
    this.advanceStageOpen.set(false);
  }

  closeBlockDialog(): void {
    this.blockOpen.set(false);
    this.blockingItem.set(null);
  }

  filterTagClass(kind: 'stageIds' | 'status' | 'priority' | 'assigneeIds' | 'keyword'): string {
    if (kind === 'status') return 'filter-tag filter-tag--status';
    if (kind === 'priority') return 'filter-tag filter-tag--priority';
    if (kind === 'assigneeIds') return 'filter-tag filter-tag--people';
    if (kind === 'stageIds') return 'filter-tag filter-tag--scope';
    return 'filter-tag filter-tag--keyword';
  }
}

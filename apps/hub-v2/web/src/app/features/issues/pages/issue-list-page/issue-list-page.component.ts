import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { catchError, finalize, forkJoin, from, map, mergeMap, of, toArray } from 'rxjs';

import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import type { ProjectMemberEntity, ProjectMetaItem, ProjectVersionItem } from '@features/projects/models/project.model';
import { ProjectApiService } from '@features/projects/services/project-api.service';
import { ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS } from '@shared/constants';
import { ActiveFilterTag, ActiveFiltersBarComponent, ListStateComponent, PageHeaderComponent } from '@shared/ui';
import { IssueDetailDrawerComponent } from '../../components/issue-detail-drawer/issue-detail-drawer.component';
import { IssueFilterBarComponent, type IssueListViewMode } from '../../components/issue-filter-bar/issue-filter-bar.component';
import { IssueListTableComponent } from '../../components/issue-list-table/issue-list-table.component';
import { IssueCreateDialogComponent } from '../../dialogs/issue-create-dialog/issue-create-dialog.component';
import type { IssueEntity, IssueListQuery } from '../../models/issue.model';
import { IssueApiService } from '../../services/issue-api.service';
import { IssueListStore } from '../../store/issue-list.store';

@Component({
  selector: 'app-issue-list-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ListStateComponent,
    NzButtonModule,
    IssueDetailDrawerComponent,
    IssueFilterBarComponent,
    IssueListTableComponent,
    IssueCreateDialogComponent,
    NzPaginationModule,
    ActiveFiltersBarComponent,
  ],
  providers: [IssueListStore],
  template: `
    <app-page-header title="测试跟踪" [subtitle]="subtitle()" />
    <app-issue-filter-bar
      [query]="store.query()"
      [members]="members()"
      [currentUserId]="currentUserId() || ''"
      [modules]="modules()"
      [versions]="versions()"
      [environments]="environments()"
      [viewMode]="viewMode()"
      [canCreate]="projectContext.currentProjectIsActive()"
      (submit)="onFilterSubmit($event)"
      (reset)="resetFilters()"
      (create)="createOpen.set(true)"
      (viewModeChange)="viewMode.set($event)"
    />
    <!-- <div class="issue-batch-actions">
      <div class="issue-batch-actions__summary">
        已选择 <strong>{{ selectedIssueIds().length }}</strong> 项
      </div>
      <button
        nz-button
        nzType="primary"
        [disabled]="selectedIssueIds().length === 0 || batchResolving()"
        [nzLoading]="batchResolving()"
        (click)="batchResolveSelected()"
      >
        批量标记已解决
      </button>
      <button nz-button [disabled]="selectedIssueIds().length === 0 || batchResolving()" (click)="clearSelection()">
        取消选择
      </button>
    </div> -->
    <app-active-filters-bar [tags]="activeFilterBarTags()" (remove)="onActiveFilterRemove($event)" (clear)="resetFilters()" />
    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载测试跟踪列表…"
      emptyTitle="当前筛选条件下没有测试跟踪"
    >
      <app-issue-list-table
        [items]="store.items()"
        [viewMode]="viewMode()"
        [activeIssueId]="selectedIssueId()"
        [selectedIds]="selectedIssueIds()"
        [page]="store.page()"
        [pageSize]="store.pageSize()"
        (open)="openDetail($event)"
        (selectionChange)="onSelectionChange($event)"
      />

      @if (store.total() > 0) {
        <div class="issue-pagination">
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

    <app-issue-create-dialog
      [open]="createOpen()"
      [busy]="store.loading()"
      [members]="members()"
      [modules]="modules()"
      [environments]="environments()"
      [versions]="versions()"
      [projectName]="projectContext.currentProject()?.name || ''"
      [projectId]="projectContext.currentProject()?.id || ''"
      (cancel)="createOpen.set(false)"
      (create)="createIssue($event)"
    />

    <app-issue-detail-drawer
      [open]="!!selectedIssueId()"
      [issueId]="selectedIssueId()"
      [issue]="selectedIssue()"
      (close)="closeDetail()"
      (changed)="onDrawerChanged($event)"
    />
  `,
  styles: [
    `
      .issue-pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
      .issue-batch-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0 8px;
      }
      .issue-batch-actions__summary {
        font-size: 13px;
        color: var(--text-muted);
        margin-right: 4px;
      }
      .issue-batch-actions__summary strong {
        color: var(--text-primary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueListPageComponent {
  readonly store = inject(IssueListStore);
  readonly authStore = inject(AuthStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly issueApi = inject(IssueApiService);
  private readonly message = inject(NzMessageService);
  readonly projectContext = inject(ProjectContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly modules = signal<ProjectMetaItem[]>([]);
  readonly environments = signal<ProjectMetaItem[]>([]);
  readonly versions = signal<ProjectVersionItem[]>([]);
  readonly createOpen = signal(false);
  readonly viewMode = signal<IssueListViewMode>('list');
  readonly selectedIssueIds = signal<string[]>([]);
  readonly batchResolving = signal(false);
  readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });
  readonly actionQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('action'))), {
    initialValue: this.route.snapshot.queryParamMap.get('action'),
  });
  readonly selectedIssueId = computed(() => this.detailQuery());
  readonly selectedIssue = computed<IssueEntity | null>(() => {
    const issueId = this.selectedIssueId();
    if (!issueId) {
      return null;
    }
    return this.store.items().find((item) => item.id === issueId) ?? null;
  });
  readonly subtitle = computed(() => {
    const project = this.projectContext.currentProject();
    const projectStausText = project?.status === 'inactive' ? '(已归档)' : '';
    const projectName = project?.name ?? '当前项目';
    const total = this.store.result()?.total ?? 0;

    return `${projectName} ${projectStausText} · 共 ${total} 个问题`;
  });
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
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
    const tags: Array<{
      kind:
      | 'status'
      | 'type'
      | 'priority'
      | 'reporterIds'
      | 'assigneeIds'
      | 'moduleCodes'
      | 'versionCodes'
      | 'environmentCodes'
      | 'includeAssigneeParticipants'
      | 'sortBy'
      | 'sortOrder'
      | 'keyword';
      value: string;
      label: string;
    }> = [];
    if (query.status.length > 0) {
      for (const status of query.status) {
        tags.push({
          kind: 'status',
          value: status,
          label: withPrefix('status', '状态', ISSUE_STATUS_LABELS[status] || status),
        });
      }
    }
    if (query.types.length > 0) {
      for (const type of query.types) {
        tags.push({
          kind: 'type',
          value: type,
          label: withPrefix('type', '类型', ISSUE_TYPE_LABELS[type] || type),
        });
      }
    }
    if (query.priority.length > 0) {
      for (const priority of query.priority) {
        tags.push({
          kind: 'priority',
          value: priority,
          label: withPrefix('priority', '优先级', ISSUE_PRIORITY_LABELS[priority] || priority),
        });
      }
    }
    if (query.reporterIds.length > 0) {
      for (const reporterId of query.reporterIds) {
        const name = this.members().find((item) => item.userId === reporterId)?.displayName || reporterId;
        tags.push({
          kind: 'reporterIds',
          value: reporterId,
          label: withPrefix('reporterIds', '提报人', name),
        });
      }
    }
    if (query.assigneeIds.length > 0) {
      for (const assigneeId of query.assigneeIds) {
        const name =
          assigneeId === '__unassigned__'
            ? '未指派'
            : this.members().find((item) => item.userId === assigneeId)?.displayName || assigneeId;
        tags.push({
          kind: 'assigneeIds',
          value: assigneeId,
          label: withPrefix('assigneeIds', '负责人/协作人', name),
        });
      }
    }
    if (query.moduleCodes.length > 0) {
      for (const code of query.moduleCodes) {
        const name = this.modules().find((item) => (item.code || item.name) === code)?.name || code;
        tags.push({ kind: 'moduleCodes', value: code, label: withPrefix('moduleCodes', '模块', name) });
      }
    }
    if (query.versionCodes.length > 0) {
      for (const code of query.versionCodes) {
        const name = this.versions().find((item) => (item.code || item.version) === code)?.version || code;
        tags.push({ kind: 'versionCodes', value: code, label: withPrefix('versionCodes', '版本', name) });
      }
    }
    if (query.environmentCodes.length > 0) {
      for (const code of query.environmentCodes) {
        const name = this.environments().find((item) => (item.code || item.name) === code)?.name || code;
        tags.push({ kind: 'environmentCodes', value: code, label: withPrefix('environmentCodes', '环境', name) });
      }
    }
    if (query.keyword?.trim()) {
      tags.push({
        kind: 'keyword',
        value: query.keyword.trim(),
        label: withPrefix('keyword', '关键词', query.keyword.trim()),
      });
    }
    if (!query.includeAssigneeParticipants) {
      tags.push({
        kind: 'includeAssigneeParticipants',
        value: 'false',
        label: withPrefix('includeAssigneeParticipants', '负责人筛选', '不含协作人'),
      });
    }
    if (query.sortBy !== 'createdAt') {
      tags.push({
        kind: 'sortBy',
        value: query.sortBy,
        label: withPrefix('sortBy', '排序字段', '更新时间'),
      });
    }
    if (query.sortOrder !== 'desc') {
      tags.push({
        kind: 'sortOrder',
        value: query.sortOrder,
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
    const navigation = this.router.getCurrentNavigation();
    const quickCreateState = (navigation?.extras?.state as { quickCreate?: string } | undefined)?.quickCreate;
    if (quickCreateState === 'issue') {
      queueMicrotask(() => this.createOpen.set(true));
    }

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
        this.modules.set([]);
        this.environments.set([]);
        this.versions.set([]);
        return;
      }

      const subscription = forkJoin({
        members: this.projectApi.listMembers(projectId),
        modules: this.projectApi.listModules(projectId),
        environments: this.projectApi.listEnvironments(projectId),
        versions: this.projectApi.listVersions(projectId),
      }).subscribe({
        next: ({ members, modules, environments, versions }) => {
          this.members.set(members);
          this.modules.set(modules.filter((item) => item.enabled).sort((a, b) => a.sort - b.sort));
          this.environments.set(environments.filter((item) => item.enabled).sort((a, b) => a.sort - b.sort));
          this.versions.set(versions.filter((item) => item.enabled).sort((a, b) => a.sort - b.sort));
        },
        error: () => {
          this.members.set([]);
          this.modules.set([]);
          this.environments.set([]);
          this.versions.set([]);
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const visible = new Set(this.store.items().map((item) => item.id));
      this.selectedIssueIds.update((ids) => ids.filter((id) => visible.has(id)));
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
  }

  createIssue(input: Parameters<IssueListStore['create']>[0]): void {
    this.store.create(input);
    this.createOpen.set(false);
  }

  onFilterSubmit(query: IssueListQuery): void {
    this.selectedIssueIds.set([]);
    this.store.updateQuery({ ...query, page: 1 });
  }

  resetFilters(): void {
    this.store.updateQuery({
      page: 1,
      keyword: '',
      status: [],
      types: [],
      priority: [],
      reporterIds: [],
      assigneeIds: [],
      moduleCodes: [],
      versionCodes: [],
      environmentCodes: [],
      includeAssigneeParticipants: true,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    this.selectedIssueIds.set([]);
  }

  removeFilterTag(
    kind:
      | 'status'
      | 'type'
      | 'priority'
      | 'reporterIds'
      | 'assigneeIds'
      | 'moduleCodes'
      | 'versionCodes'
      | 'environmentCodes'
      | 'includeAssigneeParticipants'
      | 'sortBy'
      | 'sortOrder'
      | 'keyword',
    value: string
  ): void {
    const current = this.store.query();
    if (kind === 'status') {
      this.store.updateQuery({
        page: 1,
        status: current.status.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'type') {
      this.store.updateQuery({
        page: 1,
        types: current.types.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'priority') {
      this.store.updateQuery({
        page: 1,
        priority: current.priority.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'reporterIds') {
      this.store.updateQuery({
        page: 1,
        reporterIds: current.reporterIds.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'assigneeIds') {
      this.store.updateQuery({
        page: 1,
        assigneeIds: current.assigneeIds.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'moduleCodes') {
      this.store.updateQuery({
        page: 1,
        moduleCodes: current.moduleCodes.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'versionCodes') {
      this.store.updateQuery({
        page: 1,
        versionCodes: current.versionCodes.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'environmentCodes') {
      this.store.updateQuery({
        page: 1,
        environmentCodes: current.environmentCodes.filter((item) => item !== value),
      });
      return;
    }
    if (kind === 'includeAssigneeParticipants') {
      this.store.updateQuery({
        page: 1,
        includeAssigneeParticipants: true,
      });
      return;
    }
    if (kind === 'sortBy') {
      this.store.updateQuery({
        page: 1,
        sortBy: 'createdAt',
      });
      return;
    }
    if (kind === 'sortOrder') {
      this.store.updateQuery({
        page: 1,
        sortOrder: 'desc',
      });
      return;
    }
    this.store.updateQuery({
      page: 1,
      keyword: '',
    });
  }

  onActiveFilterRemove(event: { kind: string; value: string }): void {
    this.removeFilterTag(
      event.kind as
        | 'status'
        | 'type'
        | 'priority'
        | 'reporterIds'
        | 'assigneeIds'
        | 'moduleCodes'
        | 'versionCodes'
        | 'environmentCodes'
        | 'includeAssigneeParticipants'
        | 'sortBy'
        | 'sortOrder'
        | 'keyword',
      event.value
    );
  }

  onPageIndexChange(page: number): void {
    this.selectedIssueIds.set([]);
    this.store.updateQuery({ page });
  }

  onPageSizeChange(pageSize: number): void {
    const nextPageSize = Number(pageSize) || this.store.pageSize();
    if (nextPageSize === this.store.pageSize()) {
      return;
    }
    this.selectedIssueIds.set([]);
    this.store.updateQuery({ page: 1, pageSize: nextPageSize });
  }

  onSelectionChange(ids: string[]): void {
    this.selectedIssueIds.set(ids);
  }

  clearSelection(): void {
    this.selectedIssueIds.set([]);
  }

  batchResolveSelected(): void {
    const selectedIds = this.selectedIssueIds();
    if (selectedIds.length === 0 || this.batchResolving()) {
      return;
    }

    const itemsById = new Map(this.store.items().map((item) => [item.id, item] as const));
    const resolvableStatuses = new Set<IssueEntity['status']>(['in_progress', 'pending_update', 'reopened']);
    const eligibleIds = selectedIds.filter((id) => {
      const item = itemsById.get(id);
      return !!item && resolvableStatuses.has(item.status);
    });
    const skippedCount = selectedIds.length - eligibleIds.length;
    if (eligibleIds.length === 0) {
      this.message.warning('当前选中项不可执行“标记已解决”（仅支持处理中/待提测/已重开）');
      return;
    }

    this.batchResolving.set(true);
    from(eligibleIds)
      .pipe(
        mergeMap(
          (issueId) =>
            this.issueApi.resolve(issueId).pipe(
              map(() => ({ issueId, success: true as const })),
              catchError(() => of({ issueId, success: false as const }))
            ),
          6
        ),
        toArray(),
        finalize(() => this.batchResolving.set(false))
      )
      .subscribe((results) => {
        const successCount = results.filter((item) => item.success).length;
        const failedCount = results.length - successCount;
        this.selectedIssueIds.set([]);
        this.store.refresh();

        if (failedCount === 0 && skippedCount === 0) {
          this.message.success(`已批量标记 ${successCount} 条为已解决`);
          return;
        }

        this.message.warning(`批量操作完成：成功 ${successCount}，失败 ${failedCount}，跳过 ${skippedCount}`);
      });
  }

  openDetail(issueId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: issueId },
      queryParamsHandling: 'merge',
    });
  }

  closeDetail(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: null },
      queryParamsHandling: 'merge',
    });
  }

  onDrawerChanged(issue: IssueEntity): void {
    this.store.patchOrRefresh(issue);
  }

  filterTagClass(
    kind:
      | 'status'
      | 'type'
      | 'priority'
      | 'reporterIds'
      | 'assigneeIds'
      | 'moduleCodes'
      | 'versionCodes'
      | 'environmentCodes'
      | 'includeAssigneeParticipants'
      | 'sortBy'
      | 'sortOrder'
      | 'keyword'
  ): string {
    if (kind === 'status') return 'filter-tag filter-tag--status';
    if (kind === 'type') return 'filter-tag filter-tag--scope';
    if (kind === 'priority') return 'filter-tag filter-tag--priority';
    if (kind === 'reporterIds' || kind === 'assigneeIds') return 'filter-tag filter-tag--people';
    if (kind === 'moduleCodes' || kind === 'versionCodes' || kind === 'environmentCodes') return 'filter-tag filter-tag--scope';
    if (kind === 'sortBy' || kind === 'sortOrder' || kind === 'includeAssigneeParticipants') return 'filter-tag filter-tag--sort';
    return 'filter-tag filter-tag--keyword';
  }
}

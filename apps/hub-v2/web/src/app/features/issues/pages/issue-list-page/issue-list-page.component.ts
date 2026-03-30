import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { forkJoin, map } from 'rxjs';

import { ProjectContextStore } from '@core/state';
import type { ProjectMemberEntity, ProjectMetaItem, ProjectVersionItem } from '@features/projects/models/project.model';
import { ProjectApiService } from '@features/projects/services/project-api.service';
import { ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS } from '@shared/constants';
import { ListStateComponent, PageHeaderComponent } from '@shared/ui';
import { IssueDetailDrawerComponent } from '../../components/issue-detail-drawer/issue-detail-drawer.component';
import { IssueFilterBarComponent, type IssueListViewMode } from '../../components/issue-filter-bar/issue-filter-bar.component';
import { IssueListTableComponent } from '../../components/issue-list-table/issue-list-table.component';
import { IssueCreateDialogComponent } from '../../dialogs/issue-create-dialog/issue-create-dialog.component';
import type { IssueEntity, IssueListQuery } from '../../models/issue.model';
import { IssueListStore } from '../../store/issue-list.store';

@Component({
  selector: 'app-issue-list-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ListStateComponent,
    IssueDetailDrawerComponent,
    IssueFilterBarComponent,
    IssueListTableComponent,
    IssueCreateDialogComponent,
    NzPaginationModule,
    NzTagModule,
  ],
  providers: [IssueListStore],
  template: `
    <app-page-header title="测试跟踪" [subtitle]="subtitle()" />
    <app-issue-filter-bar
      [query]="store.query()"
      [members]="members()"
      [modules]="modules()"
      [versions]="versions()"
      [environments]="environments()"
      [viewMode]="viewMode()"
      (submit)="onFilterSubmit($event)"
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
        [page]="store.page()"
        [pageSize]="store.pageSize()"
        (open)="openDetail($event)"
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
      :host ::ng-deep .active-filters .ant-tag.filter-tag--sort {
        background: rgba(100, 116, 139, 0.14);
        border-color: rgba(100, 116, 139, 0.35);
        color: rgb(51, 65, 85);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueListPageComponent {
  readonly store = inject(IssueListStore);
  private readonly projectApi = inject(ProjectApiService);
  readonly projectContext = inject(ProjectContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly modules = signal<ProjectMetaItem[]>([]);
  readonly environments = signal<ProjectMetaItem[]>([]);
  readonly versions = signal<ProjectVersionItem[]>([]);
  readonly createOpen = signal(false);
  readonly viewMode = signal<IssueListViewMode>('list');
  readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
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
    const projectName = this.projectContext.currentProject()?.name ?? '当前项目';
    const total = this.store.result()?.total ?? 0;
    return `${projectName} · 共 ${total} 个问题`;
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
    const tags: Array<{
      kind:
        | 'status'
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
    if (query.sortBy !== 'updatedAt') {
      tags.push({
        kind: 'sortBy',
        value: query.sortBy,
        label: withPrefix('sortBy', '排序字段', query.sortBy === 'createdAt' ? '创建时间' : '更新时间'),
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
  }

  createIssue(input: Parameters<IssueListStore['create']>[0]): void {
    this.store.create(input);
    this.createOpen.set(false);
  }

  onFilterSubmit(query: IssueListQuery): void {
    this.store.updateQuery({ ...query, page: 1 });
  }

  resetFilters(): void {
    this.store.updateQuery({
      page: 1,
      keyword: '',
      status: [],
      priority: [],
      reporterIds: [],
      assigneeIds: [],
      moduleCodes: [],
      versionCodes: [],
      environmentCodes: [],
      includeAssigneeParticipants: true,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  }

  removeFilterTag(
    kind:
      | 'status'
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
        sortBy: 'updatedAt',
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
    if (kind === 'priority') return 'filter-tag filter-tag--priority';
    if (kind === 'reporterIds' || kind === 'assigneeIds') return 'filter-tag filter-tag--people';
    if (kind === 'moduleCodes' || kind === 'versionCodes' || kind === 'environmentCodes') return 'filter-tag filter-tag--scope';
    if (kind === 'sortBy' || kind === 'sortOrder' || kind === 'includeAssigneeParticipants') return 'filter-tag filter-tag--sort';
    return 'filter-tag filter-tag--keyword';
  }
}

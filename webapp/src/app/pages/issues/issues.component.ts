import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectContextStore } from '@app/core/stores/project-context/project-context.store';
import { PageLayoutComponent } from '@app/shared';
import { PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import { ISSUE_STATUS_FILTER_OPTIONS } from '@app/shared/constants/status-options';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { IssueDetailComponent } from './issue-detail/issue-detail.component';
import { IssuesListTableComponent } from './issues-list-table/issues-list-table.component';
import { IssueEntity, IssueListQuery, IssuePriority, IssueStatus } from './models/issue.model';
import { IssueDetailStore } from './store/issue-detail.store';
import { IssueListStore } from './store/issue-list.store';
import { IssueFilterBarComponent } from './issue-filter-bar/issue-filter-bar.component';

type viewType = 'list' | 'board';

@Component({
  selector: 'app-issues',
  imports: [
    PageLayoutComponent,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzRadioModule,
    NzIconModule,
    NzPaginationModule,
    NzModalModule,
    IssuesListTableComponent,
    IssueFilterBarComponent,
    IssueDetailComponent,
  ],
  templateUrl: './issues.component.html',
  styleUrl: './issues.component.less',
  providers: [IssueListStore, IssueDetailStore],
})
export class IssuesComponent {
  private readonly issueListStore = inject(IssueListStore);
  private readonly issueDetailStore = inject(IssueDetailStore);
  private readonly projectContextStore = inject(ProjectContextStore);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly modal = inject(NzModalService);
  statusOptions = ISSUE_STATUS_FILTER_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;

  // 视图模式
  protected readonly viewType = signal<viewType>('list');

  protected readonly loading = this.issueListStore.loading;
  protected readonly issues = this.issueListStore.items;
  protected readonly total = this.issueListStore.total;
  protected readonly query = this.issueListStore.query;

  // 详情相关
  protected readonly selectedIssue = this.issueDetailStore.issue;
  protected readonly currentProjectId = this.projectContextStore.currentProjectId;

  // 详情操作相关
  protected readonly issueDetailLoading = this.issueDetailStore.loading;

  protected readonly open = signal(false);

  protected readonly currentPriority = signal<IssueStatus | ''>('');

  constructor() {
    const projectId = this.projectContextStore.currentProjectId();
    this.issueListStore.initialize();
    projectId && this.projectContextStore.loadProjectMembers(projectId);

    this.route.queryParamMap.subscribe((params) => {
      const detailId = params.get('detail');
      if (!detailId) return;
      if (this.selectedIssue()?.id === detailId || this.issueDetailLoading()) return;
      if (detailId && !this.selectedIssue()) {
        this.issueDetailStore.load(detailId);
        this.open.set(true);
      }
    });

    // 筛选变化时
    let queryTimer: ReturnType<typeof setTimeout>;
    let prevQuery: IssueListQuery | null = this.issueListStore.query();
    effect(() => {
      const query = this.issueListStore.query();
      const isPaginationChange =
        prevQuery && (prevQuery.page !== query.page || prevQuery.pageSize !== query.pageSize);
      const isFilterChange =
        !prevQuery ||
        prevQuery.keyword !== query.keyword ||
        prevQuery.status !== query.status ||
        prevQuery.priority !== query.priority ||
        prevQuery.projectId !== query.projectId;

      prevQuery = { ...query };
      // 如果是变更页码或页大小，则立即加载
      if (isPaginationChange) {
        clearTimeout(queryTimer);
        this.issueListStore.load();
        return;
      }

      if (isFilterChange) {
        clearTimeout(queryTimer);
        queryTimer = setTimeout(() => {
          this.issueListStore.load();
        }, 500);
      }
    });
  }

  onPageChange(page: number) {
    this.issueListStore.updateQuery({ page });
  }

  onPageSizeChange(size: number) {
    this.issueListStore.updateQuery({ pageSize: size });
  }

  selectIssue(issue: IssueEntity) {
    this.openDetail(issue);
    this.issueDetailStore.load(issue.id);
    this.open.set(true);
  }

  closeIssueDetail() {
    this.open.set(false);
    this.issueDetailStore.setSelectedIssue(null);
    this.router.navigate([], {
      queryParams: {},
    });
  }

  openDetail(item: IssueEntity): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
    });
  }

  updateQuery(patch: Partial<IssueListQuery>) {
    this.issueListStore.updateQuery(patch);
  }
}

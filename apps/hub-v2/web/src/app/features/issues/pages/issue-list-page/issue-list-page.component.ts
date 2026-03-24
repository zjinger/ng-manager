import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import type { ProjectMemberEntity } from '../../../../features/projects/models/project.model';
import { ProjectApiService } from '../../../../features/projects/services/project-api.service';
import { ProjectContextStore } from '../../../../core/state/project-context.store';
import { PageHeaderComponent, ListStateComponent } from '@shared/ui';
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
  ],
  providers: [IssueListStore],
  template: `
    <app-page-header title="Issues" [subtitle]="subtitle()" />
    <app-issue-filter-bar
      [query]="store.query()"
      [viewMode]="viewMode()"
      (submit)="onFilterSubmit($event)"
      (create)="createOpen.set(true)"
      (viewModeChange)="viewMode.set($event)"
    />
    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载 Issue 列表…"
      emptyTitle="当前筛选条件下没有 Issue"
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
      (cancel)="createOpen.set(false)"
      (create)="createIssue($event)"
    />

    <app-issue-detail-drawer
      [open]="!!selectedIssueId()"
      [issueId]="selectedIssueId()"
      [issue]="selectedIssue()"
      (close)="closeDetail()"
    />
  `,
  styles: [
    `
      .issue-pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueListPageComponent {
  readonly store = inject(IssueListStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly members = signal<ProjectMemberEntity[]>([]);
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
  private lastProjectId: string | null | undefined = undefined;

  constructor() {
    effect((onCleanup) => {
      const projectId = this.projectContext.currentProjectId();
      const projectChanged = this.lastProjectId !== undefined && this.lastProjectId !== projectId;
      this.lastProjectId = projectId;
      this.store.refreshForProject(projectId);
      if (projectChanged) {
        this.closeDetail();
      }
      if (!projectId) {
        this.members.set([]);
        return;
      }

      const subscription = this.projectApi.listMembers(projectId).subscribe({
        next: (members) => this.members.set(members),
        error: () => this.members.set([]),
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
}

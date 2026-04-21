import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { finalize } from 'rxjs';

import { ProjectContextStore } from '@core/state';
import { ActiveFilterTag, ActiveFiltersBarComponent, FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, StatusBadgeComponent } from '@shared/ui';
import { IssueApiService } from '@features/issues/services/issue-api.service';
import { DashboardReportedIssueItem } from '../../models/dashboard.model';
import { DashboardApiService } from '../../services/dashboard-api.service';

@Component({
  selector: 'app-dashboard-reported-issues-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzPaginationModule,
    NzSelectModule,
    NzPopconfirmModule,
    PageToolbarComponent,
    FilterBarComponent,
    ActiveFiltersBarComponent,
    PageHeaderComponent,
    ListStateComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="我提报未解决" subtitle="跨项目查看我提报且未解决的测试单。" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="toolbar__main">
        <nz-select
          nzPlaceHolder="全部项目"
          class="toolbar-select"
          [ngModel]="draftProjectIdFilter()"
          (ngModelChange)="onProjectChange($event)"
        >
          <nz-option nzLabel="全部项目" nzValue=""></nz-option>
          @for (project of projects(); track project.id) {
            <nz-option [nzLabel]="project.name" [nzValue]="project.id"></nz-option>
          }
        </nz-select>
        <button nz-button class="toolbar-filter-btn" (click)="applyFilters()">筛选</button>
        <button nz-button class="toolbar-filter-btn" (click)="resetFilters()">清空</button>
      </app-filter-bar>

      <div toolbar-actions class="toolbar__total">共 {{ total() }} 条</div>
    </app-page-toolbar>

    <app-active-filters-bar [tags]="activeFilterBarTags()" (remove)="onActiveFilterRemove($event)" (clear)="resetFilters()" />

    <app-list-state
      [loading]="loading()"
      [empty]="!loading() && items().length === 0"
      loadingText="正在加载我提报未解决项…"
      emptyTitle="当前没有我提报未解决项"
    >
      <div class="issue-list">
        @for (item of items(); track item.entityId + ':' + item.updatedAt) {
          <a class="issue-row" [routerLink]="['/issues', item.entityId]">
            <div class="issue-row__main">
              <div class="issue-row__title">
                <span class="issue-row__code">{{ item.code }}</span>
                <span>{{ item.title }}</span>
              </div>
              <div class="issue-row__meta">
                <app-status-badge [status]="item.status" />
                <span>{{ projectLabel(item.projectId) }}</span>
                <span>{{ assigneeLabel(item.assigneeName) }}</span>
                <span>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
                @if (canUrge(item)) {
                  <button
                    type="button"
                    class="issue-row__urge-btn"
                    [disabled]="urgingState()[item.entityId] === true"
                    nz-popconfirm
                    nzPopconfirmTitle="确认置顶提醒该测试单吗？"
                    nzPopconfirmOkText="确认"
                    nzPopconfirmCancelText="取消"
                    (nzOnConfirm)="urge(item.entityId)"
                    (click)="$event.preventDefault(); $event.stopPropagation()"
                  >
                    置顶提醒
                  </button>
                }
              </div>
            </div>
          </a>
        }
      </div>

      @if (total() > 0) {
        <div class="pagination">
          <nz-pagination
            [nzTotal]="total()"
            [nzPageIndex]="page()"
            [nzPageSize]="pageSize()"
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
  `,
  styles: [
    `
      .toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar-select {
        width: 220px;
      }
      .toolbar__total {
        color: var(--text-secondary);
        font-size: 13px;
      }
      .issue-list {
        border: 1px solid var(--border-color);
        border-radius: 14px;
        overflow: hidden;
        background: var(--bg-container);
      }
      .issue-row {
        display: block;
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        color: inherit;
        text-decoration: none;
        transition: var(--transition-base);
      }
      .issue-row:first-child {
        border-top: 0;
      }
      .issue-row:hover {
        background: var(--bg-subtle);
      }
      .issue-row__title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        color: var(--text-primary);
        font-weight: 600;
      }
      .issue-row__code {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary-600);
      }
      .issue-row__meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
        color: var(--text-disabled);
        font-size: 12px;
      }
      .issue-row__urge-btn {
        border: 1px solid var(--primary-500);
        color: var(--primary-600);
        background: transparent;
        border-radius: 999px;
        padding: 0 10px;
        height: 24px;
        line-height: 22px;
        cursor: pointer;
      }
      .issue-row__urge-btn:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.08);
      }
      .issue-row__urge-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardReportedIssuesPageComponent {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly issueApi = inject(IssueApiService);
  private readonly message = inject(NzMessageService);

  readonly loading = signal(false);
  readonly items = signal<DashboardReportedIssueItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly urgingState = signal<Record<string, boolean>>({});
  readonly projectNameById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const project of this.projectContext.projects()) {
      map[project.id] = project.name;
    }
    return map;
  });
  readonly projects = this.projectContext.projects;
  readonly projectIdFilter = signal('');
  readonly draftProjectIdFilter = signal('');
  readonly activeFilterBarTags = computed<ActiveFilterTag[]>(() => {
    const projectId = this.projectIdFilter();
    if (!projectId) {
      return [];
    }
    return [
      {
        kind: 'project',
        value: projectId,
        label: `项目: ${this.projectLabel(projectId)}`,
        className: 'filter-tag--project',
      },
    ];
  });

  constructor() {
    this.draftProjectIdFilter.set(this.projectIdFilter());
    this.load();
  }

  onProjectChange(projectId: string): void {
    this.draftProjectIdFilter.set(projectId || '');
  }

  applyFilters(): void {
    this.projectIdFilter.set(this.draftProjectIdFilter());
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.draftProjectIdFilter.set('');
    this.projectIdFilter.set('');
    this.page.set(1);
    this.load();
  }

  onActiveFilterRemove(event: { kind: string; value: string }): void {
    if (event.kind === 'project') {
      this.resetFilters();
    }
  }

  onPageIndexChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize || 20);
    this.page.set(1);
    this.load();
  }

  projectLabel(projectId: string): string {
    return this.projectNameById()[projectId] || '未知项目';
  }

  assigneeLabel(assigneeName: string | null): string {
    return assigneeName?.trim() ? `负责人 ${assigneeName}` : '暂未指派负责人';
  }

  canUrge(item: DashboardReportedIssueItem): boolean {
    return !!item.assigneeName && ['open', 'in_progress', 'pending_update', 'reopened'].includes(item.status);
  }

  urge(issueId: string): void {
    if (this.urgingState()[issueId]) {
      return;
    }
    this.urgingState.update((current) => ({ ...current, [issueId]: true }));
    this.issueApi
      .urge(issueId)
      .pipe(
        finalize(() => {
          this.urgingState.update((current) => ({ ...current, [issueId]: false }));
        })
      )
      .subscribe({
        next: () => {
          this.message.success('已发送置顶提醒');
          this.load();
        },
        error: () => {},
      });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboardApi
      .getReportedIssuesPage({
        page: this.page(),
        pageSize: this.pageSize(),
        projectId: this.projectIdFilter() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }
}

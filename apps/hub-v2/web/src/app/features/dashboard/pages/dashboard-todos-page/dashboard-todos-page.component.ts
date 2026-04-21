import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ProjectContextStore } from '@core/state';
import { ActiveFilterTag, ActiveFiltersBarComponent, FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, StatusBadgeComponent } from '@shared/ui';
import { DashboardTodoItem, DashboardTodoItemKind } from '../../models/dashboard.model';
import { DashboardApiService } from '../../services/dashboard-api.service';

@Component({
  selector: 'app-dashboard-todos-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzPaginationModule,
    NzSelectModule,
    PageToolbarComponent,
    FilterBarComponent,
    ActiveFiltersBarComponent,
    PageHeaderComponent,
    ListStateComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="我的待办" subtitle="测试单与研发项的待处理、待验证事项。" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="todo-toolbar__main">
        <nz-select
          nzPlaceHolder="全部类型"
          class="toolbar-select"
          [ngModel]="draftKindFilter()"
          (ngModelChange)="onKindChange($event)"
        >
          <nz-option nzLabel="全部类型" nzValue=""></nz-option>
          <nz-option nzLabel="测试单负责人" nzValue="issue_assigned"></nz-option>
          <nz-option nzLabel="测试单协作" nzValue="issue_collaborating"></nz-option>
          <nz-option nzLabel="测试单待验证" nzValue="issue_verify"></nz-option>
          <nz-option nzLabel="研发项负责人" nzValue="rd_assigned"></nz-option>
          <nz-option nzLabel="研发项待验证" nzValue="rd_verify"></nz-option>
        </nz-select>
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

      <div toolbar-actions class="todo-toolbar__total">共 {{ total() }} 条</div>
    </app-page-toolbar>
    <app-active-filters-bar [tags]="activeFilterBarTags()" (remove)="onActiveFilterRemove($event)" (clear)="resetFilters()" />

    <app-list-state
      [loading]="loading()"
      [empty]="!loading() && items().length === 0"
      loadingText="正在加载我的待办…"
      emptyTitle="当前没有待办"
    >
      <div class="todo-list">
        @for (item of items(); track item.kind + ':' + item.entityId + ':' + item.updatedAt) {
          <a class="todo-row" [routerLink]="detailLink(item)">
            <div class="todo-row__main">
              <div class="todo-row__title">
                <span class="todo-row__tag" [attr.data-kind]="item.kind">{{ kindLabel(item.kind) }}</span>
                <span class="todo-row__role" [attr.data-kind]="item.kind">{{ roleLabel(item.kind) }}</span>
                <span>{{ item.title }}</span>
              </div>
              <div class="todo-row__meta">
                <span class="todo-row__code">{{ item.code }}</span>
                <app-status-badge [status]="item.status" />
                <span>{{ projectLabel(item.projectId) }}</span>
                <span>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
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
      .todo-toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar-select {
        width: 220px;
      }
      .todo-toolbar__total {
        color: var(--text-secondary);
        font-size: 13px;
      }
      .todo-list {
        border: 1px solid var(--border-color);
        border-radius: 14px;
        overflow: hidden;
        background: var(--bg-container);
      }
      .todo-row {
        display: block;
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        color: inherit;
        text-decoration: none;
        transition: var(--transition-base);
      }
      .todo-row:first-child {
        border-top: 0;
      }
      .todo-row:hover {
        background: var(--bg-subtle);
      }
      .todo-row__title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        color: var(--text-primary);
        font-weight: 600;
      }
      .todo-row__tag {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--color-info-light);
        color: var(--color-info);
        font-size: 11px;
        font-weight: 600;
      }
      .todo-row__tag[data-kind^='rd'] {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-500);
      }
      .todo-row__role {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        background: var(--bg-subtle);
        color: var(--text-secondary);
      }
      .todo-row__code {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary-600);
      }
      .todo-row__meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
        color: var(--text-disabled);
        font-size: 12px;
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
export class DashboardTodosPageComponent {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly projectContext = inject(ProjectContextStore);

  readonly loading = signal(false);
  readonly items = signal<DashboardTodoItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly kindFilter = signal<DashboardTodoItemKind | ''>('');
  readonly draftKindFilter = signal<DashboardTodoItemKind | ''>('');
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
  readonly activeFilterTags = computed<Array<{ kind: 'kind' | 'project'; value: string; label: string }>>(() => {
    const tags: Array<{ kind: 'kind' | 'project'; value: string; label: string }> = [];
    const kind = this.kindFilter();
    const projectId = this.projectIdFilter();
    if (kind) {
      tags.push({ kind: 'kind', value: kind, label: `类型: ${this.kindOptionLabel(kind)}` });
    }
    if (projectId) {
      tags.push({ kind: 'project', value: projectId, label: `项目: ${this.projectLabel(projectId)}` });
    }
    return tags;
  });
  readonly activeFilterBarTags = computed<ActiveFilterTag[]>(() =>
    this.activeFilterTags().map((tag) => ({
      ...tag,
      className: this.filterTagClass(tag.kind).replace('filter-tag ', ''),
    }))
  );

  constructor() {
    this.draftKindFilter.set(this.kindFilter());
    this.draftProjectIdFilter.set(this.projectIdFilter());
    this.load();
  }

  onKindChange(kind: DashboardTodoItemKind | ''): void {
    this.draftKindFilter.set(kind);
  }

  onProjectChange(projectId: string): void {
    this.draftProjectIdFilter.set(projectId || '');
  }

  applyFilters(): void {
    this.kindFilter.set(this.draftKindFilter());
    this.projectIdFilter.set(this.draftProjectIdFilter());
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.draftKindFilter.set('');
    this.draftProjectIdFilter.set('');
    this.kindFilter.set('');
    this.projectIdFilter.set('');
    this.page.set(1);
    this.load();
  }

  removeFilterTag(kind: 'kind' | 'project'): void {
    if (kind === 'kind') {
      this.draftKindFilter.set('');
      this.kindFilter.set('');
    } else if (kind === 'project') {
      this.draftProjectIdFilter.set('');
      this.projectIdFilter.set('');
    }
    this.page.set(1);
    this.load();
  }

  onActiveFilterRemove(event: { kind: string; value: string }): void {
    this.removeFilterTag(event.kind as 'kind' | 'project');
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

  detailLink(item: DashboardTodoItem): string[] {
    return item.kind.startsWith('rd') ? ['/rd', item.entityId] : ['/issues', item.entityId];
  }

  kindLabel(kind: DashboardTodoItemKind): string {
    return kind.startsWith('rd') ? '研发项' : '测试单';
  }

  roleLabel(kind: DashboardTodoItemKind): string {
    if (kind === 'issue_collaborating') {
      return '协作中';
    }
    if (kind === 'issue_verify' || kind === 'rd_verify') {
      return '待验证';
    }
    return '负责人';
  }

  projectLabel(projectId: string): string {
    return this.projectNameById()[projectId] || '未知项目';
  }

  filterTagClass(kind: 'kind' | 'project'): string {
    return kind === 'kind' ? 'filter-tag filter-tag--kind' : 'filter-tag filter-tag--project';
  }

  private kindOptionLabel(kind: DashboardTodoItemKind): string {
    const map: Record<DashboardTodoItemKind, string> = {
      issue_assigned: '测试单负责人',
      issue_collaborating: '测试单协作',
      issue_verify: '测试单待验证',
      rd_assigned: '研发项负责人',
      rd_verify: '研发项待验证',
    };
    return map[kind] || kind;
  }

  private load(): void {
    this.loading.set(true);
    this.dashboardApi
      .getTodosPage({
        page: this.page(),
        pageSize: this.pageSize(),
        kind: this.kindFilter() || undefined,
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

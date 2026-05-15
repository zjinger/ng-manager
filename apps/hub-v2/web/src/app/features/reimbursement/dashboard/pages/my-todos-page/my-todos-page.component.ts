import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ProjectContextStore } from '@core/state';
import {
  ListStateComponent,
  PageHeaderComponent,
  PageToolbarComponent,
} from '@app/shared/ui';

export interface TodoItem {
  id: string;
  code: string;
  kind: 'rd_verify' | 'issue_verify' | 'issue_assigned' | 'rd_assigned' | 'issue_collaborating';
  title: string;
  applicant: string;
  amount: number;
  waitingHours: number;
  entityId: string;
  projectId?: string;
  highAmount?: boolean;
}

@Component({
  selector: 'app-my-todos-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzPaginationModule,
    NzSelectModule,
    NzIconModule,
    PageToolbarComponent,
    PageHeaderComponent,
    ListStateComponent,
  ],
  template: `
    <app-page-header title="我的待办" subtitle="报销审批、财务处理等待办事项。" />

    <app-page-toolbar>
      <div toolbar-filters class="todo-toolbar__main">
        <nz-select
          nzPlaceHolder="全部类型"
          class="toolbar-select"
          [ngModel]="draftKindFilter()"
          (ngModelChange)="onKindChange($event)"
        >
          <nz-option nzLabel="全部类型" nzValue=""></nz-option>
          <nz-option nzLabel="待审批" nzValue="assigned"></nz-option>
          <nz-option nzLabel="待部门主管审批" nzValue="collaborating"></nz-option>
          <nz-option nzLabel="待会计处理" nzValue="verify"></nz-option>
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
      </div>

      <div toolbar-actions class="todo-toolbar__total">共 {{ total() }} 条</div>
    </app-page-toolbar>

    <app-list-state
      [loading]="loading()"
      [empty]="!loading() && items().length === 0"
      loadingText="正在加载我的待办…"
      emptyTitle="当前没有待办"
    >
      <div class="todos__list">
        @for (item of items(); track item.id) {
        <div class="todo__item" [routerLink]="detailLink(item)">
          <div class="todo__header">
            <div class="todo__info">
              <span class="todo__code">{{ item.code }}</span>
              <span class="todo__tag" [attr.data-kind]="item.kind">
                {{ kindLabel(item) }}
              </span>
              @if (shouldShowHighAmountTag(item)) {
              <span class="todo__role" data-kind="high_amount">高金额</span>
              }
            </div>
            <nz-icon class="todo__icon" nzType="right" nzTheme="outline" />
          </div>

          <span class="todo__title">{{ item.title }}</span>

          <div class="todo__meta">
            @if (projectNameById()[item.projectId || '']) {
            <span class="todo__project">{{ projectNameById()[item.projectId!] }}</span>
            }
            <span>申请人: {{ item.applicant }}</span>
            <span [class.todo__amount--high]="item.amount >= 5000">
              金额: ¥{{ item.amount | number : '1.2-2' }}
            </span>
            <span>等待 {{ formatWaitingTime(item.waitingHours) }}</span>
          </div>
        </div>
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

      .todos__list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 0;
      }

      .todo__item {
        border: 1px solid var(--border-color-soft, #e2e8f0);
        border-radius: 0.75rem;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-container);
      }

      .todo__item:hover {
        background: var(--bg-subtle, #f8fafc);
        border-color: #a5b4fc;
        transform: translateX(2px);
      }

      .todo__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .todo__info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .todo__code {
        font-size: 17px;
        font-weight: 700;
        color: var(--primary-600, #4f46e5);
      }

      .todo__tag {
        display: inline-flex;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        flex: 0 0 auto;
      }

      .todo__tag[data-kind^='rd_verify'],
      .todo__tag[data-kind^='issue_verify'] {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }

      .todo__tag[data-kind^='rd_assigned'],
      .todo__tag[data-kind^='issue_assigned'] {
        background: rgba(6, 182, 212, 0.14);
        color: #0e7490;
      }

      .todo__tag[data-kind='issue_collaborating'] {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-600, #4f46e5);
      }

      .todo__role {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        background: var(--bg-subtle, #f1f5f9);
        color: var(--text-secondary, #64748b);
        flex: 0 0 auto;
      }

      .todo__role[data-kind='high_amount'] {
        background: rgba(239, 68, 68, 0.12);
        color: #dc2626;
      }

      .todo__title {
        font-weight: 600;
        font-size: 0.875rem;
        line-height: 1.4rem;
        color: var(--text-primary, #1e293b);
        margin-bottom: 6px;
        display: block;
      }

      .todo__icon {
        font-size: 12px;
        color: var(--text-muted, #94a3b8);
        transition: transform 0.2s ease;
      }

      .todo__item:hover .todo__icon {
        transform: translateX(2px);
      }

      .todo__meta {
        font-size: 0.75rem;
        line-height: 1rem;
        color: #64748b;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .todo__meta span {
        display: inline-flex;
        align-items: center;
      }

      .todo__amount--high {
        color: #dc2626;
        font-weight: 600;
      }

      .todo__project {
        display: inline-flex;
        align-items: center;
        padding: 0 6px;
        border-radius: 4px;
        background: var(--bg-subtle, #f1f5f9);
        color: var(--text-secondary, #64748b);
        font-size: 0.7rem;
      }

      .pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }

      /* 暗色主题适配 */
      :host-context(html[data-theme='dark']) .todo__tag[data-kind^='rd_verify'],
      :host-context(html[data-theme='dark']) .todo__tag[data-kind^='issue_verify'] {
        background: rgba(245, 158, 11, 0.2);
      }

      :host-context(html[data-theme='dark']) .todo__item {
        border-color: #334155;
        background: #1e293b;
      }

      :host-context(html[data-theme='dark']) .todo__item:hover {
        background: #2d3a4e;
        border-color: #818cf8;
      }

      :host-context(html[data-theme='dark']) .todo__title {
        color: #e2e8f0;
      }

      :host-context(html[data-theme='dark']) .todo__meta {
        color: #94a3b8;
      }

      :host-context(html[data-theme='dark']) .todo__project {
        background: #334155;
        color: #94a3b8;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTodosPageComponent {
  // private readonly dashboardApi = inject(DashboardApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly items = signal<TodoItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);

  // 筛选条件（草稿状态）
  readonly draftKindFilter = signal<string>('');
  readonly draftProjectIdFilter = signal<string>('');

  // 实际生效的筛选条件
  readonly kindFilter = signal<string>('');
  readonly projectIdFilter = signal<string>('');

  readonly projectNameById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const project of this.projectContext.projects()) {
      map[project.id] = project.name;
    }
    return map;
  });

  readonly projects = this.projectContext.projects;

  constructor() {
    this.draftKindFilter.set(this.kindFilter());
    this.draftProjectIdFilter.set(this.projectIdFilter());
    this.load();
  }

  onKindChange(kind: string): void {
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

  onPageIndexChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize || 20);
    this.page.set(1);
    this.load();
  }

  detailLink(item: TodoItem): string[] {
    const isRdRelated = item.kind.startsWith('rd');
    return isRdRelated ? ['/rd', item.entityId] : ['/issues', item.entityId];
  }

  kindLabel(item: TodoItem): string {
    const kindMap: Record<string, string> = {
      issue_collaborating: '待部门主管审批',
      issue_verify: '待会计处理',
      rd_verify: '待会计处理',
      issue_assigned: '待审批',
      rd_assigned: '待审批',
    };
    return kindMap[item.kind] || '';
  }

  shouldShowHighAmountTag(item: TodoItem): boolean {
    const HIGH_AMOUNT_THRESHOLD = 5000;
    return (
      item.amount >= HIGH_AMOUNT_THRESHOLD &&
      (item.kind === 'issue_verify' || item.kind === 'rd_verify')
    );
  }

  formatWaitingTime(hours: number): string {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}天${hours % 24 > 0 ? ` ${hours % 24}小时` : ''}`;
    }
    if (hours < 1) {
      return '即将超时';
    }
    return `${hours}小时`;
  }

  private load(): void {
    this.loading.set(true);
    // const subscription = this.dashboardApi
    //   .getTodosPage({
    //     page: this.page(),
    //     pageSize: this.pageSize(),
    //     kind: this.kindFilter() || undefined,
    //     projectId: this.projectIdFilter() || undefined,
    //   })
    //   .subscribe({
    //     next: (result) => {
    //       this.items.set(result.items);
    //       this.total.set(result.total);
    //       this.loading.set(false);
    //     },
    //     error: (error) => {
    //       console.error('加载待办列表失败:', error);
    //       this.items.set([]);
    //       this.total.set(0);
    //       this.loading.set(false);
    //     },
    //   });

    // this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}

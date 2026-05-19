import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ListStateComponent, PageHeaderComponent, PageToolbarComponent } from '@app/shared/ui';
import type { ReimbursementClaimEntity, ReimbursementClaimType } from '../../../models/reimbursement.model';
import { ReimbursementApiService } from '../../../services/reimbursement-api.service';
import type { TodoItem } from '../../components/my-todos-card/my-todos-card';

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
    NzInputModule,
    PageToolbarComponent,
    PageHeaderComponent,
    ListStateComponent,
  ],
  template: `
    <app-page-header title="我的待办" subtitle="当前分配给我的报销审批事项。" />

    <app-page-toolbar>
      <div toolbar-filters class="todo-toolbar__main">
        <nz-select
          nzPlaceHolder="全部类型"
          class="toolbar-select"
          [ngModel]="draftClaimTypeFilter()"
          (ngModelChange)="onClaimTypeChange($event)"
        >
          <nz-option nzLabel="全部类型" nzValue=""></nz-option>
          <nz-option nzLabel="差旅报销" nzValue="travel"></nz-option>
          <nz-option nzLabel="费用报销" nzValue="general"></nz-option>
        </nz-select>
        <input
          nz-input
          class="toolbar-input"
          placeholder="搜索编号、申请人、事由"
          [ngModel]="draftKeyword()"
          (ngModelChange)="onKeywordChange($event)"
        />
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
                <span class="todo__tag" [attr.data-kind]="tagTone(item)">
                  {{ item.stageName }}
                </span>
                @if (item.highAmount) {
                  <span class="todo__role" data-kind="high_amount">高金额</span>
                }
              </div>
              <nz-icon class="todo__icon" nzType="right" nzTheme="outline" />
            </div>

            <span class="todo__title">{{ item.title }}</span>

            <div class="todo__meta">
              <span>{{ claimTypeLabel(item.claimType) }}</span>
              <span>申请人: {{ item.applicant }}</span>
              <span [class.todo__amount--high]="item.highAmount">
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

      .toolbar-input {
        width: 280px;
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

      .todo__tag[data-kind='review'],
      .todo__tag[data-kind='finance_review'],
      .todo__tag[data-kind='cashier'] {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }

      .todo__tag[data-kind='department_manager'] {
        background: rgba(6, 182, 212, 0.14);
        color: #0e7490;
      }

      .todo__tag[data-kind='default'] {
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

      .pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }

      :host-context(html[data-theme='dark']) .todo__tag[data-kind='review'],
      :host-context(html[data-theme='dark']) .todo__tag[data-kind='finance_review'],
      :host-context(html[data-theme='dark']) .todo__tag[data-kind='cashier'] {
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTodosPageComponent {
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly claims = signal<ReimbursementClaimEntity[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly draftClaimTypeFilter = signal<ReimbursementClaimType | ''>('');
  readonly draftKeyword = signal('');
  readonly claimTypeFilter = signal<ReimbursementClaimType | ''>('');
  readonly keyword = signal('');

  readonly items = computed<TodoItem[]>(() =>
    this.claims().map((claim) => ({
      id: claim.id,
      code: claim.claimNo,
      claimType: claim.claimType,
      stageCode: claim.currentStageCode,
      stageName: claim.currentStageName ?? '待审批',
      title: claim.reason,
      applicant: claim.applicantName,
      amount: claim.totalAmount,
      waitingHours: this.diffHours(claim.submittedAt ?? claim.createdAt),
      claimId: claim.id,
      highAmount: claim.totalAmount >= 5000,
    })),
  );

  constructor() {
    this.load();
  }

  onClaimTypeChange(claimType: ReimbursementClaimType | ''): void {
    this.draftClaimTypeFilter.set(claimType);
  }

  onKeywordChange(keyword: string): void {
    this.draftKeyword.set(keyword ?? '');
  }

  applyFilters(): void {
    this.claimTypeFilter.set(this.draftClaimTypeFilter());
    this.keyword.set(this.draftKeyword().trim());
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.draftClaimTypeFilter.set('');
    this.draftKeyword.set('');
    this.claimTypeFilter.set('');
    this.keyword.set('');
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
    return item.claimType === 'travel'
      ? ['/travel-expense/detail', item.claimId]
      : ['/expense/detail', item.claimId];
  }

  tagTone(item: TodoItem): 'review' | 'department_manager' | 'finance_review' | 'cashier' | 'default' {
    switch (item.stageCode) {
      case 'review':
        return 'review';
      case 'department_manager':
        return 'department_manager';
      case 'finance_review':
        return 'finance_review';
      case 'cashier':
        return 'cashier';
      default:
        return 'default';
    }
  }

  claimTypeLabel(claimType: ReimbursementClaimType): string {
    return claimType === 'travel' ? '差旅报销' : '费用报销';
  }

  formatWaitingTime(hours: number): string {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainHours = hours % 24;
      return remainHours > 0 ? `${days}天 ${remainHours}小时` : `${days}天`;
    }
    if (hours < 1) {
      return '不足1小时';
    }
    return `${hours}小时`;
  }

  private load(): void {
    this.loading.set(true);
    this.reimbursementApi
      .listClaims({
        page: this.page(),
        pageSize: this.pageSize(),
        scope: 'todo',
        claimType: this.claimTypeFilter(),
        keyword: this.keyword() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.claims.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.claims.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.message.error('加载待办列表失败');
        },
      });
  }

  private diffHours(startAt: string): number {
    const started = new Date(startAt).getTime();
    if (Number.isNaN(started)) {
      return 0;
    }
    const diff = Date.now() - started;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  }
}

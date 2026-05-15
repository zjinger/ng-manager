import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { DashboardPanelComponent } from '@shared/ui';
import { NzIconModule } from 'ng-zorro-antd/icon';

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
  selector: 'my-todos-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardPanelComponent, NzIconModule],
  template: `
    <app-dashboard-panel
      title="我的待办"
      [count]="total()"
      [actionIcon]="showMoreIcon() ? 'more' : null"
      [actionText]="showMoreIcon() ? '查看更多待办' : null"
      [actionLink]="showMoreIcon() ? ['/financing//my-todos'] : []"
      [empty]="items().length === 0"
      emptyText="当前没有待办"
    >
      <div class="todos__list">
        @for (item of displayItems(); track item.id) {
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
              <span>申请人: {{ item.applicant }}</span>
              <span>金额: ¥{{ item.amount | number:'1.2-2' }}</span>
              <span>等待 {{ item.waitingHours }} 小时</span>
            </div>
          </div>
        }
      </div>
    </app-dashboard-panel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .todos__list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 18px;
      }

      .todo__item {
        border: 1px solid var(--border-color-soft, #e2e8f0);
        border-radius: 0.75rem;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
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

      .todo__tag[data-kind^="rd_verify"],
      .todo__tag[data-kind^="issue_verify"] {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }

      .todo__tag[data-kind^="rd_assigned"],
      .todo__tag[data-kind^="issue_assigned"] {
        background: rgba(6, 182, 212, 0.14);
        color: #0e7490;
      }

      .todo__tag[data-kind="issue_collaborating"] {
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

      .todo__role[data-kind="high_amount"] {
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

      /* 暗色主题适配 */
      :host-context(html[data-theme='dark']) .todo__tag[data-kind^="rd_verify"],
      :host-context(html[data-theme='dark']) .todo__tag[data-kind^="issue_verify"] {
        background: rgba(245, 158, 11, 0.2);
      }

      :host-context(html[data-theme='dark']) .todo__item {
        border-color: #334155;
      }

      :host-context(html[data-theme='dark']) .todo__item:hover {
        background: #1e293b;
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
export class MyTodosCardComponent {
  readonly items = input.required<TodoItem[]>();
  readonly total = input(0);
  readonly projectNames = input<Record<string, string>>({});
  readonly maxDisplayCount = input(5); // 最多显示数量

  readonly showMoreIcon = computed(() => this.total() > 10);
  
  readonly displayItems = computed(() => {
    const items = this.items();
    const maxCount = this.maxDisplayCount();
    return items.slice(0, maxCount);
  });

  detailLink(item: TodoItem): string[] {
    const isRdRelated = item.kind.startsWith('rd');
    return isRdRelated ? ['/rd', item.entityId] : ['/issues', item.entityId];
  }

  kindLabel(item: TodoItem): string {
    const kindMap: Record<TodoItem['kind'], string> = {
      issue_collaborating: '待部门主管审批',
      issue_verify: '待会计处理',
      rd_verify: '待会计处理',
      issue_assigned: '待审批',
      rd_assigned: '待审批'
    };
    return kindMap[item.kind] || '';
  }

  shouldShowHighAmountTag(item: TodoItem): boolean {
    const HIGH_AMOUNT_THRESHOLD = 5000;
    return item.amount >= HIGH_AMOUNT_THRESHOLD && 
           (item.kind === 'issue_verify' || item.kind === 'rd_verify');
  }
}
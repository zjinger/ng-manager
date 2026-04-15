import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { DashboardPanelComponent, StatusBadgeComponent } from '@shared/ui';
import type { DashboardTodoItem } from '../../models/dashboard.model';

@Component({
  selector: 'app-my-todos-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, DashboardPanelComponent],
  template: `
    <app-dashboard-panel
      title="我的待办"
      icon="bug"
      [count]="items().length"
      [empty]="items().length === 0"
      emptyText="当前没有待办"
    >
      @for (item of items(); track item.entityId) {
        <a
          class="todo"
          [routerLink]="detailLink(item)"
        >
          <div class="todo__priority" [attr.data-kind]="item.kind"></div>
          <div class="todo__body">
            <div class="todo__title">
              <span class="todo__tag" [attr.data-kind]="item.kind">
                {{ item.kind.startsWith('rd') ? '研发项' : '测试单' }}
              </span>
              @if (roleLabel(item)) {
                <span class="todo__role" [attr.data-kind]="item.kind">{{ roleLabel(item) }}</span>
              }
              <span>{{ item.title }}</span>
            </div>
            <div class="todo__meta">
              <span class="todo__code">{{ item.code }}</span>
              <app-status-badge [status]="item.status" />
              <span>{{ projectLabel(item.projectId) }}</span>
              <span>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
            </div>
          </div>
        </a>
      }
    </app-dashboard-panel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .todo {
        display: flex;
        gap: 12px;
        padding: 16px 18px;
        border-top: 1px solid var(--border-color-soft);
        color: inherit;
        text-decoration: none;
        transition: var(--transition-base);
      }
      .todo:hover {
        background: var(--bg-subtle);
      }
      .todo__priority {
        width: 4px;
        flex-shrink: 0;
        border-radius: 2px;
        background: var(--color-info);
      }
      .todo__priority[data-kind='issue_verify'] {
        background: var(--color-warning);
      }
      .todo__priority[data-kind='issue_collaborating'] {
        background: var(--primary-500);
      }
      .todo__body {
        min-width: 0;
      }
      .todo__code {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary-600);
      }
      .todo__title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: var(--text-primary);
        flex-wrap: wrap;
      }
      .todo__tag {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--color-info-light);
        color: var(--color-info);
        font-size: 11px;
        font-weight: 600;
        flex: 0 0 auto;
      }
      .todo__tag[data-kind^='rd'] {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-500);
      }
      .todo__role {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        background: var(--bg-subtle);
        color: var(--text-secondary);
        flex: 0 0 auto;
      }
      .todo__role[data-kind='issue_assigned'],
      .todo__role[data-kind='rd_assigned'] {
        background: rgba(6, 182, 212, 0.14);
        color: #0e7490;
      }
      .todo__role[data-kind='issue_collaborating'] {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-600);
      }
      .todo__role[data-kind='issue_verify'] {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }
      .todo__meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
        color: var(--text-disabled);
        font-size: 12px;
      }
      :host-context(html[data-theme='dark']) .todo__tag {
        background: rgba(59, 130, 246, 0.16);
      }
      :host-context(html[data-theme='dark']) .todo__tag[data-kind^='rd'] {
        background: color-mix(in srgb, var(--primary-500) 18%, transparent);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTodosCardComponent {
  readonly items = input.required<DashboardTodoItem[]>();
  readonly projectNames = input<Record<string, string>>({});

  detailLink(item: DashboardTodoItem): string[] {
    if (item.kind.startsWith('rd')) {
      return ['/rd', item.entityId];
    }
    return ['/issues', item.entityId];
  }

  projectLabel(projectId: string): string {
    return this.projectNames()[projectId] || '未知项目';
  }

  roleLabel(item: DashboardTodoItem): string {
    if (item.kind === 'issue_collaborating') {
      return '协作中';
    }
    if (item.kind === 'issue_verify') {
      return '待验证';
    }
    if (item.kind === 'issue_assigned' || item.kind === 'rd_assigned') {
      return '负责人';
    }
    return '';
  }

}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { StatusBadgeComponent } from '@shared/ui';
import type { DashboardTodoItem } from '../../models/dashboard.model';

@Component({
  selector: 'app-my-todos-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h3 class="panel__title">我的待办</h3>
        <span class="panel__count">{{ items().length }}</span>
      </header>

      @if (items().length === 0) {
        <div class="panel__empty">当前没有待办</div>
      } @else {
        @for (item of items(); track item.entityId) {
          <a
            class="todo"
            [routerLink]="item.kind.startsWith('rd') ? ['/rd'] : ['/issues']"
          >
            <div class="todo__priority" [attr.data-kind]="item.kind"></div>
            <div class="todo__body">
              <div class="todo__title">
                <span class="todo__tag" [attr.data-kind]="item.kind">
                  {{ item.kind.startsWith('rd') ? 'RD' : 'ISSUE' }}
                </span>
                <span>{{ item.title }}</span>
              </div>
              <div class="todo__meta">
                <span class="todo__code">{{ item.code }}</span>
                <app-status-badge [status]="item.status" />
                <span>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
              </div>
            </div>
          </a>
        }
      }
    </section>
  `,
  styles: [
    `
      .panel {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        position: relative;
      }
      .panel::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 26%);
      }
      .panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .panel__title {
        margin: 0;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 600;
      }
      .panel__count {
        padding: 1px 8px;
        border-radius: 10px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 500;
      }
      .panel__empty {
        padding: 32px 18px;
        text-align: center;
        color: var(--text-disabled);
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
      .todo__priority[data-kind='rd_review'] {
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
      }
      .todo__tag {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--color-info-light);
        color: var(--color-info);
        font-size: 11px;
        font-weight: 600;
      }
      .todo__tag[data-kind^='rd'] {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-500);
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
      :host-context(html[data-theme='dark']) .panel {
        border-color: rgba(148, 163, 184, 0.14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 26%),
          var(--bg-container);
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
}

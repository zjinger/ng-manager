import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { TodoStats } from '../models/todo.model';

@Component({
  selector: 'app-todo-stats',
  imports: [NzIconModule],
  template: `
    <section class="todo-stats">
      @for (item of statItems(); track item.key) {
        <article class="todo-stat-card">
          <div class="todo-stat-card__top">
            <span class="todo-stat-card__label">{{ item.label }}</span>
            <span class="todo-stat-card__icon" [attr.data-tone]="item.tone">
              <span nz-icon [nzType]="item.icon"></span>
            </span>
          </div>
          <strong class="todo-stat-card__value">{{ item.value }}</strong>
          @if (item.progress !== null) {
            <div class="todo-stat-card__progress">
              <i [attr.data-tone]="item.tone" [style.width.%]="item.progress"></i>
            </div>
          }
        </article>
      }
    </section>
  `,
  styles: [
    `
      .todo-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }

      .todo-stat-card {
        padding: 18px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
      }

      .todo-stat-card__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .todo-stat-card__label {
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 600;
      }

      .todo-stat-card__icon {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius);
        font-size: 16px;
      }

      .todo-stat-card__icon[data-tone='blue'] {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .todo-stat-card__icon[data-tone='purple'] {
        background: rgba(124, 58, 237, 0.14);
        color: #7c3aed;
      }

      .todo-stat-card__icon[data-tone='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      .todo-stat-card__icon[data-tone='red'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }

      .todo-stat-card__value {
        display: block;
        margin-top: 12px;
        color: var(--text-heading);
        font-size: 30px;
        line-height: 1;
      }

      .todo-stat-card__progress {
        height: 4px;
        margin-top: 14px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--bg-subtle);
      }

      .todo-stat-card__progress i {
        display: block;
        height: 100%;
        border-radius: inherit;
        transition: width 0.2s ease;
      }

      .todo-stat-card__progress i[data-tone='purple'],
      .todo-stat-card__progress i[data-tone='blue'] {
        background: var(--color-info);
      }

      .todo-stat-card__progress i[data-tone='green'] {
        background: var(--color-success);
      }

      @media (max-width: 960px) {
        .todo-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .todo-stats {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoStatsComponent {
  readonly stats = input.required<TodoStats>();

  statItems(): Array<{
    key: string;
    label: string;
    icon: string;
    tone: 'blue' | 'purple' | 'green' | 'red';
    value: number;
    progress: number | null;
  }> {
    const stats = this.stats();
    return [
      {
        key: 'total',
        label: '全部待办',
        icon: 'schedule',
        tone: 'blue',
        value: stats.total,
        progress: null,
      },
      {
        key: 'doing',
        label: '进行中',
        icon: 'sync',
        tone: 'purple',
        value: stats.doing,
        progress: this.percent(stats.doing, stats.total),
      },
      {
        key: 'done',
        label: '已完成',
        icon: 'check-circle',
        tone: 'green',
        value: stats.done,
        progress: this.percent(stats.done, stats.total),
      },
      {
        key: 'overdue',
        label: '已逾期',
        icon: 'exclamation-circle',
        tone: 'red',
        value: stats.overdue,
        progress: null,
      },
    ];
  }

  private percent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}


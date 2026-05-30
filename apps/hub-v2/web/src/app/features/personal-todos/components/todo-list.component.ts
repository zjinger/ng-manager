import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  type Todo,
  type TodoPriority,
  type TodoStatus,
  type TodoTagEntity,
} from '../models/todo.model';
import { PanelCardComponent } from '@shared/ui';

@Component({
  selector: 'app-todo-list',
  imports: [NzButtonModule, NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card title="任务列表" [count]="todos().length">
      <button
        panel-actions
        nz-button
        nzType="text"
        nzShape="circle"
        title="清除已完成"
        [disabled]="!hasCompleted()"
        (click)="clearCompleted.emit()"
      >
        <span nz-icon nzType="clear"></span>
      </button>

      @if (todos().length === 0) {
        <section class="todo-empty">
          <span class="todo-empty__icon" nz-icon nzType="check-circle"></span>
          <strong>暂无任务</strong>
        </section>
      } @else {
        <div class="todo-list">
          @for (todo of todos(); track todo.id) {
            <article class="todo-row" [class.todo-row--done]="todo.status === 'done'">
              <button
                type="button"
                class="todo-row__check"
                [class.is-done]="todo.status === 'done'"
                [attr.aria-label]="todo.status === 'done' ? '恢复任务' : '完成任务'"
                (click)="toggleDone.emit(todo)"
              >
                @if (todo.status === 'done') {
                  <span nz-icon nzType="check"></span>
                }
              </button>

              <i class="todo-row__priority" [attr.data-priority]="todo.priority"></i>

              <div class="todo-row__content">
                <div class="todo-row__title-line">
                  <strong>{{ todo.title }}</strong>
                  <span class="todo-status" [attr.data-status]="displayStatus(todo)">
                    {{ statusLabel(todo) }}
                  </span>
                </div>
                @if (todo.desc) {
                  <p>{{ todo.desc }}</p>
                }
                <div class="todo-row__meta">
                  <span class="todo-priority-dot" [attr.data-priority]="todo.priority"></span>
                  <span>{{ priorityLabel(todo.priority) }}</span>
                  @if (todo.due) {
                    <span class="todo-due" [class.todo-due--overdue]="isOverdue(todo)">
                      <span nz-icon nzType="calendar"></span>
                      {{ formatDue(todo.due) }}
                    </span>
                  }
                  @for (tag of todoTags(todo); track tag.id) {
                    <span class="todo-tag" [attr.data-color]="tag.color">{{ tag.name }}</span>
                  }
                </div>
              </div>

              <div class="todo-row__actions">
                <button nz-button nzType="text" nzShape="circle" title="编辑" (click)="edit.emit(todo)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzShape="circle" title="删除" nzDanger (click)="delete.emit(todo)">
                  <span nz-icon nzType="delete"></span>
                </button>
              </div>
            </article>
          }
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .todo-list {
        display: grid;
      }

      .todo-row {
        display: grid;
        grid-template-columns: 28px 4px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }

      .todo-row:first-child {
        border-top: 0;
      }

      .todo-row:hover {
        background: var(--bg-subtle);
      }

      .todo-row--done .todo-row__content {
        opacity: 0.68;
      }

      .todo-row--done .todo-row__title-line strong {
        text-decoration: line-through;
      }

      .todo-row__check {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--gray-300);
        border-radius: 50%;
        background: transparent;
        color: #fff;
        cursor: pointer;
        transition: var(--transition-base);
      }

      .todo-row__check:hover {
        border-color: var(--color-info);
      }

      .todo-row__check.is-done {
        border-color: var(--color-success);
        background: var(--color-success);
      }

      .todo-row__priority {
        width: 4px;
        height: 46px;
        border-radius: 999px;
        background: var(--priority-low);
      }

      .todo-row__priority[data-priority='critical'] {
        background: var(--priority-critical);
      }

      .todo-row__priority[data-priority='high'] {
        background: var(--priority-high);
      }

      .todo-row__priority[data-priority='medium'] {
        background: var(--priority-medium);
      }

      .todo-row__content {
        min-width: 0;
      }

      .todo-row__title-line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .todo-row__title-line strong {
        min-width: 0;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .todo-row__content p {
        margin: 4px 0 0;
        color: var(--text-muted);
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .todo-row__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 7px;
        color: var(--text-disabled);
        font-size: 12px;
      }

      .todo-row__actions {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        opacity: 0;
        pointer-events: none;
        transition: var(--transition-base);
      }

      .todo-row:hover .todo-row__actions,
      .todo-row__actions:focus-within {
        opacity: 1;
        pointer-events: auto;
      }

      .todo-status,
      .todo-tag {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        border-radius: var(--border-radius-sm);
        font-size: 11px;
        font-weight: 700;
      }

      .todo-status {
        padding: 2px 8px;
      }

      .todo-status[data-status='todo'] {
        background: var(--status-todo-bg);
        color: var(--status-todo);
      }

      .todo-status[data-status='doing'] {
        background: var(--status-doing-bg);
        color: var(--status-doing);
      }

      .todo-status[data-status='done'] {
        background: var(--status-done-bg);
        color: var(--status-done);
      }

      .todo-status[data-status='overdue'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }

      .todo-priority-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--priority-low);
      }

      .todo-priority-dot[data-priority='critical'] {
        background: var(--priority-critical);
      }

      .todo-priority-dot[data-priority='high'] {
        background: var(--priority-high);
      }

      .todo-priority-dot[data-priority='medium'] {
        background: var(--priority-medium);
      }

      .todo-due {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .todo-due--overdue {
        color: var(--color-danger);
        font-weight: 700;
      }

      .todo-tag {
        padding: 1px 7px;
      }

      .todo-tag[data-color='blue'] {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .todo-tag[data-color='purple'] {
        background: rgba(139, 92, 246, 0.14);
        color: #7c3aed;
      }

      .todo-tag[data-color='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      .todo-tag[data-color='red'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }

      .todo-tag[data-color='orange'] {
        background: rgba(234, 88, 12, 0.14);
        color: #c2410c;
      }

      .todo-tag[data-color='cyan'] {
        background: rgba(8, 145, 178, 0.14);
        color: #0e7490;
      }

      .todo-tag[data-color='gray'] {
        background: rgba(100, 116, 139, 0.14);
        color: #475569;
      }

      .todo-empty {
        min-height: 240px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 12px;
        color: var(--text-muted);
      }

      .todo-empty__icon {
        font-size: 34px;
        color: var(--gray-300);
      }

      @media (max-width: 700px) {
        .todo-row {
          grid-template-columns: 28px 4px minmax(0, 1fr);
        }

        .todo-row__actions {
          grid-column: 3;
          justify-self: start;
          opacity: 1;
          pointer-events: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent {
  readonly todos = input.required<Todo[]>();
  readonly tags = input<TodoTagEntity[]>([]);
  readonly hasCompleted = input(false);
  readonly edit = output<Todo>();
  readonly delete = output<Todo>();
  readonly toggleDone = output<Todo>();
  readonly clearCompleted = output<void>();

  priorityLabel(priority: TodoPriority): string {
    return TODO_PRIORITY_LABELS[priority];
  }

  todoTags(todo: Todo): TodoTagEntity[] {
    const tags = new Map(this.tags().map((tag) => [tag.id, tag]));
    return todo.tagIds.map((tagId) => tags.get(tagId)).filter((tag): tag is TodoTagEntity => !!tag);
  }

  statusLabel(todo: Todo): string {
    return this.isOverdue(todo) ? '已逾期' : TODO_STATUS_LABELS[todo.status];
  }

  displayStatus(todo: Todo): TodoStatus | 'overdue' {
    return this.isOverdue(todo) ? 'overdue' : todo.status;
  }

  isOverdue(todo: Todo): boolean {
    return !!todo.due && todo.due < this.todayIso() && todo.status !== 'done';
  }

  formatDue(due: string): string {
    const diff = this.diffDays(due, this.todayIso());
    if (diff === 0) {
      return '今天';
    }
    if (diff === 1) {
      return '明天';
    }
    if (diff === -1) {
      return '昨天';
    }
    if (diff > 0 && diff <= 7) {
      return `${diff}天后`;
    }
    if (diff < 0 && diff >= -7) {
      return `${Math.abs(diff)}天前`;
    }

    const [, month, day] = due.split('-');
    return `${Number(month)}月${Number(day)}日`;
  }

  private diffDays(leftIso: string, rightIso: string): number {
    const left = Date.parse(`${leftIso}T00:00:00`);
    const right = Date.parse(`${rightIso}T00:00:00`);
    return Math.round((left - right) / 86_400_000);
  }

  private todayIso(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

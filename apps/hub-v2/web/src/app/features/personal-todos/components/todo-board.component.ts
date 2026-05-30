import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import {
  type Todo,
  type TodoBoardColumn,
  type TodoStatus,
  type TodoTagEntity,
} from '../models/todo.model';

@Component({
  selector: 'app-todo-board',
  imports: [NzButtonModule, NzIconModule],
  template: `
    <section class="todo-board">
      @for (column of columns(); track column.status) {
        <div
          class="todo-board__column"
          [class.is-over]="overStatus() === column.status"
          (dragover)="onDragOver($event, column.status)"
          (dragleave)="onDragLeave(column.status)"
          (drop)="onDrop($event, column.status)"
        >
          <header class="todo-board__header">
            <span class="todo-board__dot" [attr.data-status]="column.status"></span>
            <strong>{{ column.label }}</strong>
            <span>{{ column.items.length }}</span>
          </header>
          <div class="todo-board__cards">
            @for (todo of column.items; track todo.id) {
              <article
                class="todo-card"
                draggable="true"
                (dragstart)="onDragStart($event, todo)"
                (dragend)="onDragEnd()"
              >
                <div class="todo-card__top">
                  <strong>{{ todo.title }}</strong>
                  <div class="todo-card__actions">
                    <button nz-button nzType="text" nzShape="circle" title="编辑" (click)="edit.emit(todo)">
                      <span nz-icon nzType="edit"></span>
                    </button>
                    <button nz-button nzType="text" nzShape="circle" title="删除" nzDanger (click)="delete.emit(todo)">
                      <span nz-icon nzType="delete"></span>
                    </button>
                  </div>
                </div>
                @if (todo.desc) {
                  <p>{{ todo.desc }}</p>
                }
                <footer>
                  <span class="todo-card__tag-list">
                    @for (tag of todoTags(todo); track tag.id) {
                      <span class="todo-card__tag" [attr.data-color]="tag.color">{{ tag.name }}</span>
                    }
                  </span>
                  @if (todo.due) {
                    <span class="todo-card__due" [class.todo-card__due--overdue]="isOverdue(todo)">
                      {{ formatDue(todo.due) }}
                    </span>
                  }
                </footer>
              </article>
            } @empty {
              <div class="todo-board__empty">拖拽任务到这里</div>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .todo-board {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .todo-board__column {
        min-height: 420px;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
        transition: var(--transition-base);
      }

      .todo-board__column.is-over {
        border-style: dashed;
        border-color: var(--color-info);
        background: color-mix(in srgb, var(--color-info-light) 30%, var(--bg-container));
      }

      .todo-board__header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .todo-board__header strong {
        color: var(--text-primary);
      }

      .todo-board__header span:last-child {
        margin-left: auto;
        min-width: 24px;
        padding: 1px 8px;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        text-align: center;
        font-size: 12px;
        font-weight: 700;
      }

      .todo-board__dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--status-todo);
      }

      .todo-board__dot[data-status='doing'] {
        background: var(--status-doing);
      }

      .todo-board__dot[data-status='done'] {
        background: var(--status-done);
      }

      .todo-board__cards {
        flex: 1;
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 12px;
      }

      .todo-card {
        display: grid;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--surface-elevated);
        box-shadow: var(--shadow-sm);
        // 禁止用户选择文本
        user-select: none;
        cursor: grab;
      }

      .todo-card:active {
        cursor: grabbing;
      }

      .todo-card__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .todo-card__top strong {
        min-width: 0;
        color: var(--text-primary);
        line-height: 1.45;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .todo-card__actions {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }

      .todo-card p {
        margin: 0;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.5;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .todo-card footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }

      .todo-card__tag-list {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
      }

      .todo-card__tag {
        padding: 1px 6px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
      }

      .todo-card__tag[data-color='blue'] {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .todo-card__tag[data-color='purple'] {
        background: rgba(139, 92, 246, 0.14);
        color: #7c3aed;
      }

      .todo-card__tag[data-color='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      .todo-card__tag[data-color='red'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }

      .todo-card__tag[data-color='orange'] {
        background: rgba(234, 88, 12, 0.14);
        color: #c2410c;
      }

      .todo-card__tag[data-color='cyan'] {
        background: rgba(8, 145, 178, 0.14);
        color: #0e7490;
      }

      .todo-card__tag[data-color='gray'] {
        background: rgba(100, 116, 139, 0.14);
        color: #475569;
      }

      .todo-card__due {
        color: var(--text-disabled);
        font-size: 12px;
      }

      .todo-card__due--overdue {
        color: var(--color-danger);
        font-weight: 700;
      }

      .todo-board__empty {
        display: grid;
        place-items: center;
        min-height: 110px;
        border: 1px dashed var(--border-color);
        border-radius: var(--border-radius-sm);
        color: var(--text-disabled);
        font-size: 12px;
      }

      @media (max-width: 960px) {
        .todo-board {
          grid-template-columns: 1fr;
        }

        .todo-board__column {
          min-height: 260px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoBoardComponent {
  readonly columns = input.required<TodoBoardColumn[]>();
  readonly tags = input<TodoTagEntity[]>([]);
  readonly statusChange = output<{ id: string; status: TodoStatus }>();
  readonly edit = output<Todo>();
  readonly delete = output<Todo>();
  readonly draggedId = signal<string | null>(null);
  readonly overStatus = signal<TodoStatus | null>(null);

  onDragStart(event: DragEvent, todo: Todo): void {
    this.draggedId.set(todo.id);
    event.dataTransfer?.setData('text/plain', todo.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, status: TodoStatus): void {
    event.preventDefault();
    this.overStatus.set(status);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragLeave(status: TodoStatus): void {
    if (this.overStatus() === status) {
      this.overStatus.set(null);
    }
  }

  onDrop(event: DragEvent, status: TodoStatus): void {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain') || this.draggedId();
    this.overStatus.set(null);
    this.draggedId.set(null);
    if (id) {
      this.statusChange.emit({ id, status });
    }
  }

  onDragEnd(): void {
    this.draggedId.set(null);
    this.overStatus.set(null);
  }

  todoTags(todo: Todo): TodoTagEntity[] {
    const tags = new Map(this.tags().map((tag) => [tag.id, tag]));
    return todo.tagIds.map((tagId) => tags.get(tagId)).filter((tag): tag is TodoTagEntity => !!tag);
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

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  type Todo,
  type TodoFolderEntity,
  type TodoPriority,
  type TodoStatus,
  type TodoTagEntity,
} from '../models/todo.model';

export interface TodoImagePreview {
  src: string;
  alt: string;
  left: number;
  top: number;
}

@Component({
  selector: 'app-todo-list-row',
  imports: [NzButtonModule, NzIconModule],
  host: {
    class: 'todo-list-row-host',
  },
  template: `
    <article class="todo-row" [class.todo-row--done]="todo().status === 'done'">
      <button
        type="button"
        class="todo-row__check"
        [class.is-done]="todo().status === 'done'"
        [attr.aria-label]="todo().status === 'done' ? '恢复待办' : '完成待办'"
        (click)="toggleDone.emit(todo())"
      >
        @if (todo().status === 'done') {
          <span nz-icon nzType="check"></span>
        }
      </button>

      <i class="todo-row__priority" [attr.data-priority]="todo().priority"></i>

      <div class="todo-row__content">
        <div class="todo-row__text">
          <div class="todo-row__title-line">
            <strong>{{ todo().title }}</strong>
            <span class="todo-status" [attr.data-status]="displayStatus()">
              {{ statusLabel() }}
            </span>
          </div>
          @if (todo().desc) {
            <p>{{ previewSummary() || (previewImageUrl() ? '包含图片' : '') }}</p>
          }
          <div class="todo-row__meta">
            <span class="todo-priority-dot" [attr.data-priority]="todo().priority"></span>
            <span>{{ priorityLabel(todo().priority) }}</span>
            @if (todo().due; as due) {
              <span class="todo-due" [class.todo-due--overdue]="isOverdue()">
                <span nz-icon nzType="calendar"></span>
                {{ formatDue(due) }}
              </span>
            }
            @for (tag of todoTags(); track tag.id) {
              <span class="todo-tag" [attr.data-color]="tag.color">{{ tag.name }}</span>
            }
            @if (todoFolder(); as folder) {
              <span class="todo-folder" [attr.data-color]="folder.color">
                <span nz-icon nzType="folder"></span>
                {{ folder.name }}
              </span>
            }
          </div>
        </div>

        @if (previewImageUrl(); as imageUrl) {
          <div
            class="todo-row__preview"
            (mouseenter)="showHoverPreview($event)"
            (mousemove)="moveHoverPreview($event)"
            (mouseleave)="hideHoverPreview()"
          >
            <img
              class="todo-row__thumb-image"
              [src]="imageUrl"
              [alt]="previewImageAlt()"
              (error)="markPreviewImageError()"
            />
          </div>
        }
      </div>

      <div class="todo-row__actions">
        <button nz-button nzType="text" nzShape="circle" title="编辑" (click)="edit.emit(todo())">
          <span nz-icon nzType="edit"></span>
        </button>
        <button nz-button nzType="text" nzShape="circle" title="删除" nzDanger (click)="delete.emit(todo())">
          <span nz-icon nzType="delete"></span>
        </button>
      </div>
    </article>

  `,
  styles: [
    `
      :host {
        display: block;
        box-sizing: border-box;
        height: 80px;
        padding: 4px 12px;
      }

      :host(:first-child) {
        padding-top: 10px;
        padding-bottom: 2px;
      }

      .todo-row {
        display: grid;
        grid-template-columns: 28px 4px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        box-sizing: border-box;
        height: 100%;
        overflow: hidden;
        padding: 0 16px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        transition: var(--transition-base);
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
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        overflow: hidden;
      }

      .todo-row__text {
        min-width: 0;
        overflow: hidden;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .todo-row__title-line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        min-height: 20px;
        overflow: hidden;
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
        line-height: 18px;
        max-height: 18px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .todo-row__preview {
        width: 48px;
        height: 48px;
        flex: 0 0 48px;
        overflow: hidden;
        border: 1px solid var(--border-color-soft);
        border-radius: 6px;
        background: var(--bg-subtle);
        cursor: zoom-in;
      }

      .todo-row__thumb-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .todo-row__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        height: 20px;
        overflow: hidden;
        margin-top: 5px;
        color: var(--text-disabled);
        font-size: 12px;
        line-height: 20px;
        white-space: nowrap;
      }

      .todo-row__meta > * {
        flex: 0 0 auto;
      }

      .todo-row__actions {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
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
      .todo-tag,
      .todo-folder {
        display: inline-flex;
        align-items: center;
        gap: 4px;
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

      .todo-folder {
        padding: 1px 7px;
        background: rgba(100, 116, 139, 0.14);
        color: #475569;
      }

      .todo-tag[data-color='blue'],
      .todo-folder[data-color='blue'] {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .todo-tag[data-color='purple'],
      .todo-folder[data-color='purple'] {
        background: rgba(139, 92, 246, 0.14);
        color: #7c3aed;
      }

      .todo-tag[data-color='green'],
      .todo-folder[data-color='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      .todo-tag[data-color='red'],
      .todo-folder[data-color='red'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }

      .todo-tag[data-color='orange'],
      .todo-folder[data-color='orange'] {
        background: rgba(234, 88, 12, 0.14);
        color: #c2410c;
      }

      .todo-tag[data-color='cyan'],
      .todo-folder[data-color='cyan'] {
        background: rgba(8, 145, 178, 0.14);
        color: #0e7490;
      }

      .todo-tag[data-color='gray'] {
        background: rgba(100, 116, 139, 0.14);
        color: #475569;
      }

      @media (max-width: 700px) {
        .todo-row {
          grid-template-columns: 28px 4px minmax(0, 1fr) auto;
          gap: 10px;
        }

        .todo-row__preview {
          width: 40px;
          height: 40px;
          flex-basis: 40px;
        }

        .todo-row__actions {
          opacity: 1;
          pointer-events: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListRowComponent {
  readonly todo = input.required<Todo>();
  readonly tagById = input<Map<string, TodoTagEntity>>(new Map());
  readonly folderById = input<Map<string, TodoFolderEntity>>(new Map());
  readonly edit = output<Todo>();
  readonly delete = output<Todo>();
  readonly toggleDone = output<Todo>();
  readonly previewChange = output<TodoImagePreview | null>();

  private readonly previewImageErrorIds = signal<ReadonlySet<string>>(new Set());
  private readonly descriptionPreview = computed(() => this.parseDescriptionPreview(this.todo().desc ?? null));

  readonly todoTags = computed(() => {
    const tags = this.tagById();
    return this.todo().tagIds.map((tagId) => tags.get(tagId)).filter((tag): tag is TodoTagEntity => !!tag);
  });

  readonly todoFolder = computed(() => {
    const folderId = this.todo().folderId;
    return folderId ? this.folderById().get(folderId) ?? null : null;
  });

  previewSummary(): string {
    return this.descriptionPreview().summary;
  }

  previewImageUrl(): string | null {
    return this.previewImageErrorIds().has(this.todo().id) ? null : this.descriptionPreview().imageUrl;
  }

  previewImageAlt(): string {
    return this.descriptionPreview().imageAlt || this.todo().title;
  }

  markPreviewImageError(): void {
    const next = new Set(this.previewImageErrorIds());
    next.add(this.todo().id);
    this.previewImageErrorIds.set(next);
    this.previewChange.emit(null);
  }

  showHoverPreview(event: MouseEvent): void {
    const src = this.previewImageUrl();
    if (!src) {
      this.previewChange.emit(null);
      return;
    }
    this.previewChange.emit({
      src,
      alt: this.previewImageAlt(),
      ...this.resolveHoverPreviewPosition(event),
    });
  }

  moveHoverPreview(event: MouseEvent): void {
    const src = this.previewImageUrl();
    if (!src) {
      this.previewChange.emit(null);
      return;
    }
    this.previewChange.emit({
      src,
      alt: this.previewImageAlt(),
      ...this.resolveHoverPreviewPosition(event),
    });
  }

  hideHoverPreview(): void {
    this.previewChange.emit(null);
  }

  priorityLabel(priority: TodoPriority): string {
    return TODO_PRIORITY_LABELS[priority];
  }

  statusLabel(): string {
    return this.isOverdue() ? '已逾期' : TODO_STATUS_LABELS[this.todo().status];
  }

  displayStatus(): TodoStatus | 'overdue' {
    return this.isOverdue() ? 'overdue' : this.todo().status;
  }

  isOverdue(): boolean {
    const todo = this.todo();
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

  private parseDescriptionPreview(description: string | null): { summary: string; imageUrl: string | null; imageAlt: string } {
    const source = (description ?? '').trim();
    if (!source) {
      return { summary: '', imageUrl: null, imageAlt: '' };
    }

    let firstImageUrl: string | null = null;
    let firstImageAlt = '';

    const markdownImageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(source);
    if (markdownImageMatch) {
      firstImageAlt = markdownImageMatch[1]?.trim() ?? '';
      firstImageUrl = this.normalizeMarkdownImageUrl(markdownImageMatch[2] ?? '');
    }

    if (!firstImageUrl) {
      const htmlImageMatch = /<img\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/i.exec(source);
      if (htmlImageMatch) {
        firstImageUrl = htmlImageMatch[1]?.trim() ?? null;
        const altMatch = /<img\b[^>]*\balt\s*=\s*['"]([^'"]*)['"][^>]*>/i.exec(htmlImageMatch[0] ?? '');
        firstImageAlt = altMatch?.[1]?.trim() ?? '';
      }
    }

    const summary = source
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, ' ')
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/<\/?[^>]+>/g, ' ')
      .replace(/[*_~]/g, '')
      .replace(/\r?\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      summary,
      imageUrl: firstImageUrl || null,
      imageAlt: firstImageAlt,
    };
  }

  private normalizeMarkdownImageUrl(raw: string): string | null {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    if (value.startsWith('<') && value.endsWith('>')) {
      const inner = value.slice(1, -1).trim();
      return inner || null;
    }
    const targetMatch = /^(\S+)(?:\s+['"][\s\S]*['"])?$/.exec(value);
    return targetMatch?.[1] ?? value;
  }

  private resolveHoverPreviewPosition(event: MouseEvent): { left: number; top: number } {
    const previewWidth = 360;
    const previewHeight = 240;
    const gap = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = event.clientX + gap;
    let top = event.clientY + gap;

    if (left + previewWidth > viewportWidth - 12) {
      left = event.clientX - previewWidth - gap;
    }
    if (left < 12) {
      left = 12;
    }

    if (top + previewHeight > viewportHeight - 12) {
      top = viewportHeight - previewHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }

    return { left, top };
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

import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PanelCardComponent } from '@shared/ui';
import { type Todo, type TodoFolderEntity, type TodoListNode, type TodoTagEntity } from '../models/todo.model';
import { TodoListRowComponent, type TodoImagePreview } from './todo-list-row.component';

@Component({
  selector: 'app-todo-list',
  imports: [ScrollingModule, NzButtonModule, NzIconModule, PanelCardComponent, TodoListRowComponent],
  template: `
    <app-panel-card [title]="title()" [count]="totalCount()">
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

      @if (totalCount() === 0) {
        <section class="todo-empty">
          <span class="todo-empty__icon" nz-icon nzType="check-circle"></span>
          <strong>暂无待办</strong>
        </section>
      } @else {
        <div class="todo-scroll">
          <cdk-virtual-scroll-viewport
            class="todo-viewport"
            itemSize="80"
            minBufferPx="800"
            maxBufferPx="1600"
            (scrolledIndexChange)="onScrolledIndexChange($event)"
          >
            <ng-container *cdkVirtualFor="let node of nodes(); trackBy: trackByNode">
              @if (node.type === 'group') {
                <header class="todo-group-header">
                  <strong>{{ node.label }}</strong>
                  <span>{{ node.count }}</span>
                </header>
              } @else {
                @if (node.todo; as todo) {
                  <app-todo-list-row
                    [todo]="todo"
                    [tagById]="tagById()"
                    [folderById]="folderById()"
                    (edit)="edit.emit($event)"
                    (delete)="delete.emit($event)"
                    (toggleDone)="toggleDone.emit($event)"
                    (previewChange)="setHoveredPreview($event)"
                  ></app-todo-list-row>
                }
              }
            </ng-container>
          </cdk-virtual-scroll-viewport>

          @if (hoveredPreview(); as preview) {
            <div
              class="todo-image-hover-preview"
              [style.left.px]="preview.left"
              [style.top.px]="preview.top"
            >
              <img class="todo-image-hover-preview__image" [src]="preview.src" [alt]="preview.alt" />
            </div>
          }

          <div class="todo-load-more">
            @if (loadingMore()) {
              <span>正在加载...</span>
            } @else if (hasMore()) {
              <button nz-button nzType="link" (click)="loadMore.emit()">加载更多</button>
              <span>已加载 {{ loadedCount() }} / {{ total() }}</span>
            } @else {
              <span>已加载全部 {{ total() }} 条待办</span>
            }
          </div>
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .todo-scroll {
        display: grid;
      }

      .todo-viewport {
        height: min(680px, max(260px, calc(100vh - 330px)));
      }

      .todo-group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        box-sizing: border-box;
        height: 80px;
        overflow: hidden;
        padding: 0 24px;
        border-top: 1px solid var(--border-color-soft);
        color: var(--text-secondary);
      }

      .todo-group-header:first-child {
        border-top: 0;
      }

      .todo-group-header span {
        min-width: 22px;
        border-radius: 999px;
        padding: 1px 8px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        text-align: center;
        font-size: 12px;
        font-weight: 700;
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

      .todo-load-more {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 52px;
        border-top: 1px solid var(--border-color-soft);
        color: var(--text-muted);
        font-size: 12px;
      }

      .todo-image-hover-preview {
        position: fixed;
        z-index: 1200;
        width: 360px;
        height: 240px;
        padding: 8px;
        border: 1px solid color-mix(in srgb, var(--primary-300) 30%, var(--border-color));
        border-radius: 14px;
        background: color-mix(in srgb, var(--bg-container) 92%, white 8%);
        box-shadow: 0 22px 48px rgba(15, 23, 42, 0.24);
        pointer-events: none;
        backdrop-filter: blur(10px);
      }

      .todo-image-hover-preview__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 10px;
        background: var(--bg-subtle);
      }

      :host-context(html[data-theme='dark']) .todo-image-hover-preview {
        background: color-mix(in srgb, var(--bg-container) 88%, black 12%);
        border-color: rgba(129, 140, 248, 0.28);
        box-shadow: 0 28px 56px rgba(2, 6, 23, 0.46);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent {
  readonly nodes = input.required<TodoListNode[]>();
  readonly title = input('待办列表');
  readonly tags = input<TodoTagEntity[]>([]);
  readonly folders = input<TodoFolderEntity[]>([]);
  readonly tagById = input<Map<string, TodoTagEntity>>(new Map());
  readonly folderById = input<Map<string, TodoFolderEntity>>(new Map());
  readonly hasCompleted = input(false);
  readonly total = input(0);
  readonly loadingMore = input(false);
  readonly hasMore = input(false);
  readonly edit = output<Todo>();
  readonly delete = output<Todo>();
  readonly toggleDone = output<Todo>();
  readonly clearCompleted = output<void>();
  readonly loadMore = output<void>();
  readonly hoveredPreview = signal<TodoImagePreview | null>(null);

  readonly trackByNode = (_: number, node: TodoListNode): string => node.id;

  totalCount(): number {
    return this.total();
  }

  loadedCount(): number {
    return this.nodes().filter((node) => node.type === 'todo').length;
  }

  onScrolledIndexChange(index: number): void {
    if (this.hoveredPreview()) {
      this.hoveredPreview.set(null);
    }
    if (this.nodes().length - index < 16) {
      this.loadMore.emit();
    }
  }

  setHoveredPreview(preview: TodoImagePreview | null): void {
    this.hoveredPreview.set(preview);
  }
}

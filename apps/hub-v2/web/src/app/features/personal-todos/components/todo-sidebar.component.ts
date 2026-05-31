import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { type TodoFolderEntity, type TodoScope } from '../models/todo.model';

@Component({
  selector: 'app-todo-sidebar',
  imports: [NzButtonModule, NzIconModule],
  template: `
    <aside class="todo-sidebar">
      <button
        type="button"
        class="todo-sidebar__item"
        [class.is-active]="scope() === 'all'"
        (click)="selectAll.emit()"
      >
        <span nz-icon nzType="inbox"></span>
        <span>全部待办</span>
        <strong>{{ totalCount() }}</strong>
      </button>

      <div class="todo-sidebar__section">
        <div class="todo-sidebar__section-head">
          <span>文件夹</span>
          <button nz-button nzType="text" nzShape="circle" title="管理文件夹" (click)="manageFolders.emit()">
            <span nz-icon nzType="folder-add"></span>
          </button>
        </div>

        @for (folder of folders(); track folder.id) {
          <button
            type="button"
            class="todo-sidebar__item"
            [class.is-active]="scope() === 'folder' && selectedFolderId() === folder.id"
            (click)="selectFolder.emit(folder.id)"
          >
            <i class="todo-sidebar__swatch" [attr.data-color]="folder.color"></i>
            <span>{{ folder.name }}</span>
            <strong>{{ folderCount(folder.id) }}</strong>
          </button>
        }

        <button
          type="button"
          class="todo-sidebar__item"
          [class.is-active]="scope() === 'folder' && selectedFolderId() === null"
          (click)="selectFolder.emit(null)"
        >
          <span nz-icon nzType="folder"></span>
          <span>未分类</span>
          <strong>{{ unfiledCount() }}</strong>
        </button>
      </div>

      <button
        type="button"
        class="todo-sidebar__item todo-sidebar__item--recycle"
        [class.is-active]="scope() === 'recycle'"
        (click)="selectRecycle.emit()"
      >
        <span nz-icon nzType="delete"></span>
        <span>回收站</span>
        <strong>{{ recycleCount() }}</strong>
      </button>
    </aside>
  `,
  styles: [
    `
      .todo-sidebar {
        display: grid;
        align-content: start;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
      }

      .todo-sidebar__section {
        display: grid;
        gap: 6px;
        padding-top: 8px;
        border-top: 1px solid var(--border-color-soft);
      }

      .todo-sidebar__section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2px 2px 10px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .todo-sidebar__item {
        width: 100%;
        min-height: 36px;
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        border: 0;
        border-radius: var(--border-radius-sm);
        padding: 7px 10px;
        background: transparent;
        color: var(--text-secondary);
        text-align: left;
        cursor: pointer;
        transition: var(--transition-base);
      }

      .todo-sidebar__item:hover,
      .todo-sidebar__item.is-active {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }

      .todo-sidebar__item.is-active {
        box-shadow: inset 3px 0 0 var(--color-info);
      }

      .todo-sidebar__item--recycle.is-active {
        box-shadow: inset 3px 0 0 var(--color-danger);
      }

      .todo-sidebar__item span:not([nz-icon]) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .todo-sidebar__item strong {
        min-width: 24px;
        border-radius: 999px;
        padding: 1px 7px;
        background: var(--bg-muted);
        color: var(--text-muted);
        text-align: center;
        font-size: 12px;
      }

      .todo-sidebar__swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--color-info);
        justify-self: center;
      }

      .todo-sidebar__swatch[data-color='purple'] {
        background: #7c3aed;
      }

      .todo-sidebar__swatch[data-color='green'] {
        background: #16a34a;
      }

      .todo-sidebar__swatch[data-color='red'] {
        background: #dc2626;
      }

      .todo-sidebar__swatch[data-color='orange'] {
        background: #ea580c;
      }

      .todo-sidebar__swatch[data-color='cyan'] {
        background: #0891b2;
      }

      .todo-sidebar__swatch[data-color='gray'] {
        background: #64748b;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoSidebarComponent {
  readonly scope = input.required<TodoScope>();
  readonly selectedFolderId = input<string | null>(null);
  readonly folders = input<TodoFolderEntity[]>([]);
  readonly folderCounts = input<Map<string, number>>(new Map());
  readonly totalCount = input(0);
  readonly unfiledCount = input(0);
  readonly recycleCount = input(0);

  readonly selectAll = output<void>();
  readonly selectFolder = output<string | null>();
  readonly selectRecycle = output<void>();
  readonly manageFolders = output<void>();

  folderCount(folderId: string): number {
    return this.folderCounts().get(folderId) ?? 0;
  }
}

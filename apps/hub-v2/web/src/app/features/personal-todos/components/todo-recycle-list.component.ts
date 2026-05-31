import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { type Todo, type TodoFolderEntity } from '../models/todo.model';
import { PanelCardComponent } from '@shared/ui';

@Component({
  selector: 'app-todo-recycle-list',
  imports: [ScrollingModule, NzButtonModule, NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card title="回收站" [count]="total()">
      <button
        panel-actions
        nz-button
        nzDanger
        nzType="text"
        title="清空回收站"
        [disabled]="total() === 0"
        (click)="emptyRecycle.emit()"
      >
        <span nz-icon nzType="delete"></span>
        清空回收站
      </button>

      <div class="recycle-info">
        <span nz-icon nzType="warning"></span>
        回收站中的待办不参与统计和导航数量，可恢复或永久删除。
      </div>

      @if (todos().length === 0) {
        <section class="recycle-empty">
          <span class="recycle-empty__icon" nz-icon nzType="delete"></span>
          <strong>回收站为空</strong>
        </section>
      } @else {
        <div class="recycle-scroll">
          <cdk-virtual-scroll-viewport
            class="recycle-viewport"
            itemSize="68"
            minBufferPx="680"
            maxBufferPx="1360"
            (scrolledIndexChange)="onScrolledIndexChange($event)"
          >
            <ng-container *cdkVirtualFor="let todo of todos(); trackBy: trackByTodo">
              <article class="recycle-row">
                <div class="recycle-row__content">
                  <strong>{{ todo.title }}</strong>
                  <div class="recycle-row__meta">
                    @if (todo.deletedAt) {
                      <span>删除于 {{ formatDeletedAt(todo.deletedAt) }}</span>
                    }
                    @if (folderName(todo.folderId); as name) {
                      <span>{{ name }}</span>
                    }
                  </div>
                </div>
                <div class="recycle-row__actions">
                  <button nz-button nzType="default" (click)="restore.emit(todo)">
                    <span nz-icon nzType="rollback"></span>
                    恢复
                  </button>
                  <button nz-button nzType="text" nzDanger (click)="permanentlyDelete.emit(todo)">
                    <span nz-icon nzType="delete"></span>
                    永久删除
                  </button>
                </div>
              </article>
            </ng-container>
          </cdk-virtual-scroll-viewport>

          <div class="recycle-load-more">
            @if (loadingMore()) {
              <span>正在加载...</span>
            } @else if (hasMore()) {
              <button nz-button nzType="link" (click)="loadMore.emit()">加载更多</button>
              <span>已加载 {{ todos().length }} / {{ total() }}</span>
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
      .recycle-info {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0 16px 12px;
        padding: 8px 10px;
        border-radius: var(--border-radius-sm);
        background: rgba(245, 158, 11, 0.12);
        color: var(--text-muted);
        font-size: 13px;
      }

      .recycle-info span[nz-icon] {
        color: var(--color-warning);
      }

      .recycle-list {
        display: grid;
      }

      .recycle-scroll {
        display: grid;
      }

      .recycle-viewport {
        height: min(680px, max(260px, calc(100vh - 360px)));
      }

      .recycle-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        box-sizing: border-box;
        height: 68px;
        overflow: hidden;
        padding: 0 16px;
        border-top: 1px solid var(--border-color-soft);
      }

      .recycle-row__content {
        min-width: 0;
        overflow: hidden;
      }

      .recycle-row__content strong {
        display: block;
        min-width: 0;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .recycle-row__meta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: nowrap;
        overflow: hidden;
        margin-top: 5px;
        color: var(--text-disabled);
        font-size: 12px;
        white-space: nowrap;
      }

      .recycle-row__meta > * {
        flex: 0 0 auto;
      }

      .recycle-row__actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        white-space: nowrap;
      }

      .recycle-empty {
        min-height: 240px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 12px;
        color: var(--text-muted);
      }

      .recycle-empty__icon {
        font-size: 34px;
        color: var(--gray-300);
      }

      .recycle-load-more {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 52px;
        border-top: 1px solid var(--border-color-soft);
        color: var(--text-muted);
        font-size: 12px;
      }

      @media (max-width: 700px) {
        .recycle-row {
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
        }

        .recycle-row__actions {
          justify-self: end;
          gap: 4px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoRecycleListComponent {
  readonly todos = input.required<Todo[]>();
  readonly folders = input<TodoFolderEntity[]>([]);
  readonly folderById = input<Map<string, TodoFolderEntity>>(new Map());
  readonly total = input(0);
  readonly loadingMore = input(false);
  readonly hasMore = input(false);
  readonly restore = output<Todo>();
  readonly permanentlyDelete = output<Todo>();
  readonly emptyRecycle = output<void>();
  readonly loadMore = output<void>();

  readonly trackByTodo = (_: number, todo: Todo): string => todo.id;

  onScrolledIndexChange(index: number): void {
    if (this.todos().length - index < 16) {
      this.loadMore.emit();
    }
  }

  folderName(folderId: string | null | undefined): string | null {
    if (!folderId) {
      return null;
    }
    return this.folderById().get(folderId)?.name ?? '未知文件夹';
  }

  formatDeletedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { PageHeaderComponent } from '@shared/ui';
import { TodoBoardComponent } from '../components/todo-board.component';
import { TodoListComponent } from '../components/todo-list.component';
import { TodoRecycleListComponent } from '../components/todo-recycle-list.component';
import { TodoSidebarComponent } from '../components/todo-sidebar.component';
import { TodoStatsComponent } from '../components/todo-stats.component';
import { TodoToolbarComponent } from '../components/todo-toolbar.component';
import { TodoDialogComponent } from '../dialogs/todo-dialog.component';
import { TodoFolderManagerComponent } from '../dialogs/todo-folder-manager.component';
import { TodoTagManagerComponent } from '../dialogs/todo-tag-manager.component';
import {
  TODO_STATUS_LABELS,
  type Todo,
  type TodoDraft,
  type TodoFolderDraft,
  type TodoFolderEntity,
  type TodoStatus,
  type TodoTagDraft,
  type TodoTagEntity,
} from '../models/todo.model';
import { TodoStore } from '../stores/todo.store';

@Component({
  selector: 'app-personal-todo-page',
  imports: [
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    TodoStatsComponent,
    TodoToolbarComponent,
    TodoSidebarComponent,
    TodoListComponent,
    TodoBoardComponent,
    TodoRecycleListComponent,
    TodoDialogComponent,
    TodoFolderManagerComponent,
    TodoTagManagerComponent,
  ],
  template: `
    <app-page-header title="个人待办" subtitle="管理日常待办、截止日期和个人事项。" />

    @if (store.loadError()) {
      <div class="todo-warning">
        <span nz-icon nzType="warning"></span>
        {{ store.loadError() }}
      </div>
    }

    <section class="todo-page">
      <app-todo-stats [stats]="store.stats()" />

      <app-todo-toolbar
        [statusFilter]="store.statusFilter()"
        [priorityFilter]="store.priorityFilter()"
        [tagFilter]="store.tagFilter()"
        [keyword]="store.keyword()"
        [viewMode]="store.viewMode()"
        [groupBy]="store.groupBy()"
        [showPrimaryActions]="store.scope() !== 'recycle'"
        [tags]="store.tags()"
        (create)="openCreateDialog()"
        (manageTags)="openTagManager()"
        (manageFolders)="openFolderManager()"
        (statusFilterChange)="store.setStatusFilter($event)"
        (priorityFilterChange)="store.setPriorityFilter($event)"
        (tagFilterChange)="store.setTagFilter($event)"
        (keywordChange)="store.setKeyword($event)"
        (viewModeChange)="store.setViewMode($event)"
        (groupByChange)="store.setGroupBy($event)"
      />

      <div class="todo-layout">
        <app-todo-sidebar
          [scope]="store.scope()"
          [selectedFolderId]="store.selectedFolderId()"
          [folders]="store.folders()"
          [folderCounts]="store.folderCounts()"
          [totalCount]="store.activeTotalCount()"
          [unfiledCount]="store.unfiledCount()"
          [recycleCount]="store.recycleCount()"
          (selectAll)="store.showAll()"
          (selectFolder)="store.showFolder($event)"
          (selectRecycle)="store.showRecycle()"
          (manageFolders)="openFolderManager()"
        />

        <main class="todo-main">
        @if (store.scope() === 'recycle') {
          <app-todo-recycle-list
            [todos]="store.filteredTodos()"
            [folders]="store.folders()"
            [folderById]="store.folderById()"
            [total]="store.total()"
            [loadingMore]="store.loadingMore()"
            [hasMore]="store.hasMore()"
            (restore)="restoreTodo($event)"
            (permanentlyDelete)="confirmPermanentDelete($event)"
            (emptyRecycle)="confirmEmptyRecycle()"
            (loadMore)="store.loadMore()"
          />
        } @else if (store.viewMode() === 'list') {
          <app-todo-list
            [title]="store.currentScopeTitle()"
            [nodes]="store.todoListNodes()"
            [tags]="store.tags()"
            [folders]="store.folders()"
            [tagById]="store.tagById()"
            [folderById]="store.folderById()"
            [hasCompleted]="store.completedCount() > 0"
            [total]="store.total()"
            [loadingMore]="store.loadingMore()"
            [hasMore]="store.hasMore()"
            (clearCompleted)="confirmClearCompleted()"
            (edit)="openEditDialog($event)"
            (delete)="confirmDelete($event)"
            (toggleDone)="toggleDone($event)"
            (loadMore)="store.loadMore()"
          />
        } @else {
          <div class="todo-board-shell" (scroll)="onBoardScroll($event)">
            <div class="todo-board-note">
              当前看板已加载 {{ store.loadedCount() }} 条待办，共 {{ store.total() }} 条；极大量数据建议使用列表视图。
            </div>
            <app-todo-board
              [columns]="store.boardColumns()"
              [tags]="store.tags()"
              [folders]="store.folders()"
              [tagById]="store.tagById()"
              [folderById]="store.folderById()"
              (statusChange)="moveTodo($event.id, $event.status)"
              (edit)="openEditDialog($event)"
              (delete)="confirmDelete($event)"
            />
            <div class="todo-board-load-more">
              @if (store.loadingMore()) {
                <span>正在加载...</span>
              } @else if (store.hasMore()) {
                <button nz-button nzType="link" (click)="store.loadMore()">加载更多</button>
              } @else {
                <span>已加载全部 {{ store.total() }} 条待办</span>
              }
            </div>
          </div>
        }
        </main>
      </div>
    </section>

    <app-todo-dialog
      [visible]="dialogOpen()"
      [todo]="editingTodo()"
      [tags]="store.tags()"
      [folders]="store.folders()"
      (save)="saveTodo($event)"
      (cancel)="closeDialog()"
    />

    <app-todo-tag-manager
      [visible]="tagManagerOpen()"
      [tags]="store.tags()"
      [resetToken]="tagFormResetToken()"
      (createTag)="createTag($event)"
      (updateTag)="updateTag($event.id, $event.draft)"
      (deleteTag)="confirmDeleteTag($event)"
      (cancel)="closeTagManager()"
    />

    <app-todo-folder-manager
      [visible]="folderManagerOpen()"
      [folders]="store.folders()"
      [resetToken]="folderFormResetToken()"
      (createFolder)="createFolder($event)"
      (updateFolder)="updateFolder($event.id, $event.draft)"
      (deleteFolder)="confirmDeleteFolder($event)"
      (cancel)="closeFolderManager()"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .todo-page {
        display: grid;
        gap: 16px;
      }

      .todo-layout {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      .todo-main {
        display: grid;
        gap: 16px;
        min-width: 0;
      }

      .todo-board-shell {
        display: grid;
        gap: 12px;
        max-height: min(760px, calc(100vh - 300px));
        overflow: auto;
      }

      .todo-board-note {
        padding: 8px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 13px;
      }

      .todo-board-load-more {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        color: var(--text-muted);
        font-size: 12px;
      }

      .todo-warning {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px;
        padding: 8px 12px;
        border: 1px solid var(--color-warning);
        border-radius: var(--border-radius-sm);
        background: rgba(245, 158, 11, 0.12);
        color: var(--text-secondary);
        font-size: 13px;
      }

      .todo-warning span[nz-icon] {
        color: var(--color-warning);
      }

      @media (max-width: 900px) {
        .todo-layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalTodoPageComponent {
  readonly store = inject(TodoStore);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly dialogOpen = signal(false);
  readonly editingTodo = signal<Todo | null>(null);
  readonly tagManagerOpen = signal(false);
  readonly tagFormResetToken = signal(0);
  readonly folderManagerOpen = signal(false);
  readonly folderFormResetToken = signal(0);

  openCreateDialog(): void {
    this.editingTodo.set(null);
    this.dialogOpen.set(true);
  }

  openEditDialog(todo: Todo): void {
    this.editingTodo.set(todo);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingTodo.set(null);
  }

  openTagManager(): void {
    this.tagManagerOpen.set(true);
  }

  closeTagManager(): void {
    this.tagManagerOpen.set(false);
  }

  openFolderManager(): void {
    this.folderManagerOpen.set(true);
  }

  closeFolderManager(): void {
    this.folderManagerOpen.set(false);
  }

  saveTodo(draft: TodoDraft): void {
    const editing = this.editingTodo();
    if (editing) {
      this.store
        .update(editing.id, draft)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.message.success('待办已更新');
            this.closeDialog();
          },
          error: (error: unknown) => this.message.error(this.resolveSaveErrorMessage(error, '待办更新失败')),
        });
    } else {
      this.store
        .create(draft)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.message.success('待办创建成功');
            this.closeDialog();
          },
          error: (error: unknown) => this.message.error(this.resolveSaveErrorMessage(error, '待办创建失败')),
        });
    }
  }

  private resolveSaveErrorMessage(error: unknown, fallback: string): string {
    const message = this.extractErrorMessage(error);
    if (!message) {
      return `${fallback}，请检查描述中的图片是否已上传成功后重试`;
    }
    return `${fallback}：${message}`;
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const response = 'error' in error ? (error as { error?: unknown }).error : null;
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      return typeof message === 'string' && message.trim() ? message.trim() : null;
    }

    if ('message' in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' && message.trim() ? message.trim() : null;
    }
    return null;
  }

  toggleDone(todo: Todo): void {
    this.store
      .toggleDone(todo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (changed) => this.message.success(changed.status === 'done' ? '待办已完成' : '待办已恢复'),
        error: () => this.message.error('待办状态更新失败'),
      });
  }

  moveTodo(id: string, status: TodoStatus): void {
    this.store
      .updateStatus(id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.message.success(`待办已移至「${TODO_STATUS_LABELS[status]}」`),
        error: () => this.message.error('待办状态更新失败'),
      });
  }

  confirmDelete(todo: Todo): void {
    this.modal.confirm({
      nzTitle: '删除待办',
      nzContent: `确定删除「${todo.title}」吗？删除后可在回收站恢复。`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .delete(todo.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('待办已移入回收站'),
            error: () => this.message.error('待办删除失败'),
          });
      },
    });
  }

  confirmClearCompleted(): void {
    if (this.store.completedCount() === 0) {
      return;
    }

    this.modal.confirm({
      nzTitle: '清除已完成待办',
      nzContent: `确定清除 ${this.store.completedCount()} 条已完成待办吗？清除后可在回收站恢复。`,
      nzOkText: '清除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .clearCompleted()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('已完成待办已移入回收站'),
            error: () => this.message.error('清除已完成待办失败'),
          });
      },
    });
  }

  restoreTodo(todo: Todo): void {
    this.store
      .restore(todo.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.message.success('待办已恢复'),
        error: () => this.message.error('待办恢复失败'),
      });
  }

  confirmPermanentDelete(todo: Todo): void {
    this.modal.confirm({
      nzTitle: '永久删除待办',
      nzContent: `确定永久删除「${todo.title}」吗？此操作不可恢复。`,
      nzOkText: '永久删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .permanentlyDelete(todo.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('待办已永久删除'),
            error: () => this.message.error('待办永久删除失败'),
          });
      },
    });
  }

  confirmEmptyRecycle(): void {
    if (this.store.recycleCount() === 0) {
      return;
    }

    this.modal.confirm({
      nzTitle: '清空回收站',
      nzContent: `将永久删除回收站中的 ${this.store.recycleCount()} 条待办，此操作不可恢复。`,
      nzOkText: '清空',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .emptyRecycle()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('回收站已清空'),
            error: () => this.message.error('清空回收站失败'),
          });
      },
    });
  }

  onBoardScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
      this.store.loadMore();
    }
  }

  createTag(draft: TodoTagDraft): void {
    this.store
      .createTag(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tagFormResetToken.update((value) => value + 1);
          this.message.success('标签已创建');
        },
        error: () => this.message.error('标签创建失败'),
      });
  }

  updateTag(id: string, draft: TodoTagDraft): void {
    this.store
      .updateTag(id, draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tagFormResetToken.update((value) => value + 1);
          this.message.success('标签已更新');
        },
        error: () => this.message.error('标签更新失败'),
      });
  }

  confirmDeleteTag(tag: TodoTagEntity): void {
    this.modal.confirm({
      nzTitle: '删除标签',
      nzContent: `确定删除「${tag.name}」吗？已关联待办会自动移除此标签。`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .deleteTag(tag.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('标签已删除'),
            error: () => this.message.error('标签删除失败'),
          });
      },
    });
  }

  createFolder(draft: TodoFolderDraft): void {
    this.store
      .createFolder(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.folderFormResetToken.update((value) => value + 1);
          this.message.success('文件夹已创建');
        },
        error: () => this.message.error('文件夹创建失败'),
      });
  }

  updateFolder(id: string, draft: TodoFolderDraft): void {
    this.store
      .updateFolder(id, draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.folderFormResetToken.update((value) => value + 1);
          this.message.success('文件夹已更新');
        },
        error: () => this.message.error('文件夹更新失败'),
      });
  }

  confirmDeleteFolder(folder: TodoFolderEntity): void {
    this.modal.confirm({
      nzTitle: '删除文件夹',
      nzContent: `确定删除「${folder.name}」吗？文件夹内待办会归为未分类。`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .deleteFolder(folder.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('文件夹已删除'),
            error: () => this.message.error('文件夹删除失败'),
          });
      },
    });
  }
}

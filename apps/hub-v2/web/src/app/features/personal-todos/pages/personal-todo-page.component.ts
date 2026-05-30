import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { PageHeaderComponent } from '@shared/ui';
import { TodoBoardComponent } from '../components/todo-board.component';
import { TodoListComponent } from '../components/todo-list.component';
import { TodoStatsComponent } from '../components/todo-stats.component';
import { TodoToolbarComponent } from '../components/todo-toolbar.component';
import { TodoDialogComponent } from '../dialogs/todo-dialog.component';
import { TodoTagManagerComponent } from '../dialogs/todo-tag-manager.component';
import {
  TODO_STATUS_LABELS,
  type Todo,
  type TodoDraft,
  type TodoStatus,
  type TodoTagDraft,
  type TodoTagEntity,
} from '../models/todo.model';
import { TodoStore } from '../stores/todo.store';

@Component({
  selector: 'app-personal-todo-page',
  imports: [
    PageHeaderComponent,
    NzIconModule,
    TodoStatsComponent,
    TodoToolbarComponent,
    TodoListComponent,
    TodoBoardComponent,
    TodoDialogComponent,
    TodoTagManagerComponent,
  ],
  template: `
    <app-page-header title="个人待办" subtitle="管理日常待办、截止日期和个人事项。" />

    @if (store.loadError()) {
      <div class="todo-warning" [class.todo-warning--cache]="store.cacheFallback()">
        <span nz-icon nzType="warning"></span>
        {{ store.loadError() }}
      </div>
    }

    <app-todo-stats [stats]="store.stats()" />

    <app-todo-toolbar
      [statusFilter]="store.statusFilter()"
      [priorityFilter]="store.priorityFilter()"
      [tagFilter]="store.tagFilter()"
      [keyword]="store.keyword()"
      [viewMode]="store.viewMode()"
      [tags]="store.tags()"
      (create)="openCreateDialog()"
      (manageTags)="openTagManager()"
      (statusFilterChange)="store.setStatusFilter($event)"
      (priorityFilterChange)="store.setPriorityFilter($event)"
      (tagFilterChange)="store.setTagFilter($event)"
      (keywordChange)="store.setKeyword($event)"
      (viewModeChange)="store.setViewMode($event)"
    />

    @if (store.viewMode() === 'list') {
      <app-todo-list
        [todos]="store.filteredTodos()"
        [tags]="store.tags()"
        [hasCompleted]="store.completedCount() > 0"
        (clearCompleted)="confirmClearCompleted()"
        (edit)="openEditDialog($event)"
        (delete)="confirmDelete($event)"
        (toggleDone)="toggleDone($event)"
      />
    } @else {
      <app-todo-board
        [columns]="store.boardColumns()"
        [tags]="store.tags()"
        (statusChange)="moveTodo($event.id, $event.status)"
        (edit)="openEditDialog($event)"
        (delete)="confirmDelete($event)"
      />
    }

    <app-todo-dialog
      [visible]="dialogOpen()"
      [todo]="editingTodo()"
      [tags]="store.tags()"
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
  `,
  styles: [
    `
      :host {
        display: block;
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
          error: () => this.message.error('待办更新失败'),
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
          error: () => this.message.error('待办创建失败'),
        });
    }
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
      nzContent: `确定删除「${todo.title}」吗？此操作不可恢复。`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .delete(todo.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('待办已删除'),
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
      nzContent: `确定清除 ${this.store.completedCount()} 条已完成待办吗？`,
      nzOkText: '清除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store
          .clearCompleted()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.message.info('已清除已完成待办'),
            error: () => this.message.error('清除已完成待办失败'),
          });
      },
    });
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
}

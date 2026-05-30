import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import {
  TODO_STATUS_LABELS,
  type Todo,
  type TodoBoardColumn,
  type TodoDraft,
  type TodoPriority,
  type TodoPriorityFilter,
  type TodoSnapshot,
  type TodoStats,
  type TodoStatus,
  type TodoStatusFilter,
  type TodoTagDraft,
  type TodoTagEntity,
  type TodoTagFilter,
  type TodoViewMode,
} from '../models/todo.model';
import { TodoService } from '../services/todo.service';

const STATUS_ORDER: Record<TodoStatus, number> = {
  doing: 0,
  todo: 1,
  done: 2,
};

const PRIORITY_ORDER: Record<TodoPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly service = inject(TodoService);
  private readonly todosState = signal<Todo[]>([]);
  private readonly tagsState = signal<TodoTagEntity[]>([]);

  readonly loading = signal(false);
  readonly cacheFallback = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly statusFilter = signal<TodoStatusFilter>('all');
  readonly priorityFilter = signal<TodoPriorityFilter>('all');
  readonly tagFilter = signal<TodoTagFilter>('all');
  readonly keyword = signal('');
  readonly viewMode = signal<TodoViewMode>('list');

  readonly todos = computed(() => this.todosState());
  readonly tags = computed(() => this.tagsState());
  readonly tagById = computed(() => new Map(this.tagsState().map((tag) => [tag.id, tag])));
  readonly unfinishedCount = computed(() => this.todosState().filter((todo) => todo.status !== 'done').length);
  readonly completedCount = computed(() => this.todosState().filter((todo) => todo.status === 'done').length);
  readonly stats = computed<TodoStats>(() => {
    const todos = this.todosState();
    return {
      total: todos.length,
      doing: todos.filter((todo) => todo.status === 'doing').length,
      done: todos.filter((todo) => todo.status === 'done').length,
      overdue: todos.filter((todo) => this.isOverdue(todo)).length,
    };
  });
  readonly filteredTodos = computed(() => this.sortTodos(this.filterTodos(this.todosState())));
  readonly boardColumns = computed<TodoBoardColumn[]>(() => {
    const filtered = this.filteredTodos();
    return (['todo', 'doing', 'done'] as TodoStatus[]).map((status) => ({
      status,
      label: TODO_STATUS_LABELS[status],
      items: filtered.filter((todo) => todo.status === status),
    }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.loadSnapshot().subscribe({
      next: (snapshot) => {
        this.applySnapshot(snapshot);
        this.cacheFallback.set(false);
        this.loading.set(false);
      },
      error: () => {
        const cached = this.service.readCachedSnapshot();
        if (cached) {
          this.setSnapshot(cached);
          this.cacheFallback.set(true);
          this.loadError.set('当前显示缓存数据');
        } else {
          this.cacheFallback.set(false);
          this.loadError.set('个人待办加载失败');
        }
        this.loading.set(false);
      },
    });
  }

  setStatusFilter(value: TodoStatusFilter): void {
    this.statusFilter.set(value);
  }

  setPriorityFilter(value: TodoPriorityFilter): void {
    this.priorityFilter.set(value);
  }

  setTagFilter(value: TodoTagFilter): void {
    this.tagFilter.set(value);
  }

  setKeyword(value: string): void {
    this.keyword.set(value);
  }

  setViewMode(value: TodoViewMode): void {
    this.viewMode.set(value);
  }

  create(draft: TodoDraft): Observable<Todo> {
    return this.service.create(draft).pipe(
      switchMap((todo) => this.syncAfterWrite(todo, () => this.commitTodos([todo, ...this.todosState()])))
    );
  }

  update(id: string, draft: TodoDraft): Observable<Todo> {
    return this.service.update(id, draft).pipe(
      switchMap((updated) =>
        this.syncAfterWrite(updated, () => this.commitTodos(this.todosState().map((todo) => (todo.id === id ? updated : todo))))
      )
    );
  }

  delete(id: string): Observable<{ id: string }> {
    return this.service.delete(id).pipe(
      switchMap((result) => this.syncAfterWrite(result, () => this.commitTodos(this.todosState().filter((todo) => todo.id !== id))))
    );
  }

  clearCompleted(): Observable<{ deleted: number }> {
    return this.service.clearCompleted().pipe(
      switchMap((result) => this.syncAfterWrite(result, () => this.commitTodos(this.todosState().filter((todo) => todo.status !== 'done'))))
    );
  }

  toggleDone(todo: Todo): Observable<Todo> {
    const status: TodoStatus = todo.status === 'done' ? 'todo' : 'done';
    return this.updateStatus(todo.id, status);
  }

  updateStatus(id: string, status: TodoStatus): Observable<Todo> {
    return this.service.updateStatus(id, status).pipe(
      switchMap((updated) =>
        this.syncAfterWrite(updated, () => this.commitTodos(this.todosState().map((todo) => (todo.id === id ? updated : todo))))
      )
    );
  }

  createTag(draft: TodoTagDraft): Observable<TodoTagEntity> {
    return this.service.createTag(draft).pipe(
      switchMap((tag) => this.syncAfterWrite(tag, () => this.commitTags([...this.tagsState(), tag].sort((a, b) => a.sortOrder - b.sortOrder))))
    );
  }

  updateTag(id: string, draft: TodoTagDraft): Observable<TodoTagEntity> {
    return this.service.updateTag(id, draft).pipe(
      switchMap((updated) => this.syncAfterWrite(updated, () => this.commitTags(this.tagsState().map((tag) => (tag.id === id ? updated : tag)))))
    );
  }

  deleteTag(id: string): Observable<{ id: string }> {
    return this.service.deleteTag(id).pipe(
      switchMap((result) => this.syncAfterWrite(result, () => {
        this.tagsState.set(this.tagsState().filter((tag) => tag.id !== id));
        this.todosState.set(this.todosState().map((todo) => ({ ...todo, tagIds: todo.tagIds.filter((tagId) => tagId !== id) })));
        if (this.tagFilter() === id) {
          this.tagFilter.set('all');
        }
        this.writeCache();
      }))
    );
  }

  isOverdue(todo: Todo): boolean {
    return !!todo.due && todo.due < this.service.todayIso() && todo.status !== 'done';
  }

  private filterTodos(todos: Todo[]): Todo[] {
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const tag = this.tagFilter();
    const keyword = this.keyword().trim().toLowerCase();

    return todos.filter((todo) => {
      if (status !== 'all' && todo.status !== status) {
        return false;
      }
      if (priority !== 'all' && todo.priority !== priority) {
        return false;
      }
      if (tag !== 'all' && !todo.tagIds.includes(tag)) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return `${todo.title} ${todo.desc ?? ''}`.toLowerCase().includes(keyword);
    });
  }

  private sortTodos(todos: Todo[]): Todo[] {
    return [...todos].sort((left, right) => {
      const statusDiff = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const priorityDiff = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftDue = left.due || '9999-12-31';
      const rightDue = right.due || '9999-12-31';
      return leftDue.localeCompare(rightDue);
    });
  }

  private applySnapshot(snapshot: TodoSnapshot): void {
    this.setSnapshot(snapshot);
    this.cacheFallback.set(false);
    this.loadError.set(null);
    this.writeCache();
  }

  private setSnapshot(snapshot: TodoSnapshot): void {
    this.todosState.set(snapshot.todos);
    this.tagsState.set(snapshot.tags);
  }

  private commitTodos(todos: Todo[]): void {
    this.todosState.set(todos);
    this.cacheFallback.set(false);
    this.writeCache();
  }

  private commitTags(tags: TodoTagEntity[]): void {
    this.tagsState.set(tags);
    this.cacheFallback.set(false);
    this.writeCache();
  }

  private writeCache(): void {
    this.service.writeCachedSnapshot({
      todos: this.todosState(),
      tags: this.tagsState(),
    });
  }

  private syncAfterWrite<T>(value: T, localCommit: () => void): Observable<T> {
    if (!this.cacheFallback()) {
      localCommit();
      return of(value);
    }

    return this.service.loadSnapshot().pipe(
      tap((snapshot) => this.applySnapshot(snapshot)),
      map(() => value),
      catchError(() => {
        this.loadError.set('当前显示缓存数据');
        return of(value);
      })
    );
  }
}

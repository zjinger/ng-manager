import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  type Todo,
  type TodoBoardColumn,
  type TodoDraft,
  type TodoFolderDraft,
  type TodoFolderEntity,
  type TodoGroup,
  type TodoGroupBy,
  type TodoListNode,
  type TodoPage,
  type TodoPageQuery,
  type TodoPriority,
  type TodoPriorityFilter,
  type TodoScope,
  type TodoStats,
  type TodoStatus,
  type TodoStatusFilter,
  type TodoTagDraft,
  type TodoTagEntity,
  type TodoTagFilter,
  type TodoViewMode,
} from '../models/todo.model';
import { TodoService } from '../services/todo.service';

const EMPTY_STATS: TodoStats = {
  total: 0,
  doing: 0,
  done: 0,
  overdue: 0,
};

const DUE_GROUP_LABELS: Record<string, string> = {
  overdue: '逾期',
  today: '今天',
  tomorrow: '明天',
  future: '未来',
  none: '无截止日期',
};

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly service = inject(TodoService);
  private readonly itemsState = signal<Todo[]>([]);
  private readonly tagsState = signal<TodoTagEntity[]>([]);
  private readonly foldersState = signal<TodoFolderEntity[]>([]);
  private readonly statsState = signal<TodoStats>(EMPTY_STATS);
  private readonly folderCountsState = signal<Record<string, number>>({});
  private readonly unfiledCountState = signal(0);
  private readonly recycleCountState = signal(0);
  private readonly unfinishedCountState = signal(0);
  private readonly totalState = signal(0);
  private readonly pageState = signal(1);
  private readonly pageSizeState = signal(50);
  private queryVersion = 0;
  private keywordLoadTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly statusFilter = signal<TodoStatusFilter>('all');
  readonly priorityFilter = signal<TodoPriorityFilter>('all');
  readonly tagFilter = signal<TodoTagFilter>('all');
  readonly keyword = signal('');
  readonly viewMode = signal<TodoViewMode>('list');
  readonly scope = signal<TodoScope>('all');
  readonly selectedFolderId = signal<string | null>(null);
  readonly groupBy = signal<TodoGroupBy>('status');

  readonly todos = computed(() => this.itemsState());
  readonly tags = computed(() => this.tagsState());
  readonly folders = computed(() => this.foldersState());
  readonly tagById = computed(() => new Map(this.tagsState().map((tag) => [tag.id, tag])));
  readonly folderById = computed(() => new Map(this.foldersState().map((folder) => [folder.id, folder])));
  readonly unfinishedCount = computed(() => this.unfinishedCountState());
  readonly completedCount = computed(() => this.statsState().done);
  readonly recycleCount = computed(() => this.recycleCountState());
  readonly folderCounts = computed(() => new Map(Object.entries(this.folderCountsState())));
  readonly unfiledCount = computed(() => this.unfiledCountState());
  readonly activeTotalCount = computed(() => {
    let total = this.unfiledCountState();
    for (const count of Object.values(this.folderCountsState())) {
      total += count;
    }
    return total;
  });
  readonly total = computed(() => this.totalState());
  readonly page = computed(() => this.pageState());
  readonly pageSize = computed(() => this.pageSizeState());
  readonly loadedCount = computed(() => this.itemsState().length);
  readonly hasMore = computed(() => this.itemsState().length < this.totalState());
  readonly stats = computed<TodoStats>(() => this.statsState());
  readonly currentScopeTitle = computed(() => {
    if (this.scope() === 'recycle') {
      return '回收站';
    }
    const folderId = this.selectedFolderId();
    if (this.scope() === 'folder' && folderId) {
      return this.folderById().get(folderId)?.name ?? '文件夹';
    }
    if (this.scope() === 'folder') {
      return '未分类';
    }
    return '全部待办';
  });
  readonly filteredTodos = computed(() => this.itemsState());
  readonly todoGroups = computed<TodoGroup[]>(() => this.buildGroups(this.itemsState()));
  readonly todoListNodes = computed<TodoListNode[]>(() => this.buildListNodes(this.todoGroups()));
  readonly boardColumns = computed<TodoBoardColumn[]>(() => {
    const filtered = this.itemsState();
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
    const version = this.resetQueryVersion();
    this.loading.set(true);
    this.loadingMore.set(false);
    this.loadError.set(null);
    this.service.loadSnapshot(this.buildQuery()).subscribe({
      next: (page) => {
        if (!this.isCurrentVersion(version)) {
          return;
        }
        this.applyPage(page, false);
        this.loading.set(false);
      },
      error: () => {
        if (!this.isCurrentVersion(version)) {
          return;
        }
        this.loadError.set('个人待办加载失败');
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadingMore.set(true);
    this.loadError.set(null);
    this.pageState.update((page) => page + 1);
    const version = this.queryVersion;
    this.service.loadSnapshot(this.buildQuery()).subscribe({
      next: (page) => {
        if (!this.isCurrentVersion(version)) {
          return;
        }
        this.applyPage(page, true);
        this.loadingMore.set(false);
      },
      error: () => {
        if (!this.isCurrentVersion(version)) {
          return;
        }
        this.pageState.update((page) => Math.max(1, page - 1));
        this.loadError.set('更多待办加载失败');
        this.loadingMore.set(false);
      },
    });
  }

  setStatusFilter(value: TodoStatusFilter): void {
    this.statusFilter.set(value);
    this.reloadFirstPage();
  }

  setPriorityFilter(value: TodoPriorityFilter): void {
    this.priorityFilter.set(value);
    this.reloadFirstPage();
  }

  setTagFilter(value: TodoTagFilter): void {
    this.tagFilter.set(value);
    this.reloadFirstPage();
  }

  setKeyword(value: string): void {
    this.keyword.set(value);
    if (this.keywordLoadTimer) {
      clearTimeout(this.keywordLoadTimer);
    }
    this.keywordLoadTimer = setTimeout(() => this.reloadFirstPage(), 250);
  }

  setViewMode(value: TodoViewMode): void {
    this.viewMode.set(value);
  }

  setGroupBy(value: TodoGroupBy): void {
    this.groupBy.set(value);
    this.reloadFirstPage();
  }

  setPage(page: number): void {
    this.pageState.set(Math.max(1, page));
    this.loadSnapshotPage(false);
  }

  setPageSize(pageSize: number): void {
    this.pageSizeState.set(pageSize);
    this.reloadFirstPage();
  }

  showAll(): void {
    this.scope.set('all');
    this.selectedFolderId.set(null);
    this.reloadFirstPage();
  }

  showFolder(folderId: string | null): void {
    this.scope.set('folder');
    this.selectedFolderId.set(folderId);
    this.reloadFirstPage();
  }

  showRecycle(): void {
    this.scope.set('recycle');
    this.selectedFolderId.set(null);
    this.viewMode.set('list');
    this.reloadFirstPage();
  }

  create(draft: TodoDraft): Observable<Todo> {
    return this.service.create(draft).pipe(
      switchMap((todo) => {
        this.pageState.set(1);
        return this.refreshAfterWrite(todo);
      })
    );
  }

  update(id: string, draft: TodoDraft): Observable<Todo> {
    return this.service.update(id, draft).pipe(switchMap((updated) => this.refreshAfterWrite(updated)));
  }

  delete(id: string): Observable<{ id: string }> {
    return this.service.delete(id).pipe(switchMap((result) => this.refreshAfterWrite(result, true)));
  }

  clearCompleted(): Observable<{ deleted: number }> {
    return this.service.clearCompleted().pipe(switchMap((result) => this.refreshAfterWrite(result, true)));
  }

  restore(id: string): Observable<Todo> {
    return this.service.restore(id).pipe(switchMap((restored) => this.refreshAfterWrite(restored, true)));
  }

  permanentlyDelete(id: string): Observable<{ id: string }> {
    return this.service.permanentlyDelete(id).pipe(switchMap((result) => this.refreshAfterWrite(result, true)));
  }

  emptyRecycle(): Observable<{ deleted: number }> {
    return this.service.emptyRecycle().pipe(switchMap((result) => this.refreshAfterWrite(result, true)));
  }

  toggleDone(todo: Todo): Observable<Todo> {
    const status: TodoStatus = todo.status === 'done' ? 'todo' : 'done';
    return this.updateStatus(todo.id, status);
  }

  updateStatus(id: string, status: TodoStatus): Observable<Todo> {
    return this.service.updateStatus(id, status).pipe(switchMap((updated) => this.refreshAfterWrite(updated)));
  }

  createTag(draft: TodoTagDraft): Observable<TodoTagEntity> {
    return this.service.createTag(draft).pipe(switchMap((tag) => this.refreshAfterWrite(tag)));
  }

  updateTag(id: string, draft: TodoTagDraft): Observable<TodoTagEntity> {
    return this.service.updateTag(id, draft).pipe(switchMap((tag) => this.refreshAfterWrite(tag)));
  }

  deleteTag(id: string): Observable<{ id: string }> {
    return this.service.deleteTag(id).pipe(
      switchMap((result) => {
        if (this.tagFilter() === id) {
          this.tagFilter.set('all');
          this.pageState.set(1);
        }
        return this.refreshAfterWrite(result);
      })
    );
  }

  createFolder(draft: TodoFolderDraft): Observable<TodoFolderEntity> {
    return this.service.createFolder(draft).pipe(switchMap((folder) => this.refreshAfterWrite(folder)));
  }

  updateFolder(id: string, draft: TodoFolderDraft): Observable<TodoFolderEntity> {
    return this.service.updateFolder(id, draft).pipe(switchMap((folder) => this.refreshAfterWrite(folder)));
  }

  deleteFolder(id: string): Observable<{ id: string }> {
    return this.service.deleteFolder(id).pipe(
      switchMap((result) => {
        if (this.selectedFolderId() === id) {
          this.scope.set('all');
          this.selectedFolderId.set(null);
          this.pageState.set(1);
        }
        return this.refreshAfterWrite(result, true);
      })
    );
  }

  isOverdue(todo: Todo): boolean {
    return !!todo.due && todo.due < this.service.todayIso() && todo.status !== 'done';
  }

  folderLabel(folderId: string | null | undefined): string {
    if (!folderId) {
      return '未分类';
    }
    return this.folderById().get(folderId)?.name ?? '未知文件夹';
  }

  private reloadFirstPage(): void {
    this.loadSnapshotPage(false, this.resetQueryVersion());
  }

  private buildQuery(): TodoPageQuery {
    const scope = this.scope() === 'recycle' ? 'recycle' : 'active';
    const folderId = this.scope() === 'folder'
      ? this.selectedFolderId() ?? 'none'
      : 'all';
    return {
      scope,
      page: this.pageState(),
      pageSize: this.pageSizeState(),
      status: scope === 'recycle' ? 'all' : this.statusFilter(),
      priority: scope === 'recycle' ? 'all' : this.priorityFilter(),
      tagId: scope === 'recycle' ? 'all' : this.tagFilter(),
      folderId,
      keyword: this.keyword().trim(),
      groupBy: this.groupBy(),
    };
  }

  private buildGroups(todos: Todo[]): TodoGroup[] {
    const groupBy = this.groupBy();
    if (groupBy === 'none' || this.scope() === 'recycle') {
      return [{ key: 'all', label: this.scope() === 'recycle' ? '回收站' : '全部待办', items: todos }];
    }

    const groups = new Map<string, Todo[]>();
    for (const todo of todos) {
      const key = this.groupKey(todo, groupBy);
      const list = groups.get(key);
      if (list) {
        list.push(todo);
      } else {
        groups.set(key, [todo]);
      }
    }

    return this.groupOrder(groupBy)
      .filter((key) => groups.has(key))
      .map((key) => ({ key, label: this.groupLabel(key, groupBy), items: groups.get(key) ?? [] }));
  }

  private buildListNodes(groups: TodoGroup[]): TodoListNode[] {
    const showHeaders = groups.length > 1 || groups[0]?.key !== 'all';
    const nodes: TodoListNode[] = [];
    for (const group of groups) {
      if (showHeaders) {
        nodes.push({
          id: `group:${group.key}`,
          type: 'group',
          label: group.label,
          count: group.items.length,
        });
      }
      for (const todo of group.items) {
        nodes.push({
          id: `todo:${todo.id}`,
          type: 'todo',
          todo,
        });
      }
    }
    return nodes;
  }

  private groupKey(todo: Todo, groupBy: TodoGroupBy): string {
    if (groupBy === 'status') {
      return todo.status;
    }
    if (groupBy === 'priority') {
      return todo.priority;
    }
    if (groupBy === 'folder') {
      return todo.folderId || '__none__';
    }
    if (groupBy === 'due') {
      return this.dueGroupKey(todo);
    }
    return 'all';
  }

  private groupLabel(key: string, groupBy: TodoGroupBy): string {
    if (groupBy === 'status') {
      return TODO_STATUS_LABELS[key as TodoStatus];
    }
    if (groupBy === 'priority') {
      return TODO_PRIORITY_LABELS[key as TodoPriority];
    }
    if (groupBy === 'folder') {
      return key === '__none__' ? '未分类' : this.folderLabel(key);
    }
    if (groupBy === 'due') {
      return DUE_GROUP_LABELS[key] ?? key;
    }
    return '全部待办';
  }

  private groupOrder(groupBy: TodoGroupBy): string[] {
    if (groupBy === 'status') {
      return ['doing', 'todo', 'done'];
    }
    if (groupBy === 'priority') {
      return ['critical', 'high', 'medium', 'low'];
    }
    if (groupBy === 'folder') {
      return [...this.foldersState().map((folder) => folder.id), '__none__'];
    }
    if (groupBy === 'due') {
      return ['overdue', 'today', 'tomorrow', 'future', 'none'];
    }
    return ['all'];
  }

  private dueGroupKey(todo: Todo): string {
    if (!todo.due) {
      return 'none';
    }
    const diff = this.diffDays(todo.due, this.service.todayIso());
    if (diff < 0 && todo.status !== 'done') {
      return 'overdue';
    }
    if (diff === 0) {
      return 'today';
    }
    if (diff === 1) {
      return 'tomorrow';
    }
    return 'future';
  }

  private applyPage(page: TodoPage, append: boolean): void {
    this.setPageState(page, append);
    this.loadError.set(null);
  }

  private setPageState(page: TodoPage, append = false): void {
    this.itemsState.set(append ? this.mergeTodos(this.itemsState(), page.items) : page.items);
    this.tagsState.set(page.tags);
    this.foldersState.set(page.folders);
    this.statsState.set(page.stats);
    this.folderCountsState.set(page.folderCounts);
    this.unfiledCountState.set(page.unfiledCount);
    this.recycleCountState.set(page.recycleCount);
    this.unfinishedCountState.set(page.unfinishedCount);
    this.totalState.set(page.total);
    this.pageState.set(page.page);
    this.pageSizeState.set(page.pageSize);
  }

  private refreshAfterWrite<T>(value: T, _allowPageBackoff = false): Observable<T> {
    const version = this.resetQueryVersion();
    return this.service.loadSnapshot(this.buildQuery()).pipe(
      tap((page) => {
        if (this.isCurrentVersion(version)) {
          this.applyPage(page, false);
        }
      }),
      map(() => value),
      catchError(() => {
        this.loadError.set('个人待办刷新失败');
        return of(value);
      })
    );
  }

  private loadSnapshotPage(append: boolean, version = this.queryVersion): void {
    this.loading.set(!append);
    this.loadingMore.set(append);
    this.loadError.set(null);
    this.service.loadSnapshot(this.buildQuery()).subscribe({
      next: (page) => {
        if (!this.isCurrentVersion(version)) {
          return;
        }
        this.applyPage(page, append);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        if (!this.isCurrentVersion(version)) {
          return;
        }
        this.loadError.set(append ? '更多待办加载失败' : '个人待办加载失败');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  private mergeTodos(current: Todo[], next: Todo[]): Todo[] {
    const existing = new Set(current.map((todo) => todo.id));
    const merged = [...current];
    for (const todo of next) {
      if (!existing.has(todo.id)) {
        merged.push(todo);
      }
    }
    return merged;
  }

  private resetQueryVersion(): number {
    this.pageState.set(1);
    this.loadingMore.set(false);
    this.queryVersion += 1;
    return this.queryVersion;
  }

  private isCurrentVersion(version: number): boolean {
    return version === this.queryVersion;
  }

  private diffDays(leftIso: string, rightIso: string): number {
    const left = Date.parse(`${leftIso}T00:00:00`);
    const right = Date.parse(`${rightIso}T00:00:00`);
    return Math.round((left - right) / 86_400_000);
  }
}

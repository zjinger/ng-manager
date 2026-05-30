import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http/api-client.service';
import {
  TODO_CACHE_KEY,
  TODO_TAG_COLORS,
  type Todo,
  type TodoDraft,
  type TodoPriority,
  type TodoSnapshot,
  type TodoStatus,
  type TodoTagColor,
  type TodoTagDraft,
  type TodoTagEntity,
} from '../models/todo.model';

const PRIORITIES: TodoPriority[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: TodoStatus[] = ['todo', 'doing', 'done'];
const TAG_COLORS = TODO_TAG_COLORS.map((item) => item.value);

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly api = inject(ApiClientService);

  loadSnapshot(): Observable<TodoSnapshot> {
    return this.api.get<TodoSnapshot>('/personal-todos');
  }

  create(draft: TodoDraft): Observable<Todo> {
    return this.api.post<Todo, TodoDraft>('/personal-todos', this.normalizeDraft(draft));
  }

  update(id: string, draft: TodoDraft): Observable<Todo> {
    return this.api.patch<Todo, TodoDraft>(`/personal-todos/${id}`, this.normalizeDraft(draft));
  }

  updateStatus(id: string, status: TodoStatus): Observable<Todo> {
    return this.api.patch<Todo, { status: TodoStatus }>(`/personal-todos/${id}/status`, { status });
  }

  delete(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/personal-todos/${id}`);
  }

  clearCompleted(): Observable<{ deleted: number }> {
    return this.api.delete<{ deleted: number }>('/personal-todos/completed');
  }

  createTag(draft: TodoTagDraft): Observable<TodoTagEntity> {
    return this.api.post<TodoTagEntity, TodoTagDraft>('/personal-todo-tags', this.normalizeTagDraft(draft));
  }

  updateTag(id: string, draft: TodoTagDraft): Observable<TodoTagEntity> {
    return this.api.patch<TodoTagEntity, Partial<TodoTagDraft>>(`/personal-todo-tags/${id}`, this.normalizeTagDraft(draft));
  }

  deleteTag(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/personal-todo-tags/${id}`);
  }

  readCachedSnapshot(): TodoSnapshot | null {
    try {
      const raw = localStorage.getItem(TODO_CACHE_KEY);
      if (!raw) {
        return null;
      }
      return this.normalizeSnapshot(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  writeCachedSnapshot(snapshot: TodoSnapshot): void {
    try {
      localStorage.setItem(TODO_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage can be unavailable in restricted browser modes.
    }
  }

  normalizeTitle(value: string): string {
    return this.normalizeText(value, 100);
  }

  normalizeOptionalText(value: string | undefined, maxLength: number): string | undefined {
    const normalized = this.normalizeMarkdownText(value ?? '', maxLength);
    return normalized || undefined;
  }

  todayIso(): string {
    return this.toIsoDate(new Date());
  }

  private normalizeDraft(draft: TodoDraft): TodoDraft {
    return {
      title: this.normalizeTitle(draft.title),
      desc: this.normalizeOptionalText(draft.desc, 500),
      priority: draft.priority,
      status: draft.status,
      due: draft.due || null,
      tagIds: this.normalizeIds(draft.tagIds),
    };
  }

  private normalizeTagDraft(draft: TodoTagDraft): TodoTagDraft {
    return {
      name: this.normalizeText(draft.name, 24),
      color: draft.color,
    };
  }

  private normalizeSnapshot(value: unknown): TodoSnapshot | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const record = value as Record<string, unknown>;
    const todos = Array.isArray(record['todos'])
      ? record['todos'].map((item) => this.normalizeTodo(item)).filter((item): item is Todo => !!item)
      : [];
    const tags = Array.isArray(record['tags'])
      ? record['tags'].map((item) => this.normalizeTag(item)).filter((item): item is TodoTagEntity => !!item)
      : [];
    return { todos, tags };
  }

  private normalizeTodo(value: unknown): Todo | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const record = value as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] : '';
    const title = typeof record['title'] === 'string' ? this.normalizeTitle(record['title']) : '';
    const priority = record['priority'];
    const status = record['status'];
    const createdAt = typeof record['createdAt'] === 'string' ? record['createdAt'] : '';
    if (!id || !title || !this.isPriority(priority) || !this.isStatus(status) || !createdAt) {
      return null;
    }
    return {
      id,
      title,
      desc: typeof record['desc'] === 'string' ? this.normalizeOptionalText(record['desc'], 500) : undefined,
      priority,
      status,
      due: typeof record['due'] === 'string' && record['due'] ? record['due'] : null,
      tagIds: Array.isArray(record['tagIds']) ? this.normalizeIds(record['tagIds']) : [],
      createdAt,
      updatedAt: typeof record['updatedAt'] === 'string' ? record['updatedAt'] : undefined,
    };
  }

  private normalizeTag(value: unknown): TodoTagEntity | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const record = value as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] : '';
    const name = typeof record['name'] === 'string' ? this.normalizeText(record['name'], 24) : '';
    const color = record['color'];
    if (!id || !name || !this.isTagColor(color)) {
      return null;
    }
    return {
      id,
      name,
      color,
      sortOrder: typeof record['sortOrder'] === 'number' ? record['sortOrder'] : 0,
      createdAt: typeof record['createdAt'] === 'string' ? record['createdAt'] : '',
      updatedAt: typeof record['updatedAt'] === 'string' ? record['updatedAt'] : '',
    };
  }

  private normalizeText(value: string, maxLength: number): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  private normalizeMarkdownText(value: string, maxLength: number): string {
    return value.replace(/\r\n?/g, '\n').trim().slice(0, maxLength);
  }

  private normalizeIds(values: unknown[]): string[] {
    return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && !!value.trim())));
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isPriority(value: unknown): value is TodoPriority {
    return typeof value === 'string' && PRIORITIES.includes(value as TodoPriority);
  }

  private isStatus(value: unknown): value is TodoStatus {
    return typeof value === 'string' && STATUSES.includes(value as TodoStatus);
  }

  private isTagColor(value: unknown): value is TodoTagColor {
    return typeof value === 'string' && TAG_COLORS.includes(value as TodoTagColor);
  }
}

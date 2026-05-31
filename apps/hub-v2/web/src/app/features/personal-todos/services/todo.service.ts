import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http/api-client.service';
import {
  type TodoFolderDraft,
  type TodoFolderEntity,
  type Todo,
  type TodoDraft,
  type TodoPage,
  type TodoPageQuery,
  type TodoStatus,
  type TodoTagDraft,
  type TodoTagEntity,
} from '../models/todo.model';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly api = inject(ApiClientService);

  loadSnapshot(query: TodoPageQuery): Observable<TodoPage> {
    return this.api.get<TodoPage>('/personal-todos', query);
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

  restore(id: string): Observable<Todo> {
    return this.api.patch<Todo, Record<string, never>>(`/personal-todos/${id}/restore`, {});
  }

  permanentlyDelete(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/personal-todos/${id}/permanent`);
  }

  emptyRecycle(): Observable<{ deleted: number }> {
    return this.api.delete<{ deleted: number }>('/personal-todos/recycle');
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

  createFolder(draft: TodoFolderDraft): Observable<TodoFolderEntity> {
    return this.api.post<TodoFolderEntity, TodoFolderDraft>('/personal-todo-folders', this.normalizeFolderDraft(draft));
  }

  updateFolder(id: string, draft: TodoFolderDraft): Observable<TodoFolderEntity> {
    return this.api.patch<TodoFolderEntity, Partial<TodoFolderDraft>>(`/personal-todo-folders/${id}`, this.normalizeFolderDraft(draft));
  }

  deleteFolder(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/personal-todo-folders/${id}`);
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
      folderId: draft.folderId || null,
      tagIds: this.normalizeIds(draft.tagIds),
    };
  }

  private normalizeTagDraft(draft: TodoTagDraft): TodoTagDraft {
    return {
      name: this.normalizeText(draft.name, 24),
      color: draft.color,
    };
  }

  private normalizeFolderDraft(draft: TodoFolderDraft): TodoFolderDraft {
    return {
      name: this.normalizeText(draft.name, 24),
      color: draft.color,
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
}

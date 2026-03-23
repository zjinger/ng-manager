import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Inject, Injectable, signal, untracked } from '@angular/core';

import { ProjectContextStore } from '../../../core/state/project-context.store';
import type { NotificationItem } from '../models/notification.model';
import { NotificationApiService, type NotificationListQuery } from '../services/notification-api.service';

const STORAGE_KEY = 'hub-v2-notifications-read';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly api = inject(NotificationApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly itemsState = signal<NotificationItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly readIdsState = signal<string[]>([]);
  private readonly queryState = signal<NotificationListQuery>({ limit: 50 });
  private readonly unreadOnlyState = signal(false);

  readonly items = computed(() => this.itemsState());
  readonly query = computed(() => this.queryState());
  readonly loading = computed(() => this.loadingState());
  readonly unreadOnly = computed(() => this.unreadOnlyState());
  readonly filteredItems = computed(() =>
    this.unreadOnlyState() ? this.itemsState().filter((item) => item.unread) : this.itemsState()
  );
  readonly unreadCount = computed(() => this.itemsState().filter((item) => item.unread).length);

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const raw = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) {
          this.readIdsState.set(ids.filter((item) => typeof item === 'string'));
        }
      } catch {}
    }

    effect(() => {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.readIdsState()));
    });

    effect(() => {
      this.projectContext.currentProjectId();
      untracked(() => this.load());
    });
  }

  load(query?: NotificationListQuery): void {
    const nextQuery = query ? { ...this.queryState(), ...query } : this.queryState();
    if (query) {
      this.queryState.set(nextQuery);
    }
    this.loadingState.set(true);
    this.api.list(nextQuery).subscribe({
      next: (result) => {
        const readIds = new Set(this.readIdsState());
        this.itemsState.set(result.items.map((item) => ({ ...item, unread: !readIds.has(item.id) })));
        this.loadingState.set(false);
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }

  markAllAsRead(): void {
    const ids = this.itemsState().map((item) => item.id);
    this.readIdsState.set(Array.from(new Set([...this.readIdsState(), ...ids])));
    this.itemsState.update((items) => items.map((item) => ({ ...item, unread: false })));
  }

  updateQuery(query: NotificationListQuery): void {
    this.load(query);
  }

  setUnreadOnly(value: boolean): void {
    this.unreadOnlyState.set(value);
  }
}

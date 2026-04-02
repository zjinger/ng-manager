import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { NotificationItem } from '../models/notification.model';
import { NotificationApiService, type NotificationListQuery } from '../services/notification-api.service';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly api = inject(NotificationApiService);
  private readonly router = inject(Router);
  private readonly itemsState = signal<NotificationItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly totalState = signal(0);
  private readonly unreadCountState = signal(0);
  private readonly queryState = signal<NotificationListQuery>({ limit: 50 });
  private readonly unreadOnlyState = signal(false);
  private loadingInFlight = false;
  private queuedQuery: NotificationListQuery | null = null;
  private readonly realtimeListCap = 200;

  readonly items = computed(() => this.itemsState());
  readonly query = computed(() => this.queryState());
  readonly loading = computed(() => this.loadingState());
  readonly total = computed(() => this.totalState());
  readonly unreadOnly = computed(() => this.unreadOnlyState());
  readonly filteredItems = computed(() =>
    this.unreadOnlyState() ? this.itemsState().filter((item) => item.unread) : this.itemsState()
  );
  readonly unreadCount = computed(() => this.unreadCountState());

  constructor() {
    this.load();
  }

  load(query?: NotificationListQuery): void {
    const nextQuery = query ? { ...this.queryState(), ...query } : this.queryState();
    if (query) {
      this.queryState.set(nextQuery);
    }
    if (this.loadingInFlight) {
      this.queuedQuery = nextQuery;
      return;
    }
    this.executeLoad(nextQuery);
  }

  private executeLoad(query: NotificationListQuery): void {
    this.loadingInFlight = true;
    this.loadingState.set(true);
    this.api.list(query).subscribe({
      next: (result) => {
        this.itemsState.set(result.items);
        this.totalState.set(Number(result.total) || 0);
        this.unreadCountState.set(Number(result.unreadTotal) || 0);
      },
      complete: () => {
        this.onLoadSettled();
      },
      error: () => {
        this.totalState.set(0);
        this.unreadCountState.set(0);
        this.onLoadSettled();
      },
    });
  }

  markAllAsRead(): void {
    const ids = this.itemsState()
      .filter((item) => item.unread)
      .map((item) => item.id);
    if (ids.length === 0) {
      return;
    }
    this.markReadLocally(ids);
    this.syncReadState(ids);
  }

  markAsRead(notificationId: string): void {
    const target = this.itemsState().find((item) => item.id === notificationId);
    if (!target || !target.unread) {
      return;
    }
    this.markReadLocally([notificationId]);
    this.syncReadState([notificationId]);
  }

  updateQuery(query: NotificationListQuery): void {
    this.load(query);
  }

  setUnreadOnly(value: boolean): void {
    this.unreadOnlyState.set(value);
  }

  upsertFromWs(item: NotificationItem, unreadCount?: number): void {
    if (typeof unreadCount === 'number') {
      this.unreadCountState.set(Math.max(0, Math.floor(unreadCount)));
    }

    // Route-aware insert:
    // on notifications page we respect current query/page to avoid mixing unrelated rows.
    const isNotificationsPage = this.isNotificationsPageActive();
    if (isNotificationsPage) {
      const query = this.queryState();
      const currentPage = Number(query.page) || 1;
      if (currentPage > 1) {
        return;
      }
      if (!this.matchesQuery(item, query)) {
        return;
      }
    }

    let inserted = false;
    this.itemsState.update((items) => {
      const index = items.findIndex((current) => current.id === item.id);
      const next =
        index >= 0
          ? [item, ...items.slice(0, index), ...items.slice(index + 1)]
          : (() => {
              inserted = true;
              return [item, ...items];
            })();
      return next.slice(0, this.realtimeListCap);
    });
    if (inserted && isNotificationsPage) {
      this.totalState.update((value) => value + 1);
    }
  }

  setUnreadCount(unreadCount: number): void {
    this.unreadCountState.set(Math.max(0, Math.floor(unreadCount)));
  }

  private markReadLocally(notificationIds: string[]): void {
    // Optimistic update for fast interaction; server state is reconciled in syncReadState().
    const idSet = new Set(notificationIds);
    const unreadHits = this.itemsState().reduce((count, item) => count + (item.unread && idSet.has(item.id) ? 1 : 0), 0);
    if (unreadHits > 0) {
      this.unreadCountState.update((value) => Math.max(0, value - unreadHits));
    }
    this.itemsState.update((items) =>
      items.map((item) => (idSet.has(item.id) ? { ...item, unread: false } : item))
    );
  }

  private syncReadState(notificationIds: string[]): void {
    // Authoritative unread count comes from server response.
    this.api.markRead({ notificationIds }).subscribe({
      next: (result) => {
        this.unreadCountState.set(Number(result.unreadCount) || 0);
      },
      error: () => {
        this.load();
      },
    });
  }

  private onLoadSettled(): void {
    // If another load was requested while inflight, run it immediately to keep final state freshest.
    const queued = this.queuedQuery;
    this.queuedQuery = null;
    if (queued) {
      this.executeLoad(queued);
      return;
    }
    this.loadingInFlight = false;
    this.loadingState.set(false);
  }

  private matchesQuery(item: NotificationItem, query: NotificationListQuery): boolean {
    if (query.kind && item.kind !== query.kind) {
      return false;
    }

    if (query.projectId && item.projectId !== query.projectId) {
      return false;
    }

    const keyword = String(query.keyword ?? '').trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    const haystack = `${item.title} ${item.description} ${item.projectName} ${item.sourceLabel}`.toLowerCase();
    return haystack.includes(keyword);
  }

  private isNotificationsPageActive(): boolean {
    const url = this.router.url || '';
    return url === '/notifications' || url.startsWith('/notifications?');
  }
}

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '@core/auth';
import type { NotificationItem } from '../models/notification.model';
import { NotificationApiService, type NotificationListQuery } from '../services/notification-api.service';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly api = inject(NotificationApiService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly itemsState = signal<NotificationItem[]>([]);
  private readonly previewItemsState = signal<NotificationItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly totalState = signal(0);
  private readonly previewTotalState = signal(0);
  private readonly unreadCountState = signal(0);
  private readonly queryState = signal<NotificationListQuery>({ page: 1, pageSize: 20 });
  private readonly unreadOnlyState = signal(false);
  private loadingInFlight = false;
  private queuedQuery: NotificationListQuery | null = null;
  private activeUserKey: string | null = null;
  private userVersion = 0;
  private readonly previewLimit = 20;
  private readonly realtimeListCap = 200;

  readonly items = computed(() => this.itemsState());
  readonly previewItems = computed(() => this.previewItemsState());
  readonly query = computed(() => this.queryState());
  readonly loading = computed(() => this.loadingState());
  readonly total = computed(() => this.totalState());
  readonly previewTotal = computed(() => this.previewTotalState());
  readonly unreadOnly = computed(() => this.unreadOnlyState());
  readonly filteredItems = computed(() => this.itemsState());
  readonly unreadCount = computed(() => this.unreadCountState());

  constructor() {
    effect(() => {
      const user = this.authStore.currentUser();
      const userKey = user?.userId || user?.username || null;
      if (userKey === this.activeUserKey) {
        return;
      }
      this.activeUserKey = userKey;
      this.userVersion += 1;
      this.resetState();
      if (userKey) {
        this.loadPreview();
      }
    });
  }

  load(query?: NotificationListQuery): void {
    const nextQuery = query ? { ...this.queryState(), ...query } : this.queryState();
    if (query) {
      this.queryState.set(nextQuery);
      if (Object.prototype.hasOwnProperty.call(query, 'unreadOnly')) {
        this.unreadOnlyState.set(Boolean(query.unreadOnly));
      }
    }
    if (this.loadingInFlight) {
      this.queuedQuery = nextQuery;
      return;
    }
    this.executeLoad(nextQuery);
  }

  private executeLoad(query: NotificationListQuery): void {
    if (!this.activeUserKey) {
      this.resetState();
      return;
    }
    const requestVersion = this.userVersion;
    this.loadingInFlight = true;
    this.loadingState.set(true);
    this.api.list(query).subscribe({
      next: (result) => {
        if (!this.isCurrentUserRequest(requestVersion)) {
          return;
        }
        this.itemsState.set(result.items);
        this.totalState.set(Number(result.total) || 0);
        this.unreadCountState.set(Number(result.unreadTotal) || 0);
      },
      complete: () => {
        this.onLoadSettled(requestVersion);
      },
      error: () => {
        if (!this.isCurrentUserRequest(requestVersion)) {
          return;
        }
        this.totalState.set(0);
        this.onLoadSettled(requestVersion);
      },
    });
  }

  loadPreview(limit = this.previewLimit): void {
    if (!this.activeUserKey) {
      this.resetState();
      return;
    }
    const requestVersion = this.userVersion;
    this.api
      .list({
        page: 1,
        pageSize: limit,
        limit: undefined,
      })
      .subscribe({
        next: (result) => {
          if (!this.isCurrentUserRequest(requestVersion)) {
            return;
          }
          this.previewItemsState.set(result.items);
          this.previewTotalState.set(Number(result.total) || 0);
          this.unreadCountState.set(Number(result.unreadTotal) || 0);
        },
        error: () => {
          if (!this.isCurrentUserRequest(requestVersion)) {
            return;
          }
          this.previewItemsState.set([]);
          this.previewTotalState.set(0);
        },
      });
  }

  markAllAsRead(): void {
    if (this.unreadCountState() <= 0) {
      return;
    }
    this.markAllReadLocally();
    this.syncAllReadState();
  }

  markAsRead(notificationId: string): void {
    const target =
      this.itemsState().find((item) => item.id === notificationId) ??
      this.previewItemsState().find((item) => item.id === notificationId);
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
    this.load({
      unreadOnly: value,
      page: 1,
      pageSize: this.queryState().pageSize,
      limit: this.queryState().limit,
    });
  }

  upsertFromWs(item: NotificationItem, unreadCount?: number): void {
    if (typeof unreadCount === 'number') {
      this.unreadCountState.set(Math.max(0, Math.floor(unreadCount)));
    }

    let previewInserted = false;
    this.previewItemsState.update((items) => {
      const index = items.findIndex((current) => current.id === item.id);
      if (index >= 0) {
        return [item, ...items.slice(0, index), ...items.slice(index + 1)].slice(0, this.previewLimit);
      }
      previewInserted = true;
      return [item, ...items].slice(0, this.previewLimit);
    });
    if (previewInserted) {
      this.previewTotalState.update((value) => value + 1);
    }

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

  reloadPageIfActive(): void {
    if (this.isNotificationsPageActive()) {
      this.load();
    }
  }

  private markReadLocally(notificationIds: string[]): void {
    const idSet = new Set(notificationIds);
    const unreadHits = new Set<string>();
    for (const item of this.itemsState()) {
      if (item.unread && idSet.has(item.id)) {
        unreadHits.add(item.id);
      }
    }
    for (const item of this.previewItemsState()) {
      if (item.unread && idSet.has(item.id)) {
        unreadHits.add(item.id);
      }
    }
    if (unreadHits.size > 0) {
      this.unreadCountState.update((value) => Math.max(0, value - unreadHits.size));
    }

    const pageUnreadHits = this.itemsState().reduce(
      (count, item) => count + (item.unread && idSet.has(item.id) ? 1 : 0),
      0
    );
    this.itemsState.update((items) => {
      const next = items.map((item) => (idSet.has(item.id) ? { ...item, unread: false } : item));
      return this.unreadOnlyState() ? next.filter((item) => item.unread) : next;
    });
    if (this.unreadOnlyState() && pageUnreadHits > 0) {
      this.totalState.update((value) => Math.max(0, value - pageUnreadHits));
    }

    this.previewItemsState.update((items) =>
      items.map((item) => (idSet.has(item.id) ? { ...item, unread: false } : item))
    );
  }

  private markAllReadLocally(): void {
    this.unreadCountState.set(0);
    this.itemsState.update((items) => {
      const next = items.map((item) => (item.unread ? { ...item, unread: false } : item));
      return this.unreadOnlyState() ? [] : next;
    });
    if (this.unreadOnlyState()) {
      this.totalState.set(0);
    }
    this.previewItemsState.update((items) =>
      items.map((item) => (item.unread ? { ...item, unread: false } : item))
    );
  }

  private syncReadState(notificationIds: string[]): void {
    const requestVersion = this.userVersion;
    this.api.markRead({ notificationIds }).subscribe({
      next: (result) => {
        if (!this.isCurrentUserRequest(requestVersion)) {
          return;
        }
        this.unreadCountState.set(Number(result.unreadCount) || 0);
        this.loadPreview();
        this.reloadPageIfActive();
      },
      error: () => {
        if (!this.isCurrentUserRequest(requestVersion)) {
          return;
        }
        this.loadPreview();
        this.reloadPageIfActive();
      },
    });
  }

  private syncAllReadState(): void {
    const requestVersion = this.userVersion;
    this.api.markRead({ all: true }).subscribe({
      next: (result) => {
        if (!this.isCurrentUserRequest(requestVersion)) {
          return;
        }
        this.unreadCountState.set(Number(result.unreadCount) || 0);
        this.loadPreview();
        this.reloadPageIfActive();
      },
      error: () => {
        if (!this.isCurrentUserRequest(requestVersion)) {
          return;
        }
        this.loadPreview();
        this.reloadPageIfActive();
      },
    });
  }

  private onLoadSettled(requestVersion: number): void {
    if (!this.isCurrentUserRequest(requestVersion)) {
      return;
    }
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

  private resetState(): void {
    this.itemsState.set([]);
    this.previewItemsState.set([]);
    this.loadingState.set(false);
    this.totalState.set(0);
    this.previewTotalState.set(0);
    this.unreadCountState.set(0);
    this.queryState.set({ page: 1, pageSize: 20 });
    this.unreadOnlyState.set(false);
    this.loadingInFlight = false;
    this.queuedQuery = null;
  }

  private isCurrentUserRequest(requestVersion: number): boolean {
    return requestVersion === this.userVersion && !!this.activeUserKey;
  }

  private matchesQuery(item: NotificationItem, query: NotificationListQuery): boolean {
    if (query.kind && item.kind !== query.kind) {
      return false;
    }
    if (query.category && item.category !== query.category) {
      return false;
    }

    if (query.projectId && item.projectId !== query.projectId) {
      return false;
    }
    if (query.unreadOnly && !item.unread) {
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

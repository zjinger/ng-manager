import { Injectable, effect, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { NotificationStore } from '../../features/notifications/store/notification.store';
import { NavigationBadgeStore } from '../navigation/navigation-badge.store';
import { ProjectContextStore } from '../state/project-context.store';
import { WsClientService } from './ws-client.service';
import type { WsServerMessage } from './ws-message.types';

@Injectable({ providedIn: 'root' })
export class RealtimeSyncService {
  private readonly wsClient = inject(WsClientService);
  private readonly notificationStore = inject(NotificationStore);
  private readonly navigationBadgeStore = inject(NavigationBadgeStore);
  private readonly projectContext = inject(ProjectContextStore);

  private started = false;
  private subscriptions = new Subscription();
  private notificationReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private badgeReloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.wsClient.setProject(this.projectContext.currentProjectId());
    });
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.subscriptions = new Subscription();
    this.wsClient.connect();
    this.subscriptions.add(
      this.wsClient.messages$.subscribe((message) => this.handleMessage(message))
    );
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.subscriptions.unsubscribe();
    this.clearTimers();
    this.wsClient.disconnect();
  }

  private handleMessage(message: WsServerMessage): void {
    const currentProjectId = this.projectContext.currentProjectId();
    const messageProjectId = 'projectId' in message ? (message.projectId || null) : null;

    if (messageProjectId && currentProjectId && messageProjectId !== currentProjectId) {
      return;
    }

    if (message.type === 'notification.changed') {
      this.scheduleNotificationReload();
      if (this.shouldRefreshBadge(message.payload.entityType)) {
        this.scheduleBadgeReload();
      }
      return;
    }

    if (message.type === 'badge.changed') {
      if (this.shouldRefreshBadge(message.payload.entityType)) {
        this.scheduleBadgeReload();
      }
    }
  }

  private shouldRefreshBadge(entityType: string): boolean {
    return entityType === 'issue' || entityType === 'rd';
  }

  private scheduleNotificationReload(): void {
    if (this.notificationReloadTimer) {
      return;
    }
    this.notificationReloadTimer = setTimeout(() => {
      this.notificationReloadTimer = null;
      this.notificationStore.load();
    }, 120);
  }

  private scheduleBadgeReload(): void {
    if (this.badgeReloadTimer) {
      return;
    }
    this.badgeReloadTimer = setTimeout(() => {
      this.badgeReloadTimer = null;
      this.navigationBadgeStore.load();
    }, 120);
  }

  private clearTimers(): void {
    if (this.notificationReloadTimer) {
      clearTimeout(this.notificationReloadTimer);
      this.notificationReloadTimer = null;
    }
    if (this.badgeReloadTimer) {
      clearTimeout(this.badgeReloadTimer);
      this.badgeReloadTimer = null;
    }
  }
}

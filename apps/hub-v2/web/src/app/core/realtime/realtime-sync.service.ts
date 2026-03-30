import { Injectable, effect, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { NotificationStore } from '../../features/notifications/store/notification.store';
import { NavigationBadgeStore } from '../navigation/navigation-badge.store';
import { ProjectContextStore } from '../state/project-context.store';
import { DashboardRefreshBusService } from './dashboard-refresh-bus.service';
import { WsClientService } from './ws-client.service';
import type { WsRefreshHint, WsServerMessage } from './ws-message.types';

@Injectable({ providedIn: 'root' })
export class RealtimeSyncService {
  private readonly wsClient = inject(WsClientService);
  private readonly notificationStore = inject(NotificationStore);
  private readonly navigationBadgeStore = inject(NavigationBadgeStore);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly dashboardRefreshBus = inject(DashboardRefreshBusService);

  private started = false;
  private subscriptions = new Subscription();
  private notificationReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private badgeReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private dashboardReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingDashboardEntityTypes = new Set<string>();

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
      const hints = this.resolveHints(message);
      if (hints.has('notification')) {
        this.scheduleNotificationReload();
      }
      if (hints.has('badge')) {
        this.scheduleBadgeReload();
      }
      if (hints.has('dashboard')) {
        this.scheduleDashboardReload(message.payload.entityType);
      }
      return;
    }

    if (message.type === 'badge.changed') {
      const hints = this.resolveHints(message);
      if (hints.has('badge')) {
        this.scheduleBadgeReload();
      }
      return;
    }

    if (message.type === 'dashboard.changed') {
      const hints = this.resolveHints(message);
      if (hints.has('dashboard')) {
        this.scheduleDashboardReload(message.payload.entityType);
      }
    }
  }

  private resolveHints(message: WsServerMessage): Set<WsRefreshHint> {
    if (message.type === 'notification.changed') {
      const incoming = message.payload.hints ?? [];
      if (incoming.length > 0) {
        return new Set(incoming);
      }
      const hints: WsRefreshHint[] = ['notification', 'dashboard'];
      if (message.payload.entityType === 'issue' || message.payload.entityType === 'rd') {
        hints.push('badge');
      }
      return new Set(hints);
    }

    if (message.type === 'badge.changed') {
      const incoming = message.payload.hints ?? [];
      if (incoming.length > 0) {
        return new Set(incoming);
      }
      return new Set<WsRefreshHint>(['badge']);
    }

    if (message.type === 'dashboard.changed') {
      const incoming = message.payload.hints ?? [];
      if (incoming.length > 0) {
        return new Set(incoming);
      }
      return new Set<WsRefreshHint>(['dashboard']);
    }

    return new Set<WsRefreshHint>();
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

  private scheduleDashboardReload(entityType?: string): void {
    if (entityType) {
      this.pendingDashboardEntityTypes.add(entityType);
    }
    if (this.dashboardReloadTimer) {
      return;
    }
    this.dashboardReloadTimer = setTimeout(() => {
      this.dashboardReloadTimer = null;
      const entityTypes = Array.from(this.pendingDashboardEntityTypes);
      this.pendingDashboardEntityTypes.clear();
      this.dashboardRefreshBus.notify({ entityTypes, source: 'ws' });
    }, 200);
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
    if (this.dashboardReloadTimer) {
      clearTimeout(this.dashboardReloadTimer);
      this.dashboardReloadTimer = null;
    }
    this.pendingDashboardEntityTypes.clear();
  }
}

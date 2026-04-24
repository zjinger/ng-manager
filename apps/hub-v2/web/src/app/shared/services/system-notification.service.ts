import { inject, Injectable } from '@angular/core';

import type { NotificationItem } from '../../features/notifications/models/notification.model';

@Injectable({ providedIn: 'root' })
export class SystemNotificationService {
  private permissionCache: NotificationPermission =
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    this.permissionCache = Notification.permission;
    return this.permissionCache;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    const currentPermission = this.getPermission();
    if (currentPermission === 'granted') return 'granted';
    if (currentPermission === 'denied') return 'denied';

    const result = await Notification.requestPermission();
    this.permissionCache = result;
    return result;
  }

  async show(title: string, body: string, icon?: string): Promise<void> {
    if (!this.isSupported()) return;
    if (this.permissionCache !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') return;
    }

    const notification = new Notification(title, {
      body,
      icon: icon ?? '/favicon.ico',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  async showFromNotificationItem(item: NotificationItem, enabled: boolean): Promise<void> {
    if (!enabled) return;
    await this.show(item.title, item.description, '/favicon.ico');
  }

  async checkAndPromptPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (!this.isSupported()) return 'denied';

    const currentPermission = this.getPermission();
    if (currentPermission === 'denied') {
      return 'denied';
    }

    if (currentPermission === 'default') {
      const result = await this.requestPermission();
      return result;
    }

    return 'granted';
  }
}

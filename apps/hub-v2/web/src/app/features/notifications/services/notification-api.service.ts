import { inject, Injectable } from '@angular/core';

import type { NotificationApiItem } from '../models/notification.model';
import { ApiClientService } from '@core/http';

export interface NotificationListQuery {
  [key: string]: string | number | boolean | null | undefined;
  kind?: NotificationApiItem['kind'] | '';
  category?: NotificationApiItem['category'] | '';
  projectId?: string;
  keyword?: string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface NotificationListResult {
  items: NotificationApiItem[];
  total: number;
  unreadTotal: number;
  page: number;
  pageSize: number;
}

export interface MarkNotificationReadInput {
  all?: boolean;
  notificationIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly api = inject(ApiClientService);

  list(query: NotificationListQuery = {}) {
    return this.api.get<NotificationListResult>('/notifications', query);
  }

  markRead(input: MarkNotificationReadInput) {
    return this.api.post<{ updated: number; unreadCount: number }, MarkNotificationReadInput>('/notifications/read', input);
  }
}

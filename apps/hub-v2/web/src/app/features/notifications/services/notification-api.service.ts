import { inject, Injectable } from '@angular/core';

import type { NotificationApiItem } from '../models/notification.model';
import { ApiClientService } from '@core/http';

export interface NotificationListQuery {
  [key: string]: string | number | boolean | null | undefined;
  kind?: NotificationApiItem['kind'] | '';
  projectId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface NotificationListResult {
  items: NotificationApiItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MarkNotificationReadInput {
  announcementIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly api = inject(ApiClientService);

  list(query: NotificationListQuery = {}) {
    return this.api.get<NotificationListResult>('/notifications', query);
  }

  markRead(input: MarkNotificationReadInput) {
    return this.api.post<{ updated: number }, MarkNotificationReadInput>('/notifications/read', input);
  }
}

import { inject, Injectable } from '@angular/core';

import type { NotificationItem } from '../models/notification.model';
import { ApiClientService } from '@core/http';

export interface NotificationListQuery {
  [key: string]: string | number | boolean | null | undefined;
  kind?: NotificationItem['kind'] | '';
  projectId?: string;
  keyword?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly api = inject(ApiClientService);

  list(query: NotificationListQuery = {}) {
    return this.api.get<{ items: NotificationItem[] }>('/notifications', query);
  }
}

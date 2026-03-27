import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type { FeedbackEntity, FeedbackListQuery, FeedbackListResult, FeedbackStatus } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly api = inject(ApiClientService);

  list(query: FeedbackListQuery) {
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...query,
      status: query.status && query.status.length > 0 ? query.status.join(',') : undefined,
      category: query.category && query.category.length > 0 ? query.category.join(',') : undefined,
      source: query.source && query.source.length > 0 ? query.source.join(',') : undefined,
    };
    return this.api.get<FeedbackListResult>('/feedbacks', normalizedQuery);
  }

  getById(feedbackId: string) {
    return this.api.get<FeedbackEntity>(`/feedbacks/${feedbackId}`);
  }

  updateStatus(feedbackId: string, status: FeedbackStatus) {
    return this.api.put<FeedbackEntity, { status: FeedbackStatus }>(`/feedbacks/${feedbackId}/status`, { status });
  }
}

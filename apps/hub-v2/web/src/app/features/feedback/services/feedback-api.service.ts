import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type { FeedbackEntity, FeedbackListQuery, FeedbackListResult, FeedbackStatus } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly api = inject(ApiClientService);

  list(query: FeedbackListQuery) {
    return this.api.get<FeedbackListResult>('/feedbacks', {
      ...query,
    } as Record<string, string | number | boolean | null | undefined>);
  }

  getById(feedbackId: string) {
    return this.api.get<FeedbackEntity>(`/feedbacks/${feedbackId}`);
  }

  updateStatus(feedbackId: string, status: FeedbackStatus) {
    return this.api.put<FeedbackEntity, { status: FeedbackStatus }>(`/feedbacks/${feedbackId}/status`, { status });
  }
}

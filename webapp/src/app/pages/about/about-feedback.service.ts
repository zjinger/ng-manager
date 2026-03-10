import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core';

export type FeedbackCategory = 'bug' | 'suggestion' | 'feature' | 'other';

export type SubmitFeedbackPayload = {
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
  projectKey?: string;
  clientName?: string;
  clientVersion?: string;
  osInfo?: string;
};

@Injectable({
  providedIn: 'root'
})
export class AboutFeedbackService {
  private api = inject(ApiClient);

  submit(payload: SubmitFeedbackPayload) {
    return this.api.post<{ id: string }>('/api/hub/feedback', payload);
  }
}

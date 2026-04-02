import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http';
import type { IssueType } from '../../issues/models/issue.model';
import type { AiIssueRecommendResult, AiAssigneeRecommendResult } from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly api = inject(ApiClientService);

  recommendIssue(input: { title: string; description?: string | null; projectId: string }): Observable<AiIssueRecommendResult> {
    return this.api.post<AiIssueRecommendResult, typeof input>('/ai/issue/recommend', input);
  }

  recommendAssignee(input: { title: string; description?: string | null; projectId: string; type?: IssueType | null; moduleCode?: string | null }): Observable<AiAssigneeRecommendResult> {
    return this.api.post<AiAssigneeRecommendResult, typeof input>('/ai/issue/assignee', input);
  }
}

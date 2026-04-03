import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import type { ApiSuccessResponse } from '@core/http';
import { ApiClientService } from '@core/http';
import type {
  SurveyCreateInput,
  SurveyEntity,
  SurveyListQuery,
  SurveyListResult,
  SurveySubmissionCreateInput,
  SurveySubmissionEntity,
  SurveySubmissionListQuery,
  SurveySubmissionListResult,
  SurveySubmissionStatsResult,
  SurveyUpdateInput,
} from '../models/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveyApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);

  list(query: SurveyListQuery) {
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...query,
    };
    return this.api.get<SurveyListResult>('/surveys', normalizedQuery);
  }

  getById(surveyId: string) {
    return this.api.get<SurveyEntity>(`/surveys/${surveyId}`);
  }

  create(input: SurveyCreateInput) {
    return this.api.post<SurveyEntity, SurveyCreateInput>('/surveys', input);
  }

  update(surveyId: string, input: SurveyUpdateInput) {
    return this.api.put<SurveyEntity, SurveyUpdateInput>(`/surveys/${surveyId}`, input);
  }

  publish(surveyId: string) {
    return this.api.post<SurveyEntity>(`/surveys/${surveyId}/publish`, {});
  }

  archive(surveyId: string) {
    return this.api.post<SurveyEntity>(`/surveys/${surveyId}/archive`, {});
  }

  draft(surveyId: string) {
    return this.api.post<SurveyEntity>(`/surveys/${surveyId}/draft`, {});
  }

  listSubmissions(surveyId: string, query: SurveySubmissionListQuery) {
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...query,
    };
    return this.api.get<SurveySubmissionListResult>(`/surveys/${surveyId}/submissions`, normalizedQuery);
  }

  getSubmissionStats(surveyId: string) {
    return this.api.get<SurveySubmissionStatsResult>(`/surveys/${surveyId}/submissions/stats`);
  }

  exportSubmissionsCsv(surveyId: string) {
    return this.http.get(`/api/admin/surveys/${surveyId}/submissions/export.csv`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  getPublicBySlug(slug: string) {
    return this.http
      .get<ApiSuccessResponse<SurveyEntity>>(`/api/public/surveys/${encodeURIComponent(slug)}`)
      .pipe(map((response) => response.data));
  }

  submitPublicBySlug(slug: string, input: SurveySubmissionCreateInput) {
    return this.http
      .post<ApiSuccessResponse<SurveySubmissionEntity>>(`/api/public/surveys/${encodeURIComponent(slug)}/submissions`, input)
      .pipe(map((response) => response.data));
  }
}

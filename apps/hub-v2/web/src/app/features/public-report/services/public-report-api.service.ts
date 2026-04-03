import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import type { ApiSuccessResponse } from '@core/http';
import type {
  PublicReportBoardResult,
  PublicReportPreviewInput,
  PublicReportPreviewResult,
  PublicReportProjectsResult,
} from '../models/public-report.model';

@Injectable({ providedIn: 'root' })
export class PublicReportApiService {
  private readonly http = inject(HttpClient);

  listProjects(share?: string) {
    let params = new HttpParams();
    if ((share || '').trim()) {
      params = params.set('share', (share || '').trim());
    }
    return this.http
      .get<ApiSuccessResponse<PublicReportProjectsResult>>('/api/public/report/projects', { params })
      .pipe(map((response) => response.data));
  }

  getBoard(share: string) {
    const params = new HttpParams().set('share', share.trim());
    return this.http
      .get<ApiSuccessResponse<PublicReportBoardResult>>('/api/public/report/board', { params })
      .pipe(map((response) => response.data));
  }

  preview(input: PublicReportPreviewInput) {
    return this.http
      .post<ApiSuccessResponse<PublicReportPreviewResult>>('/api/public/report/preview', input)
      .pipe(map((response) => response.data));
  }
}

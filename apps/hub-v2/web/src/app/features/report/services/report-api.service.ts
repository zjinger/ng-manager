import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  AiReportPreviewResult,
  ReportTemplateCreateResult,
  ReportTemplate,
  ReportTemplateExecuteResult,
  ReportTemplateListResult,
} from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly api = inject(ApiClientService);

  preview(input: { query: string }): Observable<AiReportPreviewResult> {
    return this.api.post<AiReportPreviewResult, typeof input>('/ai/report-sql/preview', input);
  }

  listTemplates(): Observable<ReportTemplateListResult> {
    return this.api.get<ReportTemplateListResult>('/ai/report-sql/templates');
  }

  createTemplate(input: { title: string; naturalQuery: string; sql: string }): Observable<ReportTemplateCreateResult> {
    return this.api.post<ReportTemplateCreateResult, typeof input>('/ai/report-sql/templates', input);
  }

  updateTemplateTitle(id: string, title: string): Observable<ReportTemplate> {
    return this.api.patch<ReportTemplate, { title: string }>(`/ai/report-sql/templates/${id}`, { title });
  }

  deleteTemplate(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/ai/report-sql/templates/${id}`);
  }

  executeTemplate(id: string): Observable<ReportTemplateExecuteResult> {
    return this.api.post<ReportTemplateExecuteResult>(`/ai/report-sql/templates/${id}/execute`);
  }
}

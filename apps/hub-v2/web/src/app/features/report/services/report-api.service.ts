import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  AiReportPreviewResult,
  ReportPublicProject,
  ReportPublicBoard,
  ReportPublicBoardSummary,
  ReportPublicCapability,
  ReportPublicProjectListResult,
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

  getReportPublicCapability(): Observable<ReportPublicCapability> {
    return this.api.get<ReportPublicCapability>('/report-public/capability');
  }

  listReportPublicProjects(): Observable<ReportPublicProjectListResult> {
    return this.api.get<ReportPublicProjectListResult>('/report-public/projects');
  }

  addReportPublicProject(input: { projectId: string; allowAllProjects?: boolean }): Observable<ReportPublicProject> {
    return this.api.post<ReportPublicProject, typeof input>('/report-public/projects', input);
  }

  removeReportPublicProject(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/report-public/projects/${id}`);
  }

  regenerateReportPublicLink(id: string): Observable<ReportPublicProject> {
    return this.api.post<ReportPublicProject>(`/report-public/projects/${id}/generate-link`);
  }

  publishReportPublicBoard(input: {
    title?: string;
    items: Array<{ title: string; naturalQuery: string; sql: string; layoutSize?: 'compact' | 'wide' }>;
  }): Observable<ReportPublicBoard> {
    return this.api.post<ReportPublicBoard, typeof input>('/report-public/boards/publish', input);
  }

  listReportPublicBoards(): Observable<{ items: ReportPublicBoardSummary[] }> {
    return this.api.get<{ items: ReportPublicBoardSummary[] }>('/report-public/boards');
  }

  invalidateReportPublicBoard(id: string): Observable<ReportPublicBoardSummary> {
    return this.api.post<ReportPublicBoardSummary>(`/report-public/boards/${id}/invalidate`);
  }

  activateReportPublicBoard(id: string): Observable<ReportPublicBoardSummary> {
    return this.api.post<ReportPublicBoardSummary>(`/report-public/boards/${id}/activate`);
  }

  removeReportPublicBoard(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/report-public/boards/${id}`);
  }

  listAccessibleProjects(): Observable<{ items: Array<{ id: string; name: string; projectKey: string }> }> {
    return this.api.get<{ items: Array<{ id: string; name: string; projectKey: string }> }>('/projects', {
      page: 1,
      pageSize: 200,
      scope: 'all_accessible',
      status: 'active',
    });
  }
}

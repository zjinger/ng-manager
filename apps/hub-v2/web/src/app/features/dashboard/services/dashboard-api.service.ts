import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  DashboardActivityItem,
  DashboardAnnouncement,
  DashboardBoardData,
  DashboardBoardRange,
  DashboardDocument,
  DashboardHomeData,
  DashboardReportedIssueItem,
  DashboardStats,
  DashboardTodoItem,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly api = inject(ApiClientService);

  getHomeData(_options?: { force?: boolean }): Observable<DashboardHomeData> {
    return this.api.get<DashboardHomeData>('/dashboard/home');
  }

  getStats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('/dashboard/stats');
  }

  getTodos(): Observable<DashboardTodoItem[]> {
    return this.api.get<DashboardTodoItem[]>('/dashboard/todos');
  }

  getReportedIssues(): Observable<DashboardReportedIssueItem[]> {
    return this.api.get<DashboardReportedIssueItem[]>('/dashboard/reported-issues');
  }

  getActivities(): Observable<DashboardActivityItem[]> {
    return this.api.get<DashboardActivityItem[]>('/dashboard/activities');
  }

  getAnnouncements(): Observable<DashboardAnnouncement[]> {
    return this.api.get<DashboardAnnouncement[]>('/dashboard/announcements');
  }

  getDocuments(): Observable<DashboardDocument[]> {
    return this.api.get<DashboardDocument[]>('/dashboard/documents');
  }

  getBoardData(params: { projectId?: string; range: DashboardBoardRange }): Observable<DashboardBoardData> {
    return this.api.get<DashboardBoardData>('/dashboard/board', params);
  }

  invalidateHomeDataCache(): void {
    // 已移除 dashboard 首页缓存，这里保留空实现用于兼容既有调用方。
  }
}

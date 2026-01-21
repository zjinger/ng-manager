import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api';
import { Observable } from 'rxjs';
import { DashboardDocV1, DashboardItem, DashboardItemConfig, WidgetKey } from '../dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private api: ApiClient = inject(ApiClient);

  getInfo(projectId: string): Observable<DashboardDocV1> {
    return this.api.get<DashboardDocV1>(`/api/dashboard/getInfo/${projectId}`)
  }

  update(projectId: string, doc: DashboardDocV1): Observable<DashboardDocV1> {
    return this.api.post<DashboardDocV1>(`/api/dashboard/update/${projectId}`, doc);
  }

  widgets(projectId: string): Observable<DashboardItem[]> {
    return this.api.get<DashboardItem[]>(`/api/dashboard/widgets/${projectId}`);
  }

  addWidget(projectId: string, data: { widgetKey: WidgetKey, x: number, y: number }): Observable<DashboardDocV1> {
    const { x, y } = data;
    return this.api.get<DashboardDocV1>(`/api/dashboard/addWidget/${projectId}/${data.widgetKey}/${x}/${y}`);
  }

  removeWidget(projectId: string, widgetId: string): Observable<DashboardDocV1> {
    return this.api.delete<DashboardDocV1>(`/api/dashboard/removeWidget/${projectId}/${widgetId}`);
  }

  updateItemConfig(projectId: string, widgetId: string, config: DashboardItemConfig): Observable<DashboardDocV1> {
    return this.api.post<DashboardDocV1>(`/api/dashboard/updateItemConfig/${projectId}/${widgetId}`, config);
  }
}
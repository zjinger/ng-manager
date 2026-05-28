import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type { AttentionItem, MetricItem, StageOverview, SummaryBlock } from '../models/delivery-overview.model';

export interface DeliveryWeeklyReportSnapshotPayload {
  projectId: string;
  projectKey: string;
  projectName: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: SummaryBlock[];
  metrics: MetricItem[];
  stages: StageOverview[];
  keyItems: Array<{
    id: string;
    rdNo: string;
    title: string;
    stageName: string;
    progress: number;
    status: string;
    healthLabel: string;
    reportNote: string;
  }>;
  attentions: AttentionItem[];
}

export interface DeliveryWeeklyReportEntity extends DeliveryWeeklyReportSnapshotPayload {
  id: string;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
}

export interface DeliveryWeeklyReportListResult {
  items: DeliveryWeeklyReportEntity[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DeliveryWeeklyReportApiService {
  private readonly api = inject(ApiClientService);

  listSnapshots(query: { projectId: string; page?: number; pageSize?: number }) {
    return this.api.get<DeliveryWeeklyReportListResult>('/delivery-weekly-reports', query);
  }

  createSnapshot(payload: DeliveryWeeklyReportSnapshotPayload) {
    return this.api.post<DeliveryWeeklyReportEntity, DeliveryWeeklyReportSnapshotPayload>(
      '/delivery-weekly-reports',
      payload,
    );
  }

  deleteSnapshot(id: string) {
    return this.api.delete<{ id: string }>(`/delivery-weekly-reports/${encodeURIComponent(id)}`);
  }
}

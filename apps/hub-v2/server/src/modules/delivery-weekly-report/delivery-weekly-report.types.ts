import type { PageResult } from "../../shared/http/pagination";

export interface DeliveryWeeklyReportSnapshotPayload {
  projectId: string;
  projectKey: string;
  projectName: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: unknown;
  metrics: unknown;
  stages: unknown;
  keyItems: unknown;
  attentions: unknown;
}

export interface DeliveryWeeklyReportEntity extends DeliveryWeeklyReportSnapshotPayload {
  id: string;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
}

export interface ListDeliveryWeeklyReportsQuery {
  projectId: string;
  page?: number;
  pageSize?: number;
}

export type DeliveryWeeklyReportListResult = PageResult<DeliveryWeeklyReportEntity>;

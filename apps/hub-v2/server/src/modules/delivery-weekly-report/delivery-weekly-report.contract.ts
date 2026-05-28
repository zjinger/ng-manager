import type { RequestContext } from "../../shared/context/request-context";
import type {
  DeliveryWeeklyReportEntity,
  DeliveryWeeklyReportListResult,
  DeliveryWeeklyReportSnapshotPayload,
  ListDeliveryWeeklyReportsQuery
} from "./delivery-weekly-report.types";

export interface DeliveryWeeklyReportCommandContract {
  create(input: DeliveryWeeklyReportSnapshotPayload, ctx: RequestContext): Promise<DeliveryWeeklyReportEntity>;
  delete(id: string, ctx: RequestContext): Promise<{ id: string }>;
}

export interface DeliveryWeeklyReportQueryContract {
  list(query: ListDeliveryWeeklyReportsQuery, ctx: RequestContext): Promise<DeliveryWeeklyReportListResult>;
  getById(id: string, ctx: RequestContext): Promise<DeliveryWeeklyReportEntity>;
}

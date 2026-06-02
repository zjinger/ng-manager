import type {
  ClientErrorReportEntity,
  ClientErrorReportListQuery,
  ClientErrorReportListResult,
  ClientErrorReportRequestMeta,
  CreateClientErrorReportInput
} from "./error-report.types";

export interface ErrorReportCommandContract {
  submit(input: CreateClientErrorReportInput, meta: ClientErrorReportRequestMeta): ClientErrorReportEntity;
}

export interface ErrorReportQueryContract {
  list(query: ClientErrorReportListQuery): ClientErrorReportListResult;
  getById(id: string): ClientErrorReportEntity | null;
}

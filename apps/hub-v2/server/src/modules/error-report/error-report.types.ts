export type ClientErrorReportLevel = "info" | "warn" | "error";

export interface CreateClientErrorReportInput {
  level: ClientErrorReportLevel;
  type: string;
  message: string;
  stack?: string | null;
  source?: string | null;
  lineno?: number | null;
  colno?: number | null;
  url?: string | null;
  route?: string | null;
  appVersion?: string | null;
  buildHash?: string | null;
  requestMethod?: string | null;
  requestUrl?: string | null;
  statusCode?: number | null;
  extra?: Record<string, unknown> | null;
}

export interface ClientErrorReportEntity {
  id: string;
  level: ClientErrorReportLevel;
  type: string;
  message: string;
  stack: string | null;
  source: string | null;
  lineno: number | null;
  colno: number | null;
  url: string | null;
  route: string | null;
  userAgent: string | null;
  ip: string | null;
  appVersion: string | null;
  buildHash: string | null;
  userId: string | null;
  username: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  statusCode: number | null;
  extraJson: string | null;
  fingerprint: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
}

export interface ClientErrorReportListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  level?: ClientErrorReportLevel;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ClientErrorReportListResult {
  items: ClientErrorReportEntity[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ClientErrorReportRequestMeta {
  userAgent?: string | null;
  ip?: string | null;
  userId?: string | null;
  username?: string | null;
}

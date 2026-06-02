export type ClientErrorReportLevel = 'info' | 'warn' | 'error';
export type ClientErrorReportType = 'runtime' | 'unhandledrejection' | 'resource' | 'http' | 'chunk-load';

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

export const CLIENT_ERROR_LEVEL_LABELS: Record<ClientErrorReportLevel, string> = {
  info: '信息',
  warn: '警告',
  error: '错误',
};

export const CLIENT_ERROR_TYPE_LABELS: Record<ClientErrorReportType, string> = {
  runtime: '运行时异常',
  unhandledrejection: 'Promise 未捕获',
  resource: '资源加载失败',
  http: 'HTTP 异常',
  'chunk-load': 'Chunk 加载失败',
};

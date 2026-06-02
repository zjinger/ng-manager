export type ClientErrorReportLevel = 'info' | 'warn' | 'error';
export type ClientErrorReportType = 'runtime' | 'unhandledrejection' | 'resource' | 'http' | 'chunk-load';

export interface ClientErrorReportPayload {
  level: ClientErrorReportLevel;
  type: ClientErrorReportType;
  message: string;
  stack: string | null;
  source: string | null;
  lineno: number | null;
  colno: number | null;
  url: string | null;
  route: string | null;
  appVersion: string | null;
  buildHash: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  statusCode: number | null;
  extra: Record<string, unknown> | null;
}

export interface ErrorReportInput {
  level?: ClientErrorReportLevel;
  type: ClientErrorReportType;
  message?: string | null;
  stack?: string | null;
  source?: string | null;
  lineno?: number | null;
  colno?: number | null;
  error?: unknown;
  requestMethod?: string | null;
  requestUrl?: string | null;
  statusCode?: number | null;
  extra?: Record<string, unknown> | null;
}

export interface AppVersionManifest {
  app: string;
  version: string;
  buildTime: string;
  commit: string;
  buildId: string;
}

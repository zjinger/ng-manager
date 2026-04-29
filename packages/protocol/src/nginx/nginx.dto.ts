export interface NginxInstanceDto {
  path: string;
  version: string;
  configPath: string;
  prefixPath: string;
  isBound: boolean;
}

export interface NginxStatusDto {
  isRunning: boolean;
  pid?: number;
  uptime?: string;
  activeConnections?: number;
  workerProcesses?: number;
}

export interface NginxConfigDto {
  mainConfigPath: string;
  content: string;
  isWritable: boolean;
}

export interface NginxLocationDto {
  path: string;
  proxyPass?: string;
  root?: string;
  index?: string[];
  tryFiles?: string[];
  rawConfig?: string;
}

export type NginxServerRuntimeStatusDto = "running" | "stopped" | "disabled" | "pending" | "unknown";

export interface NginxServerDto {
  id: string;
  name: string;
  listen: string[];
  domains?: string[];
  root?: string;
  index?: string[];
  locations: NginxLocationDto[];
  ssl: boolean;
  sslCert?: string;
  sslKey?: string;
  enabled: boolean;
  extraConfig?: string;
  configText: string;
  filePath?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  runtimeStatus?: NginxServerRuntimeStatusDto;
}

export interface NginxCommandResultDto {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface NginxConfigValidationDto {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface NginxServerSummaryDto {
  total: number;
  enabled: number;
  disabled: number;
}

export type NginxUpstreamStrategyDto = "round-robin" | "least_conn" | "ip_hash" | "hash";
export type NginxUpstreamHealthDto = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface NginxUpstreamDto {
  id: string;
  name: string;
  strategy: NginxUpstreamStrategyDto;
  nodes: string[];
  sourceFile?: string;
  managed?: boolean;
  readonly?: boolean;
  health?: NginxUpstreamHealthDto;
  healthy?: boolean;
}

export type NginxSslStatusDto = "valid" | "expiring" | "expired" | "pending";

export interface NginxSslCertificateDto {
  id: string;
  domain: string;
  certPath: string;
  keyPath: string;
  expireAt: string;
  status: NginxSslStatusDto;
  autoRenew: boolean;
}

export interface NginxTrafficConfigDto {
  rateLimitEnabled: boolean;
  rateLimit: string;
  connLimitEnabled: boolean;
  connLimit: number;
  blacklistIps: string[];
}

export interface NginxPerformanceConfigDto {
  gzipEnabled: boolean;
  gzipTypes: string;
  keepaliveTimeout: string;
  workerProcesses: string;
  sendfile: boolean;
  tcpNopush: boolean;
}

export interface NginxModuleSettingsDto {
  backupRetention: number;
  configBackupRetention: number;
}

export interface NginxFileReadableDto {
  exists: boolean;
  readable: boolean;
  error?: string;
}

export interface NginxImportIssueDto {
  level: "error" | "warning";
  message: string;
  field?: "name" | "domains" | "listen";
}

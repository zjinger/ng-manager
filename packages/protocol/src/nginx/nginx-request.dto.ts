import type {
  NginxLocationDto,
  NginxModuleSettingsDto,
  NginxPerformanceConfigDto,
  NginxSslCertificateDto,
  NginxTrafficConfigDto,
  NginxUpstreamDto,
} from "./nginx.dto";

export interface NginxBindRequestDto {
  path: string;
}

export interface UpdateNginxConfigRequestDto {
  content: string;
}

export interface ValidateNginxConfigRequestDto {
  content?: string;
}

export interface UpdateNginxConfigFileRequestDto {
  filePath: string;
  content: string;
}

export interface CreateNginxServerRequestDto {
  name: string;
  listen: string[];
  domains?: string[];
  root?: string;
  index?: string[];
  locations: NginxLocationDto[];
  ssl?: boolean;
  protocol?: "http" | "https";
  sslCert?: string;
  sslKey?: string;
  enabled?: boolean;
  extraConfig?: string;
  createdBy?: string;
}

export interface UpdateNginxServerRequestDto {
  name?: string;
  listen?: string[];
  domains?: string[];
  root?: string;
  index?: string[];
  locations?: NginxLocationDto[];
  ssl?: boolean;
  protocol?: "http" | "https";
  sslCert?: string;
  sslKey?: string;
  enabled?: boolean;
  extraConfig?: string;
}

export interface RestoreDeletedNginxServerRequestDto {
  snapshotId?: string;
}

export interface ParseNginxImportServersRequestDto {
  content?: string;
}

export interface AnalyzeNginxImportServersRequestDto {
  requests?: CreateNginxServerRequestDto[];
}

export interface ValidateNginxSslPathsRequestDto {
  sslCert?: string;
  sslKey?: string;
}

export interface SaveNginxUpstreamsRequestDto {
  upstreams: NginxUpstreamDto[];
}

export interface SaveNginxSslCertificatesRequestDto {
  certificates: NginxSslCertificateDto[];
}

export type SaveNginxTrafficConfigRequestDto = NginxTrafficConfigDto;
export type SaveNginxPerformanceConfigRequestDto = NginxPerformanceConfigDto;
export type SaveNginxModuleSettingsRequestDto = Partial<NginxModuleSettingsDto>;

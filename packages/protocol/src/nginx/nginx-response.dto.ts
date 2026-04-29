import type {
  NginxCommandResultDto,
  NginxConfigDto,
  NginxConfigValidationDto,
  NginxFileReadableDto,
  NginxImportIssueDto,
  NginxInstanceDto,
  NginxModuleSettingsDto,
  NginxPerformanceConfigDto,
  NginxServerDto,
  NginxServerSummaryDto,
  NginxSslCertificateDto,
  NginxStatusDto,
  NginxTrafficConfigDto,
  NginxUpstreamDto,
} from "./nginx.dto";
import type { CreateNginxServerRequestDto } from "./nginx-request.dto";

export interface NginxStatusResponseDto {
  instance: NginxInstanceDto | null;
  status: NginxStatusDto;
}

export interface NginxStatsResponseDto {
  success?: boolean;
  instance?: NginxInstanceDto | null;
  status?: NginxStatusDto;
  serverSummary?: NginxServerSummaryDto;
}

export interface NginxBindResponseDto {
  success?: boolean;
  instance?: NginxInstanceDto;
}

export interface NginxLocalIpResponseDto {
  ip?: string;
}

export interface NginxConfigResponseDto {
  success?: boolean;
  config?: NginxConfigDto;
}

export interface NginxConfigFilesResponseDto {
  success?: boolean;
  files?: string[];
}

export interface NginxServersResponseDto {
  success?: boolean;
  servers?: NginxServerDto[];
}

export interface NginxServerResponseDto {
  success?: boolean;
  server?: NginxServerDto;
}

export interface NginxDeleteServerResponseDto {
  success?: boolean;
  snapshotId?: string;
}

export interface NginxValidateSslPathsResponseDto {
  success?: boolean;
  valid: boolean;
  cert?: NginxFileReadableDto;
  key?: NginxFileReadableDto;
}

export interface NginxImportParseCandidateDto {
  request?: CreateNginxServerRequestDto;
  error?: string;
}

export interface NginxParseImportServersResponseDto {
  success?: boolean;
  candidates: NginxImportParseCandidateDto[];
}

export interface NginxImportAnalyzeCandidateDto {
  request?: CreateNginxServerRequestDto;
  issues?: NginxImportIssueDto[];
  error?: string;
}

export interface NginxAnalyzeImportServersResponseDto {
  success?: boolean;
  candidates: NginxImportAnalyzeCandidateDto[];
}

export interface NginxUpstreamsResponseDto {
  success?: boolean;
  upstreams?: NginxUpstreamDto[];
}

export interface NginxSslCertificatesResponseDto {
  success?: boolean;
  certificates?: NginxSslCertificateDto[];
}

export interface NginxTrafficConfigResponseDto {
  success?: boolean;
  traffic?: NginxTrafficConfigDto;
}

export interface NginxPerformanceConfigResponseDto {
  success?: boolean;
  performance?: NginxPerformanceConfigDto;
}

export interface NginxModuleSettingsResponseDto {
  success?: boolean;
  settings?: NginxModuleSettingsDto;
}

export interface NginxLogLinesResponseDto {
  success?: boolean;
  lines?: string[];
}

export interface NginxLogsInfoResponseDto {
  success?: boolean;
  errorLog?: string;
  accessLog?: string;
}

export type NginxCommandResultResponseDto = NginxCommandResultDto;
export type NginxConfigValidationResponseDto = NginxConfigValidationDto;

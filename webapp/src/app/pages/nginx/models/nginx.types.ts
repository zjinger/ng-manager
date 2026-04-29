import type {
  CreateNginxServerRequestDto,
  NginxBindRequestDto,
  NginxBindResponseDto,
  NginxCommandResultDto,
  NginxConfigDto,
  NginxConfigValidationDto,
  NginxInstanceDto,
  NginxLocationDto,
  NginxModuleSettingsDto,
  NginxPerformanceConfigDto,
  NginxServerDto,
  NginxServerRuntimeStatusDto,
  NginxServerSummaryDto,
  NginxSslCertificateDto,
  NginxSslStatusDto,
  NginxStatsResponseDto,
  NginxStatusDto,
  NginxStatusResponseDto,
  NginxTrafficConfigDto,
  NginxUpstreamDto,
  NginxUpstreamHealthDto,
  NginxUpstreamStrategyDto,
  UpdateNginxServerRequestDto,
} from "@yinuo-ngm/protocol";

export type NginxInstance = NginxInstanceDto;
export type NginxStatus = NginxStatusDto;
export type NginxBindRequest = NginxBindRequestDto;
export type NginxConfig = NginxConfigDto;
export type NginxLocation = NginxLocationDto;
export type NginxServer = NginxServerDto;
export type CreateNginxServerRequest = CreateNginxServerRequestDto;
export type UpdateNginxServerRequest = UpdateNginxServerRequestDto;
export type NginxServerRuntimeStatus = NginxServerRuntimeStatusDto;
export type NginxCommandResult = NginxCommandResultDto;
export type NginxConfigValidation = NginxConfigValidationDto;
export type NginxStatusResponse = NginxStatusResponseDto;
export type NginxServerSummary = NginxServerSummaryDto;
export type NginxStatsResponse = NginxStatsResponseDto;
export type NginxBindResponse = NginxBindResponseDto;
export type NginxUpstreamStrategy = NginxUpstreamStrategyDto;
export type NginxUpstreamHealth = NginxUpstreamHealthDto;
export type NginxUpstream = NginxUpstreamDto;
export type NginxSslStatus = NginxSslStatusDto;
export type NginxSslCertificate = NginxSslCertificateDto;
export type NginxTrafficConfig = NginxTrafficConfigDto;
export type NginxPerformanceConfig = NginxPerformanceConfigDto;
export type NginxModuleSettings = NginxModuleSettingsDto;

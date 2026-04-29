import { realpath } from 'fs/promises';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { resolve } from 'path';
import { GlobalError, GlobalErrorCodes } from '@yinuo-ngm/errors';
import type { NginxApp } from '@yinuo-ngm/nginx';
import type {
  NginxCommandResultDto,
  NginxConfigDto,
  NginxConfigValidationDto,
  NginxInstanceDto,
  NginxLocationDto,
  NginxModuleSettingsDto,
  NginxPerformanceConfigDto,
  NginxServerDto,
  NginxServerRuntimeStatusDto,
  NginxSslCertificateDto,
  NginxStatusDto,
  NginxTrafficConfigDto,
  NginxUpstreamDto,
} from '@yinuo-ngm/protocol';
import type {
  NginxCommandResult,
  NginxConfig,
  NginxConfigValidation,
  NginxInstance,
  NginxLocation,
  NginxModuleSettings,
  NginxPerformanceConfig,
  NginxServer,
  NginxSslCertificate,
  NginxStatus,
  NginxTrafficConfig,
  NginxUpstream,
} from '@yinuo-ngm/nginx';

export interface NginxRouteContext {
  fastify: FastifyInstance;
  nginx: NginxApp;
  normalizeFsPath: (filePath: string) => string;
  ensureManageableConfigFile: (rawPath?: string) => Promise<string>;
}

export function createNginxRouteContext(fastify: FastifyInstance): NginxRouteContext {
  const nginx = fastify.core.nginx;
  const normalizeFsPath = (filePath: string): string => resolve(filePath).replace(/\\/g, '/').toLowerCase();
  const ensureManageableConfigFile = async (rawPath?: string): Promise<string> => {
const filePath = rawPath?.trim();
    if (!filePath) {
      throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, '配置文件路径不能为空');
    }

    const included: string[] = await nginx.config.getIncludedConfigs();
    const includedSet = new Set<string>();
    for (const item of included) {
      try {
        includedSet.add(normalizeFsPath(await realpath(item)));
      } catch {
        includedSet.add(normalizeFsPath(resolve(item)));
      }
    }

    const resolvedTarget = resolve(filePath);
    let normalizedTarget: string;
    try {
      normalizedTarget = normalizeFsPath(await realpath(resolvedTarget));
    } catch {
      normalizedTarget = normalizeFsPath(resolvedTarget);
    }

    if (!includedSet.has(normalizedTarget)) {
      throw new GlobalError(GlobalErrorCodes.OP_NOT_FOUND, '配置文件不在当前可管理列表中');
    }
    return resolvedTarget;
  };

  return {
    fastify,
    nginx,
    normalizeFsPath,
    ensureManageableConfigFile,
  };
}

export function sendBadRequest(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '未知错误');
  throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, message, {
    route: reply.request?.url,
    method: reply.request?.method,
  });
}

export function toNginxInstanceDto(instance: NginxInstance | null | undefined): NginxInstanceDto | null {
  if (!instance) return null;
  return {
    path: instance.path,
    version: instance.version,
    configPath: instance.configPath,
    prefixPath: instance.prefixPath,
    isBound: instance.isBound,
  };
}

export function toNginxStatusDto(status: NginxStatus): NginxStatusDto {
  return {
    isRunning: status.isRunning,
    pid: status.pid,
    uptime: status.uptime,
    activeConnections: status.activeConnections,
    workerProcesses: status.workerProcesses,
  };
}

export function toNginxConfigDto(config: NginxConfig): NginxConfigDto {
  return {
    mainConfigPath: config.mainConfigPath,
    content: config.content,
    isWritable: config.isWritable,
  };
}

export function toNginxLocationDto(location: NginxLocation): NginxLocationDto {
  return {
    path: location.path,
    proxyPass: location.proxyPass,
    root: location.root,
    index: location.index,
    tryFiles: location.tryFiles,
    rawConfig: location.rawConfig,
  };
}

export function toNginxServerDto(server: NginxServer): NginxServerDto {
  return {
    id: server.id,
    name: server.name,
    listen: server.listen,
    domains: server.domains,
    root: server.root,
    index: server.index,
    locations: (server.locations ?? []).map(toNginxLocationDto),
    ssl: server.ssl,
    sslCert: server.sslCert,
    sslKey: server.sslKey,
    enabled: server.enabled,
    extraConfig: server.extraConfig,
    configText: server.configText,
    filePath: server.filePath,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    createdBy: server.createdBy,
    runtimeStatus: server.runtimeStatus as NginxServerRuntimeStatusDto | undefined,
  };
}

export function toNginxCommandResultDto(result: NginxCommandResult): NginxCommandResultDto {
  return {
    success: result.success,
    output: result.output,
    error: result.error,
    exitCode: result.exitCode,
  };
}

export function toNginxConfigValidationDto(result: NginxConfigValidation): NginxConfigValidationDto {
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

export function toNginxUpstreamDto(upstream: NginxUpstream): NginxUpstreamDto {
  return {
    id: upstream.id,
    name: upstream.name,
    strategy: upstream.strategy,
    nodes: upstream.nodes,
    sourceFile: upstream.sourceFile,
    managed: upstream.managed,
    readonly: upstream.readonly,
    health: upstream.health,
    healthy: upstream.healthy,
  };
}

export function toNginxSslCertificateDto(certificate: NginxSslCertificate): NginxSslCertificateDto {
  return {
    id: certificate.id,
    domain: certificate.domain,
    certPath: certificate.certPath,
    keyPath: certificate.keyPath,
    expireAt: certificate.expireAt,
    status: certificate.status,
    autoRenew: certificate.autoRenew,
  };
}

export function toNginxTrafficConfigDto(config: NginxTrafficConfig): NginxTrafficConfigDto {
  return {
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimit: config.rateLimit,
    connLimitEnabled: config.connLimitEnabled,
    connLimit: config.connLimit,
    blacklistIps: config.blacklistIps,
  };
}

export function toNginxPerformanceConfigDto(config: NginxPerformanceConfig): NginxPerformanceConfigDto {
  return {
    gzipEnabled: config.gzipEnabled,
    gzipTypes: config.gzipTypes,
    keepaliveTimeout: config.keepaliveTimeout,
    workerProcesses: config.workerProcesses,
    sendfile: config.sendfile,
    tcpNopush: config.tcpNopush,
  };
}

export function toNginxModuleSettingsDto(settings: NginxModuleSettings): NginxModuleSettingsDto {
  return {
    backupRetention: settings.backupRetention,
    configBackupRetention: settings.configBackupRetention,
  };
}

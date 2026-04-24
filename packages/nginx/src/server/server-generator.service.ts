import { platform } from 'os';
import { NginxService } from '../core/nginx.service';
import type { CreateNginxServerRequest, NginxLocation, NginxServer } from '../types/nginx.types';

/**
 * Server 配置生成服务
 * 负责将 Server 数据结构转换为 Nginx 配置文本，以及对输入数据进行规范化处理
 * 该服务的目标是确保生成的 Nginx 配置文本符合预期的格式和语义，同时对输入数据进行合理的默认值处理和清洗
 * 例如，自动添加缺失的 listen 端口、规范化域名列表、处理 SSL 相关字段等
 * 通过集中管理这些逻辑，可以提高代码的可维护性和一致性，避免在多个地方重复实现相似的处理逻辑
 * 同时也为未来可能的配置生成需求提供了一个统一的入口，方便进行扩展和调整
 */
export class ServerGeneratorService {
  constructor(private readonly nginxService: NginxService) {}

  normalizeCreateRequest(request: CreateNginxServerRequest): Omit<NginxServer, 'id' | 'configText'> {
    const ssl = this.resolveSsl(request.ssl, request.protocol);
    const now = new Date().toISOString();
    return {
      name: this.normalizeName(request.name),
      listen: this.normalizeListenValues(request.listen, ssl),
      domains: this.normalizeDomains(request.domains),
      root: this.normalizeOptionalText(request.root),
      index: this.normalizeServerIndex(request.index),
      locations: this.normalizeLocations(request.locations),
      ssl,
      sslCert: this.normalizeOptionalText(request.sslCert),
      sslKey: this.normalizeOptionalText(request.sslKey),
      enabled: request.enabled !== false,
      extraConfig: this.normalizeOptionalText(request.extraConfig),
      createdAt: now,
      updatedAt: now,
      createdBy: this.normalizeManagedDisplayName(request.createdBy),
      filePath: undefined,
      runtimeStatus: undefined,
    };
  }

  normalizeName(value: string): string {
    const normalized = value?.trim();
    return normalized || `server-${Date.now()}`;
  }

  normalizeManagedDisplayName(value?: string): string | undefined {
    const normalized = String(value || '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    return normalized || undefined;
  }

  normalizeManagedServerId(value?: string): string | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return undefined;
    }
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(normalized)) {
      return undefined;
    }
    return normalized;
  }

  parseManagedDisplayName(content: string): string | undefined {
    return this.normalizeManagedDisplayName(this.parseManagedMeta(content, 'name'));
  }

  parseManagedMeta(content: string, key: string): string | undefined {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*#\\s*ngm-${escaped}\\s*:\\s*(.+?)\\s*$`, 'm');
    const marker = content.match(regex);
    if (!marker?.[1]) {
      return undefined;
    }
    const value = String(marker[1] || '').trim();
    return value || undefined;
  }

  generateServerConfig(server: {
    id?: string;
    name: string;
    listen: string[];
    domains?: string[];
    root?: string;
    index?: string[];
    locations: NginxLocation[];
    ssl?: boolean;
    sslCert?: string;
    sslKey?: string;
    extraConfig?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
  }): string {
    const lines: string[] = ['server {'];
    const displayName = this.normalizeManagedDisplayName(server.name);
    const managedId = this.normalizeManagedServerId(server.id);
    if (managedId) {
      lines.push(`    # ngm-id: ${managedId}`);
    }
    if (displayName) {
      lines.push(`    # ngm-name: ${displayName}`);
    }
    if (server.createdAt) {
      lines.push(`    # ngm-created-at: ${server.createdAt}`);
    }
    if (server.updatedAt) {
      lines.push(`    # ngm-updated-at: ${server.updatedAt}`);
    }
    if (server.createdBy) {
      lines.push(`    # ngm-created-by: ${server.createdBy}`);
    }

    for (const listen of this.normalizeListenValues(server.listen, Boolean(server.ssl))) {
      if (server.ssl && !/\bssl\b/.test(listen) && (listen === '443' || listen.startsWith('443 '))) {
        lines.push(`    listen ${listen} ssl;`);
      } else {
        lines.push(`    listen ${listen};`);
      }
    }

    const serverNames = (server.domains || []).filter(Boolean);
    lines.push(`    server_name ${(serverNames.length ? serverNames : ['_']).join(' ')};`);

    if (server.root) {
      lines.push(`    root ${this.toNginxPathValue(server.root)};`);
      const serverIndex = this.normalizeServerIndex(server.index);
      lines.push(`    index ${serverIndex.join(' ')};`);
    }

    if (server.ssl) {
      lines.push('');
      lines.push('    # SSL 配置');
      lines.push(`    ssl_certificate ${this.toNginxPathValue(server.sslCert || '/path/to/cert.pem')};`);
      lines.push(`    ssl_certificate_key ${this.toNginxPathValue(server.sslKey || '/path/to/key.pem')};`);
    }

    for (const loc of server.locations || []) {
      const normalizedPath = String(loc.path || '/').trim() || '/';
      lines.push('');
      lines.push(`    location ${normalizedPath} {`);

      if (loc.proxyPass) {
        lines.push(`        proxy_pass ${loc.proxyPass};`);
        const rawHeaderLines = new Set(
          (loc.rawConfig || '')
            .split(/\r?\n/)
            .map(line => line.trim().replace(/\s+/g, ' '))
            .filter(line => /^proxy_set_header\s+/i.test(line))
        );
        const rawDirectiveLines = new Set(
          (loc.rawConfig || '')
            .split(/\r?\n/)
            .map(line => line.trim().replace(/\s+/g, ' '))
            .filter(Boolean)
        );
        const defaultHeaderLines = [
          'proxy_set_header Host $host;',
          'proxy_set_header X-Real-IP $remote_addr;',
          'proxy_set_header REMOTE-HOST $remote_addr;',
          'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
          'proxy_set_header X-Forwarded-Proto $scheme;',
          'proxy_set_header X-Forwarded-Host $host;',
          'proxy_set_header X-Forwarded-Port $server_port;',
        ];
        for (const headerLine of defaultHeaderLines) {
          if (!rawHeaderLines.has(headerLine)) {
            lines.push(`        ${headerLine}`);
          }
        }
        const isWebSocketProxy = this.isWebSocketProxyLocation(loc.rawConfig);
        if (isWebSocketProxy) {
          const wsDirectives = [
            'proxy_http_version 1.1;',
            'proxy_set_header Upgrade $http_upgrade;',
            'proxy_set_header Connection "upgrade";',
          ];
          for (const directive of wsDirectives) {
            if (!rawDirectiveLines.has(directive)) {
              lines.push(`        ${directive}`);
            }
          }
        }
      }
      if (loc.root) {
        lines.push(`        root ${this.toNginxPathValue(loc.root)};`);
      }
      if (loc.index && loc.index.length > 0) {
        lines.push(`        index ${loc.index.join(' ')};`);
      }
      if (loc.tryFiles && loc.tryFiles.length > 0) {
        lines.push(`        try_files ${loc.tryFiles.join(' ')};`);
      }
      if (loc.rawConfig) {
        const extraLines = loc.rawConfig
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);
        for (const line of extraLines) {
          lines.push(`        ${line}`);
        }
      }

      lines.push('    }');
    }

    if (server.extraConfig) {
      lines.push('');
      const extraLines = server.extraConfig
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .filter(line => line.length > 0);
      for (const line of extraLines) {
        lines.push(`    ${line}`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  normalizeDomains(input?: string[]): string[] {
    return (input || [])
      .flatMap(item => item.split(/[,\s]+/))
      .map(item => item.trim())
      .filter(Boolean);
  }

  normalizeListenValues(input?: string[], ssl = false): string[] {
    const normalized = (input || [])
      .flatMap(item => item.split(','))
      .map(item => item.trim())
      .filter(Boolean);
    if (!normalized.length) {
      return [ssl ? '443' : '80'];
    }
    return normalized;
  }

  normalizeLocations(locations?: NginxLocation[]): NginxLocation[] {
    return (locations || []).map(location => ({
      path: location.path?.trim() || '/',
      proxyPass: this.normalizeOptionalText(location.proxyPass),
      root: this.normalizeOptionalText(location.root),
      index: location.index?.map(item => item.trim()).filter(Boolean),
      tryFiles: location.tryFiles?.map(item => item.trim()).filter(Boolean),
      rawConfig: this.normalizeOptionalText(location.rawConfig),
    }));
  }

  normalizeServerIndex(input?: string[], fallbackToDefault = true): string[] {
    const values = (input || [])
      .flatMap(item => String(item || '').split(/[,\s]+/))
      .map(item => item.trim())
      .filter(Boolean);
    const unique = values.filter((item, idx, arr) => arr.indexOf(item) === idx);
    if (!unique.length && fallbackToDefault) {
      return ['index.html'];
    }
    return unique;
  }

  normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  stripOptionalQuotes(value?: string): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return undefined;
    }
    const unquoted = normalized.replace(/^["']|["']$/g, '');
    return this.fromNginxPathValue(unquoted);
  }

  resolveSsl(current: boolean | undefined, protocol?: 'http' | 'https'): boolean {
    if (protocol === 'https') {
      return true;
    }
    if (protocol === 'http') {
      return false;
    }
    return Boolean(current);
  }

  isDefaultProxySetHeaderLine(line: string): boolean {
    const normalized = line.replace(/\s+/g, ' ').trim();
    const defaults = new Set([
      'proxy_set_header Host $host;',
      'proxy_set_header X-Real-IP $remote_addr;',
      'proxy_set_header REMOTE-HOST $remote_addr;',
      'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      'proxy_set_header X-Forwarded-Proto $scheme;',
      'proxy_set_header X-Forwarded-Host $host;',
      'proxy_set_header X-Forwarded-Port $server_port;',
      'proxy_set_header Upgrade $http_upgrade;',
      'proxy_set_header Connection "upgrade";',
    ]);
    return defaults.has(normalized);
  }

  isWebSocketProxyLocation(rawConfig?: string): boolean {
    const normalizedRaw = String(rawConfig || '').toLowerCase();
    return normalizedRaw.includes('upgrade $http_upgrade') || normalizedRaw.includes('connection "upgrade"');
  }

  private toNginxPathValue(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return normalized;
    }
    if (this.isWindowsRuntime()) {
      const windowsPath = normalized.replace(/\//g, '\\');
      const escaped = windowsPath.replace(/\\/g, '\\\\');
      return /\s/.test(windowsPath) ? `"${escaped}"` : escaped;
    }

    const unixPath = normalized.replace(/\\/g, '/');
    return /\s/.test(unixPath) ? `"${unixPath}"` : unixPath;
  }

  private fromNginxPathValue(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return normalized;
    }
    if (this.isWindowsRuntime()) {
      return normalized.replace(/\\\\/g, '\\');
    }
    return normalized;
  }

  private isWindowsRuntime(): boolean {
    if (platform() === 'win32') {
      return true;
    }
    const boundPath = this.nginxService.getInstance()?.path || '';
    return /^[a-zA-Z]:[\\/]/.test(boundPath);
  }
}


import { createHash, randomUUID } from 'crypto';
import { access, constants, readFile, rename as fsRename, symlink, unlink } from 'fs/promises';
import { platform } from 'os';
import { basename, dirname, join } from 'path';
import { NginxConfigService } from './nginx-config.service';
import { NginxService } from './nginx.service';
import type {
  CreateNginxServerRequest,
  NginxLocation,
  NginxServer,
  UpdateNginxServerRequest,
} from './nginx.types';

/**
 * Nginx Server 块管理服务
 * 负责 server 块的增删改查、启用/禁用等
 */
export class NginxServerService {
  private readonly disableStartMarker = '# ngm:disable-start';
  private readonly disableEndMarker = '# ngm:disable-end';
  private servers: Map<string, NginxServer> = new Map();
  private serverSources: Map<string, { filePath: string; start: number; end: number }> = new Map();

  constructor(
    private nginxService: NginxService,
    private configService: NginxConfigService
  ) {}

  /**
   * 获取所有 server 块
   */
  async getAllServers(): Promise<NginxServer[]> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return [];
    }

    await this.parseServersFromConfig();
    return Array.from(this.servers.values());
  }

  /**
   * 获取单个 server
   */
  async getServer(id: string): Promise<NginxServer | null> {
    await this.parseServersFromConfig();
    return this.servers.get(id) || null;
  }

  /**
   * 创建 server
   */
  async createServer(request: CreateNginxServerRequest): Promise<NginxServer> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw new Error('Nginx 未绑定');
    }

    const ssl = this.resolveSsl(request.ssl, request.protocol);
    const normalizedName = this.normalizeName(request.name);
    const now = new Date().toISOString();
    const normalizedServer: NginxServer = {
      id: '',
      name: normalizedName,
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
      configText: '',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    };
    await this.parseServersFromConfig();
    this.ensureNoPortConflicts(null, normalizedServer.listen, normalizedServer.enabled);

    const configDir = await this.configService.resolveServerConfigDir();
    const filePath = await this.makeGeneratedConfigPath(configDir);
    normalizedServer.filePath = filePath;
    normalizedServer.id = this.createServerId(filePath, 0);
    normalizedServer.configText = this.generateServerConfig(normalizedServer);

    await this.configService.writeConfigFile(filePath, normalizedServer.configText);
    this.serverSources.set(normalizedServer.id, {
      filePath,
      start: 0,
      end: normalizedServer.configText.length,
    });
    await this.applyEnabledState(normalizedServer, normalizedServer.enabled);

    this.servers.set(normalizedServer.id, normalizedServer);
    return normalizedServer;
  }

  /**
   * 更新 server
   */
  async updateServer(id: string, request: UpdateNginxServerRequest): Promise<NginxServer> {
    const current = await this.getServer(id);
    if (!current) {
      throw new Error('Server 不存在');
    }

    const nextServer: NginxServer = {
      ...current,
      listen: [...(current.listen || [])],
      domains: [...(current.domains || [])],
      index: [...(current.index || [])],
      locations: (current.locations || []).map(item => ({ ...item })),
    };

    if (request.name !== undefined) nextServer.name = this.normalizeName(request.name);
    if (request.listen !== undefined) {
      nextServer.listen = this.normalizeListenValues(
        request.listen,
        this.resolveSsl(request.ssl ?? nextServer.ssl, request.protocol)
      );
    }
    if (request.domains !== undefined) nextServer.domains = this.normalizeDomains(request.domains);
    if (request.root !== undefined) nextServer.root = this.normalizeOptionalText(request.root);
    if (request.index !== undefined) nextServer.index = this.normalizeServerIndex(request.index);
    if (request.locations !== undefined) nextServer.locations = this.normalizeLocations(request.locations);
    if (request.protocol !== undefined) nextServer.ssl = this.resolveSsl(nextServer.ssl, request.protocol);
    if (request.ssl !== undefined) nextServer.ssl = this.resolveSsl(request.ssl, undefined);
    if (request.sslCert !== undefined) nextServer.sslCert = this.normalizeOptionalText(request.sslCert);
    if (request.sslKey !== undefined) nextServer.sslKey = this.normalizeOptionalText(request.sslKey);
    if (request.extraConfig !== undefined) nextServer.extraConfig = this.normalizeOptionalText(request.extraConfig);
    nextServer.updatedAt = new Date().toISOString();

    const nextEnabled = request.enabled ?? nextServer.enabled;
    this.ensureNoPortConflicts(id, nextServer.listen, nextEnabled);
    nextServer.configText = this.generateServerConfig(nextServer);

    let source = this.serverSources.get(id);
    if (!source) {
      throw new Error('Server 配置文件不存在');
    }

    const oldId = id;
    let finalId = oldId;
    const oldFilePath = source.filePath;
    const shouldAttemptRename = request.name !== undefined && this.normalizeName(request.name) !== current.name;
    if (shouldAttemptRename) {
      const renamed = await this.tryRenameServerConfigFile(oldFilePath, source, nextServer.name);
      if (renamed) {
        source = {
          ...source,
          filePath: renamed.newFilePath,
        };
        nextServer.filePath = renamed.newFilePath;
        finalId = this.createServerId(renamed.newFilePath, 0);
      }
    }

    await this.replaceServerBlock(source.filePath, source.start, source.end, nextServer.configText);
    source = {
      filePath: source.filePath,
      start: source.start,
      end: source.start + nextServer.configText.length,
    };
    this.serverSources.delete(oldId);
    this.serverSources.set(finalId, source);
    nextServer.id = finalId;

    try {
      await this.applyEnabledState(nextServer, nextEnabled);
    } catch (error: any) {
      // 编辑后块长度变化会导致旧坐标失效，重建索引后重试一次
      if (!this.isServerSourceOutdatedError(error)) {
        throw error;
      }
      await this.parseServersFromConfig();
      await this.applyEnabledState(nextServer, nextEnabled);
    }

    nextServer.enabled = nextEnabled;
    this.servers.delete(oldId);
    this.servers.set(finalId, nextServer);
    return nextServer;
  }

  /**
   * 删除 server
   */
  async deleteServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }

    const source = this.serverSources.get(id);
    const filePath = source?.filePath || server.filePath;
    if (source) {
      await this.removeServerBlock(source.filePath, source.start, source.end);
    } else if (filePath) {
      try {
        await unlink(filePath);
      } catch {
        // 文件不存在，忽略
      }
    }

    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    if (sitesEnabledDir && filePath) {
      const linkPath = join(sitesEnabledDir, basename(filePath));
      try {
        await unlink(linkPath);
      } catch {
        // 链接不存在，忽略
      }
    }

    this.servers.delete(id);
  }

  /**
   * 启用 server
   */
  async enableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }
    this.ensureNoPortConflicts(id, server.listen, true);
    await this.applyEnabledState(server, true);
    server.enabled = true;
    this.servers.set(id, server);
  }

  /**
   * 禁用 server
   */
  async disableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }
    await this.applyEnabledState(server, false);
    server.enabled = false;
    this.servers.set(id, server);
  }

  private async parseServersFromConfig(): Promise<void> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return;
    }

    this.servers.clear();
    this.serverSources.clear();

    const configFiles = await this.configService.getIncludedConfigs();

    for (const filePath of configFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const sanitizedContent = this.stripCommentsPreserveOffsets(content);
        const servers = await this.parseServerBlocks(content, sanitizedContent, filePath);

        for (const server of servers) {
          this.servers.set(server.id, server);
        }
      } catch {
        // 读取失败，忽略
      }
    }
  }

  private async parseServerBlocks(content: string, sanitizedContent: string, filePath: string): Promise<NginxServer[]> {
    type Candidate = {
      start: number;
      end: number;
      blockContent: string;
      sanitizedBlockContent: string;
      enabledOverride?: boolean;
    };

    const candidates: Candidate[] = [];
    const disabledCandidates = this.extractDisabledServerCandidates(content);
    candidates.push(...disabledCandidates);

    const serverTokenRegex = /\bserver\b/g;
    let match: RegExpExecArray | null = null;
    while ((match = serverTokenRegex.exec(sanitizedContent)) !== null) {
      let cursor = match.index + match[0].length;
      while (cursor < sanitizedContent.length && /\s/.test(sanitizedContent[cursor])) {
        cursor += 1;
      }

      if (sanitizedContent[cursor] !== '{') {
        continue;
      }

      const end = this.findBlockEnd(sanitizedContent, cursor);
      if (end < 0) {
        continue;
      }

      candidates.push({
        start: match.index,
        end: end + 1,
        blockContent: content.slice(cursor + 1, end),
        sanitizedBlockContent: sanitizedContent.slice(cursor + 1, end),
      });

      serverTokenRegex.lastIndex = end + 1;
    }

    const servers: NginxServer[] = [];
    const sorted = candidates.sort((a, b) => a.start - b.start);
    for (let blockIndex = 0; blockIndex < sorted.length; blockIndex += 1) {
      const candidate = sorted[blockIndex];
      const server = await this.parseServerBlock(
        candidate.blockContent,
        candidate.sanitizedBlockContent,
        filePath,
        blockIndex,
        candidate.enabledOverride
      );
      if (!server) {
        continue;
      }
      servers.push(server);
      this.serverSources.set(server.id, {
        filePath,
        start: candidate.start,
        end: candidate.end,
      });
    }

    return servers;
  }

  private async parseServerBlock(
    content: string,
    sanitizedContent: string,
    filePath: string,
    blockIndex: number,
    enabledOverride?: boolean
  ): Promise<NginxServer | null> {
    const listenValues = this.extractTopLevelDirectiveValues(sanitizedContent, 'listen');
    const listen = listenValues.length ? listenValues : ['80'];

    const serverNameValue =
      this.extractTopLevelDirectiveValues(sanitizedContent, 'server_name')[0] ||
      sanitizedContent.match(/server_name\s+([^;]+);/)?.[1] ||
      '';
    const domains =
      serverNameValue
        ?.trim()
        .split(/\s+/)
        .map(item => item.trim())
        .filter(item => item !== '_')
        .filter(Boolean) || [];

    const metadataName = this.parseManagedDisplayName(content);
    const metadataCreatedAt = this.parseManagedMeta(content, 'created-at');
    const metadataUpdatedAt = this.parseManagedMeta(content, 'updated-at');
    const metadataCreatedBy = this.parseManagedMeta(content, 'created-by');
    const name = this.normalizeName(metadataName || domains[0] || basename(filePath, '.conf') || '_');
    const rootValue =
      this.extractTopLevelDirectiveValues(sanitizedContent, 'root')[0] ||
      sanitizedContent.match(/^\s*root\s+([^;]+);/m)?.[1];
    const indexValue = this.extractTopLevelDirectiveValues(sanitizedContent, 'index')[0];
    const sslCertValue =
      this.extractTopLevelDirectiveValues(sanitizedContent, 'ssl_certificate')[0] ||
      sanitizedContent.match(/ssl_certificate\s+([^;]+);/)?.[1];
    const sslKeyValue =
      this.extractTopLevelDirectiveValues(sanitizedContent, 'ssl_certificate_key')[0] ||
      sanitizedContent.match(/ssl_certificate_key\s+([^;]+);/)?.[1];
    const ssl = Boolean(sslCertValue) || listen.some(item => /\bssl\b/.test(item));
    const locations = this.parseLocations(sanitizedContent);

    let enabled = true;
    if (enabledOverride !== undefined) {
      enabled = enabledOverride;
    } else if (filePath.includes('sites-available')) {
      const sitesEnabledDir = this.configService.getSitesEnabledDir();
      if (sitesEnabledDir) {
        const linkPath = join(sitesEnabledDir, basename(filePath));
        try {
          await access(linkPath, constants.F_OK);
        } catch {
          enabled = false;
        }
      }
    }

    const id = this.createServerId(filePath, blockIndex);
    return {
      id,
      name,
      listen,
      domains,
      root: this.stripOptionalQuotes(rootValue?.trim()),
      index: this.normalizeServerIndex(indexValue?.split(/\s+/), Boolean(rootValue)),
      locations,
      ssl,
      sslCert: this.stripOptionalQuotes(sslCertValue?.trim()),
      sslKey: this.stripOptionalQuotes(sslKeyValue?.trim()),
      enabled,
      extraConfig: '',
      configText: `server {${content}}`,
      filePath,
      createdAt: metadataCreatedAt,
      updatedAt: metadataUpdatedAt,
      createdBy: metadataCreatedBy,
    };
  }

  private extractDisabledServerCandidates(content: string): Array<{
    start: number;
    end: number;
    blockContent: string;
    sanitizedBlockContent: string;
    enabledOverride: boolean;
  }> {
    const candidates: Array<{
      start: number;
      end: number;
      blockContent: string;
      sanitizedBlockContent: string;
      enabledOverride: boolean;
    }> = [];

    const wrapperRegex =
      /^[ \t]*#\s*ngm:disable-start[^\r\n]*\r?\n([\s\S]*?)^[ \t]*#\s*ngm:disable-end[^\r\n]*(?:\r?\n)?/gm;
    let match: RegExpExecArray | null = null;

    while ((match = wrapperRegex.exec(content)) !== null) {
      const wrappedContent = match[1] || '';
      const uncommented = this.uncommentDisabledContent(wrappedContent);
      const serverToken = /\bserver\b/.exec(uncommented);
      if (!serverToken) {
        continue;
      }

      let cursor = serverToken.index + serverToken[0].length;
      while (cursor < uncommented.length && /\s/.test(uncommented[cursor])) {
        cursor += 1;
      }
      if (uncommented[cursor] !== '{') {
        continue;
      }

      const end = this.findBlockEnd(uncommented, cursor);
      if (end < 0) {
        continue;
      }

      const blockContent = uncommented.slice(cursor + 1, end);
      candidates.push({
        start: match.index,
        end: wrapperRegex.lastIndex,
        blockContent,
        sanitizedBlockContent: this.stripCommentsPreserveOffsets(blockContent),
        enabledOverride: false,
      });
    }

    return candidates;
  }

  private uncommentDisabledContent(content: string): string {
    const lineBreak = content.includes('\r\n') ? '\r\n' : '\n';
    return content
      .split(/\r?\n/)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join(lineBreak);
  }

  private findBlockEnd(content: string, openBraceIndex: number): number {
    let depth = 0;
    for (let i = openBraceIndex; i < content.length; i += 1) {
      const ch = content[i];
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  private parseLocations(content: string): NginxLocation[] {
    const locations: NginxLocation[] = [];
    const locationRegex = /location\s+(\S+)\s*\{([^}]*)\}/gs;
    let match: RegExpExecArray | null = null;

    while ((match = locationRegex.exec(content)) !== null) {
      const path = match[1];
      const blockContent = match[2];
      let proxyPass: string | undefined;
      let root: string | undefined;
      let index: string[] | undefined;
      let tryFiles: string[] | undefined;
      const extraLines: string[] = [];

      const lines = blockContent.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        const proxyMatch = line.match(/^proxy_pass\s+([^;]+);$/i);
        if (proxyMatch) {
          proxyPass = this.stripOptionalQuotes(proxyMatch[1]?.trim());
          continue;
        }

        const rootMatch = line.match(/^root\s+([^;]+);$/i);
        if (rootMatch) {
          root = this.stripOptionalQuotes(rootMatch[1]?.trim());
          continue;
        }

        const indexMatch = line.match(/^index\s+([^;]+);$/i);
        if (indexMatch) {
          index = indexMatch[1]
            ?.trim()
            .split(/\s+/)
            .map(item => item.trim())
            .filter(Boolean);
          continue;
        }

        const tryFilesMatch = line.match(/^try_files\s+([^;]+);$/i);
        if (tryFilesMatch) {
          tryFiles = tryFilesMatch[1]
            ?.trim()
            .split(/\s+/)
            .map(item => item.trim())
            .filter(Boolean);
          continue;
        }

        if (this.isDefaultProxySetHeaderLine(line)) {
          continue;
        }

        extraLines.push(line);
      }

      locations.push({
        path,
        proxyPass,
        root,
        index,
        tryFiles,
        rawConfig: extraLines.length ? extraLines.join('\n') : undefined,
      });
    }

    return locations;
  }

  private generateServerConfig(server: {
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
      lines.push('');
      lines.push(`    location ${loc.path} {`);

      if (loc.proxyPass) {
        lines.push(`        proxy_pass ${loc.proxyPass};`);
        lines.push('        proxy_set_header Host $host;');
        lines.push('        proxy_set_header X-Real-IP $remote_addr;');
        lines.push('        proxy_set_header REMOTE-HOST $remote_addr;');
        lines.push('        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
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

  private normalizeName(value: string): string {
    const normalized = value?.trim();
    return normalized || `server-${Date.now()}`;
  }

  private normalizeManagedDisplayName(value?: string): string | undefined {
    const normalized = String(value || '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    return normalized || undefined;
  }

  private parseManagedDisplayName(content: string): string | undefined {
    return this.normalizeManagedDisplayName(this.parseManagedMeta(content, 'name'));
  }

  private parseManagedMeta(content: string, key: string): string | undefined {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*#\\s*ngm-${escaped}\\s*:\\s*(.+?)\\s*$`, 'm');
    const marker = content.match(regex);
    if (!marker?.[1]) {
      return undefined;
    }
    const value = String(marker[1] || '').trim();
    return value || undefined;
  }

  private isDefaultProxySetHeaderLine(line: string): boolean {
    const normalized = line.replace(/\s+/g, ' ').trim();
    const defaults = new Set([
      'proxy_set_header Host $host;',
      'proxy_set_header X-Real-IP $remote_addr;',
      'proxy_set_header REMOTE-HOST $remote_addr;',
      'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    ]);
    return defaults.has(normalized);
  }

  private normalizeDomains(input?: string[]): string[] {
    return (input || [])
      .flatMap(item => item.split(/[,\s]+/))
      .map(item => item.trim())
      .filter(Boolean);
  }

  private normalizeListenValues(input?: string[], ssl = false): string[] {
    const normalized = (input || [])
      .flatMap(item => item.split(','))
      .map(item => item.trim())
      .filter(Boolean);

    if (!normalized.length) {
      return [ssl ? '443' : '80'];
    }
    return normalized;
  }

  private normalizeLocations(locations?: NginxLocation[]): NginxLocation[] {
    const normalized = (locations || []).map(location => ({
      path: location.path?.trim() || '/',
      proxyPass: this.normalizeOptionalText(location.proxyPass),
      root: this.normalizeOptionalText(location.root),
      index: location.index?.map(item => item.trim()).filter(Boolean),
      tryFiles: location.tryFiles?.map(item => item.trim()).filter(Boolean),
      rawConfig: this.normalizeOptionalText(location.rawConfig),
    }));
    return normalized;
  }

  private normalizeServerIndex(input?: string[], fallbackToDefault = true): string[] {
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

  private extractTopLevelDirectiveValues(content: string, directive: string): string[] {
    const values: string[] = [];
    let depth = 0;
    let statement = '';
    const prefix = `${directive} `;

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];

      if (ch === '{') {
        if (depth === 0) {
          statement = '';
        }
        depth += 1;
        continue;
      }

      if (ch === '}') {
        if (depth > 0) {
          depth -= 1;
        }
        continue;
      }

      if (depth !== 0) {
        continue;
      }

      statement += ch;
      if (ch !== ';') {
        continue;
      }

      const normalized = statement.replace(/\s+/g, ' ').trim();
      statement = '';
      if (!normalized.endsWith(';') || !normalized.startsWith(prefix)) {
        continue;
      }

      const value = normalized.slice(prefix.length, -1).trim();
      if (value) {
        values.push(value);
      }
    }

    return values;
  }

  private normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private stripOptionalQuotes(value?: string): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return undefined;
    }
    const unquoted = normalized.replace(/^["']|["']$/g, '');
    return this.fromNginxPathValue(unquoted);
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

  private resolveSsl(current: boolean | undefined, protocol?: 'http' | 'https'): boolean {
    if (protocol === 'https') {
      return true;
    }
    if (protocol === 'http') {
      return false;
    }
    return Boolean(current);
  }

  private async applyEnabledState(server: NginxServer, enabled: boolean): Promise<void> {
    if (!server.filePath) {
      throw new Error('Server 配置文件不存在');
    }

    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    const sitesAvailableDir = this.configService.getSitesAvailableDir();
    const normalizedFilePath = server.filePath.replace(/\\/g, '/');
    const normalizedSitesAvailableDir = sitesAvailableDir?.replace(/\\/g, '/');
    const shouldUseSitesLink =
      Boolean(sitesEnabledDir) &&
      Boolean(normalizedSitesAvailableDir) &&
      normalizedFilePath.startsWith(normalizedSitesAvailableDir!);

    if (shouldUseSitesLink) {
      const linkPath = join(sitesEnabledDir!, basename(server.filePath));
      if (enabled) {
        try {
          await symlink(server.filePath, linkPath);
        } catch (error: any) {
          if (error.code !== 'EEXIST') {
            throw error;
          }
        }
        return;
      }

      try {
        await unlink(linkPath);
      } catch {
        // 链接不存在，忽略
      }
      return;
    }

    const source = await this.resolveServerSource(server);
    const original = await readFile(source.filePath, 'utf-8');
    if (source.start < 0 || source.end > original.length || source.start >= source.end) {
      throw new Error('Server 配置块定位失败，请刷新后重试');
    }

    const segment = original.slice(source.start, source.end);
    const alreadyDisabled = this.isDisabledWrappedBlock(segment);
    if (enabled && !alreadyDisabled) {
      return;
    }
    if (!enabled && alreadyDisabled) {
      return;
    }

    const transformed = enabled ? this.unwrapDisabledBlock(segment) : this.wrapDisabledBlock(segment);
    const next = `${original.slice(0, source.start)}${transformed}${original.slice(source.end)}`;
    await this.configService.writeConfigFile(source.filePath, next);
  }

  private async resolveServerSource(server: NginxServer): Promise<{ filePath: string; start: number; end: number }> {
    const cached = this.serverSources.get(server.id);
    if (cached) {
      return cached;
    }

    await this.parseServersFromConfig();
    const reparsed = this.serverSources.get(server.id);
    if (reparsed) {
      return reparsed;
    }

    return {
      filePath: server.filePath!,
      start: 0,
      end: (server.configText || '').length,
    };
  }

  private async tryRenameServerConfigFile(
    oldFilePath: string,
    source: { filePath: string; start: number; end: number },
    nextName: string
  ): Promise<{ newFilePath: string } | null> {
    const canRename = await this.canRenameServerConfigFile(oldFilePath, source.start, source.end);
    if (!canRename) {
      return null;
    }

    const nextStem = this.makeSafeFileStem(nextName);
    const nextFilePath = await this.makeUniqueConfigPath(dirname(oldFilePath), `${nextStem}.conf`);
    if (this.normalizeFsPath(nextFilePath) === this.normalizeFsPath(oldFilePath)) {
      return null;
    }

    await fsRename(oldFilePath, nextFilePath);
    await this.cleanupSitesEnabledLinkOnRename(oldFilePath);
    return { newFilePath: nextFilePath };
  }

  private async canRenameServerConfigFile(filePath: string, start: number, end: number): Promise<boolean> {
    if (!/\.conf$/i.test(filePath)) {
      return false;
    }

    const instance = this.nginxService.getInstance();
    if (instance && this.normalizeFsPath(filePath) === this.normalizeFsPath(instance.configPath)) {
      return false;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const head = content.slice(0, Math.max(0, start));
      const tail = content.slice(Math.max(0, end));
      return !head.trim() && !tail.trim();
    } catch {
      return false;
    }
  }

  private async cleanupSitesEnabledLinkOnRename(oldFilePath: string): Promise<void> {
    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    if (!sitesEnabledDir) {
      return;
    }

    const oldLink = join(sitesEnabledDir, basename(oldFilePath));
    try {
      await unlink(oldLink);
    } catch {
      // old link may not exist
    }
  }

  private normalizeFsPath(filePath: string): string {
    return filePath.replace(/\\/g, '/').toLowerCase();
  }

  private isDisabledWrappedBlock(segment: string): boolean {
    return segment.includes(this.disableStartMarker) && segment.includes(this.disableEndMarker);
  }

  private wrapDisabledBlock(segment: string): string {
    const lineBreak = segment.includes('\r\n') ? '\r\n' : '\n';
    const commentedBody = segment
      .split(/\r?\n/)
      .map(line => `# ${line}`)
      .join(lineBreak);
    return `${this.disableStartMarker}${lineBreak}${commentedBody}${lineBreak}${this.disableEndMarker}`;
  }

  private unwrapDisabledBlock(segment: string): string {
    const lineBreak = segment.includes('\r\n') ? '\r\n' : '\n';
    const lines = segment.split(/\r?\n/);
    const startIndex = lines.findIndex(line => line.includes(this.disableStartMarker.slice(1).trim()));
    const endIndex = lines.findIndex(line => line.includes(this.disableEndMarker.slice(1).trim()));
    if (startIndex < 0 || endIndex <= startIndex) {
      return segment;
    }

    const body = lines
      .slice(startIndex + 1, endIndex)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join(lineBreak);
    return body;
  }

  private async replaceServerBlock(
    filePath: string,
    start: number,
    end: number,
    nextBlockContent: string
  ): Promise<void> {
    const original = await readFile(filePath, 'utf-8');
    if (start < 0 || end > original.length || start >= end) {
      throw new Error('Server 配置块定位失败，请刷新后重试');
    }

    const next = `${original.slice(0, start)}${nextBlockContent}${original.slice(end)}`;
    await this.configService.writeConfigFile(filePath, next);
  }

  private async removeServerBlock(filePath: string, start: number, end: number): Promise<void> {
    const original = await readFile(filePath, 'utf-8');
    if (start < 0 || end > original.length || start >= end) {
      throw new Error('Server 配置块定位失败，请刷新后重试');
    }

    const next = `${original.slice(0, start)}${original.slice(end)}`;
    if (!next.trim()) {
      try {
        await unlink(filePath);
      } catch {
        // 文件不存在，忽略
      }
      return;
    }

    await this.configService.writeConfigFile(filePath, next);
  }

  private isServerSourceOutdatedError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('Server 配置块定位失败');
  }

  private createServerId(filePath: string, blockIndex: number): string {
    return createHash('sha1').update(`${filePath}#${blockIndex}`).digest('hex').slice(0, 24);
  }

  private makeSafeFileStem(input: string): string {
    return (
      input
        .trim()
        .toLowerCase()
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'server'
    );
  }

  private async makeGeneratedConfigPath(dir: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fileName = `ngm-${this.genId('srv')}.conf`;
      const candidate = join(dir, fileName);
      try {
        await access(candidate, constants.F_OK);
      } catch {
        return candidate;
      }
    }

    return join(dir, `ngm-${Date.now()}-${randomUUID().slice(0, 8)}.conf`);
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${randomUUID().replace(/-/g, '').slice(0, 6)}`;
  }

  private ensureNoPortConflicts(excludeId: string | null, listen: string[], enabled: boolean): void {
    if (!enabled) {
      return;
    }

    const candidatePorts = this.extractListenPorts(listen);
    if (!candidatePorts.length) {
      return;
    }

    const ownersByPort = new Map<number, Set<string>>();
    for (const server of this.servers.values()) {
      if (!server.enabled) {
        continue;
      }
      if (excludeId && server.id === excludeId) {
        continue;
      }

      for (const port of this.extractListenPorts(server.listen)) {
        if (!ownersByPort.has(port)) {
          ownersByPort.set(port, new Set<string>());
        }
        ownersByPort.get(port)!.add(server.name || server.id);
      }
    }

    const conflicts: string[] = [];
    for (const port of candidatePorts) {
      const owners = ownersByPort.get(port);
      if (!owners?.size) {
        continue;
      }
      conflicts.push(`${port}（已被 ${Array.from(owners).join('、')} 使用）`);
    }

    if (conflicts.length) {
      throw new Error(`监听端口冲突: ${conflicts.join('，')}`);
    }
  }

  private extractListenPorts(listen: string[]): number[] {
    const ports = new Set<number>();
    for (const item of listen || []) {
      const port = this.parseListenPort(item);
      if (port !== null) {
        ports.add(port);
      }
    }
    return Array.from(ports.values()).sort((a, b) => a - b);
  }

  private parseListenPort(rawListen: string): number | null {
    const text = String(rawListen || '').trim();
    if (!text || /^unix:/i.test(text)) {
      return null;
    }

    const headToken = text.split(/\s+/)[0] || '';
    let portToken = headToken;

    if (/^\[[^\]]+\]:\d+$/.test(headToken)) {
      portToken = headToken.replace(/^.*\]:/, '');
    } else if (headToken.includes(':')) {
      portToken = headToken.slice(headToken.lastIndexOf(':') + 1);
    }

    const port = Number(portToken);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }
    return port;
  }

  private async makeUniqueConfigPath(dir: string, fileName: string): Promise<string> {
    const initial = join(dir, fileName);
    try {
      await access(initial, constants.F_OK);
      const stem = basename(fileName, '.conf');
      return join(dir, `${stem}-${Date.now()}-${randomUUID().slice(0, 8)}.conf`);
    } catch {
      return initial;
    }
  }

  private stripCommentsPreserveOffsets(content: string): string {
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];

      if (!inSingleQuote && !inDoubleQuote && ch === '#') {
        result += ' ';
        i += 1;
        while (i < content.length && content[i] !== '\n' && content[i] !== '\r') {
          result += ' ';
          i += 1;
        }
        if (i < content.length) {
          result += content[i];
        }
        escaped = false;
        continue;
      }

      result += ch;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (!inDoubleQuote && ch === '\'') {
        inSingleQuote = !inSingleQuote;
      } else if (!inSingleQuote && ch === '"') {
        inDoubleQuote = !inDoubleQuote;
      }
    }

    return result;
  }
}

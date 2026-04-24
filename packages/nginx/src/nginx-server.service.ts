import { createHash, randomUUID } from 'crypto';
import { access, constants, readFile, rename as fsRename, symlink, unlink } from 'fs/promises';
import { platform } from 'os';
import { basename, dirname, join } from 'path';
import { NginxConfigService } from './nginx-config.service';
import { findBlockEnd, stripCommentsPreserveOffsets } from './nginx-module-utils';
import { NginxService } from './nginx.service';
import type {
  CreateNginxServerRequest,
  NginxLocation,
  NginxServer,
  UpdateNginxServerRequest,
} from './nginx.types';
import { nginxErrors } from '@yinuo-ngm/errors';

export interface NginxImportIssue {
  level: 'error' | 'warning';
  message: string;
  field?: 'name' | 'domains' | 'listen';
}

export interface NginxImportParseCandidate {
  request?: CreateNginxServerRequest;
  error?: string;
}

export interface NginxImportAnalyzeCandidate {
  request?: CreateNginxServerRequest;
  issues?: NginxImportIssue[];
  error?: string;
}

/**
 * Nginx Server 块管理服务
 * 负责 server 块的增删改查、启用/禁用等
 */
export class NginxServerService {
  private readonly disableStartMarker = '# ngm:disable-start';
  private readonly disableEndMarker = '# ngm:disable-end';
  private readonly maxDeletedSnapshots = 100;
  private servers: Map<string, NginxServer> = new Map();
  private serverSources: Map<string, { filePath: string; start: number; end: number }> = new Map();
  private deletedSnapshots: Map<string, { request: CreateNginxServerRequest; createdAt: number }> = new Map();

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
      throw nginxErrors.notBound();
    }

    const ssl = this.resolveSsl(request.ssl, request.protocol);
    const normalizedName = this.normalizeName(request.name);
    const now = new Date().toISOString();
    const createdBy = this.normalizeManagedDisplayName(request.createdBy);
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
      createdBy,
    };
    await this.parseServersFromConfig();
    this.ensureNoPortConflicts(null, normalizedServer.listen, normalizedServer.enabled);

    const configDir = await this.configService.resolveServerConfigDir();
    const filePath = await this.makeGeneratedConfigPath(configDir);
    normalizedServer.filePath = filePath;
    normalizedServer.id = this.createManagedServerId();
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
      throw nginxErrors.serverNotFound(id);
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
      throw nginxErrors.serverNotFound(id);
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
  async deleteServer(id: string): Promise<{ snapshotId: string }> {
    const server = await this.getServer(id);
    if (!server) {
      throw nginxErrors.serverNotFound(id);
    }
    const snapshotId = this.createDeleteSnapshot(server);

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
    return { snapshotId };
  }

  async restoreDeletedServer(snapshotId: string): Promise<NginxServer> {
    const snapshot = this.deletedSnapshots.get(snapshotId);
    if (!snapshot) {
      throw nginxErrors.serverNotFound(`snapshot:${snapshotId}`);
    }
    const restored = await this.createServer(snapshot.request);
    this.deletedSnapshots.delete(snapshotId);
    return restored;
  }

  async parseImportCandidates(configText: string): Promise<NginxImportParseCandidate[]> {
    const content = String(configText || '').trim();
    if (!content) {
      return [];
    }

    const blocks = this.extractImportServerBlocks(content);
    const parsed = blocks.map(block => {
      const request = this.parseImportServerBlockToRequest(block);
      if (!request) {
        return { error: '解析失败：未识别为标准 server 块' } as NginxImportParseCandidate;
      }
      return { request } as NginxImportParseCandidate;
    });

    const seenFingerprints = new Set<string>();
    const deduplicated: NginxImportParseCandidate[] = [];
    for (const candidate of parsed) {
      if (!candidate.request) {
        deduplicated.push(candidate);
        continue;
      }
      const fingerprint = JSON.stringify({
        name: candidate.request.name,
        listen: [...(candidate.request.listen || [])].sort(),
        domains: [...(candidate.request.domains || [])].sort(),
        root: candidate.request.root || '',
        index: [...(candidate.request.index || [])].sort(),
        locations: candidate.request.locations || [],
        ssl: Boolean(candidate.request.ssl),
        sslCert: candidate.request.sslCert || '',
        sslKey: candidate.request.sslKey || '',
        extraConfig: candidate.request.extraConfig || '',
      });
      if (seenFingerprints.has(fingerprint)) {
        continue;
      }
      seenFingerprints.add(fingerprint);
      deduplicated.push(candidate);
    }

    return deduplicated;
  }

  async analyzeImportRequests(requests: CreateNginxServerRequest[]): Promise<NginxImportAnalyzeCandidate[]> {
    const items = Array.isArray(requests) ? requests : [];
    const existingServers = await this.getAllServers();
    const existingNameSet = new Set(
      existingServers.map(server => String(server.name || '').trim().toLowerCase()).filter(Boolean)
    );
    const existingEnabledPorts = new Set<number>();
    existingServers
      .filter(server => server.enabled)
      .forEach(server => {
        (server.listen || [])
          .map(item => this.parseListenPort(item))
          .filter((value): value is number => Number.isInteger(value))
          .forEach(port => existingEnabledPorts.add(port));
      });

    const nameCounts = new Map<string, number>();
    const portCounts = new Map<number, number>();

    items.forEach(item => {
      const nameKey = String(item?.name || '').trim().toLowerCase();
      if (nameKey) {
        nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
      }
      if (item?.enabled === false) {
        return;
      }
      (item?.listen || [])
        .map(value => Number(value))
        .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535)
        .forEach(port => {
          portCounts.set(port, (portCounts.get(port) || 0) + 1);
        });
    });

    return items.map(item => {
      const issues: NginxImportIssue[] = [];
      const nameKey = String(item?.name || '').trim().toLowerCase();
      if (!nameKey) {
        issues.push({ level: 'error', message: '名称不能为空', field: 'name' });
      } else {
        if (existingNameSet.has(nameKey)) {
          issues.push({ level: 'error', message: `名称冲突：${item.name}`, field: 'name' });
        }
        if ((nameCounts.get(nameKey) || 0) > 1) {
          issues.push({ level: 'error', message: `导入批次内名称重复：${item.name}`, field: 'name' });
        }
      }

      const ports = (item?.listen || [])
        .map(value => Number(value))
        .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535);
      if (!ports.length) {
        issues.push({ level: 'error', message: '监听端口无效', field: 'listen' });
      }
      if (item?.enabled !== false) {
        ports.forEach(port => {
          if (existingEnabledPorts.has(port)) {
            issues.push({ level: 'error', message: `端口冲突：${port} 已被现有启用 Server 使用`, field: 'listen' });
          }
          if ((portCounts.get(port) || 0) > 1) {
            issues.push({ level: 'error', message: `导入批次内端口重复：${port}`, field: 'listen' });
          }
        });
      }

      if (!(item?.domains || []).length) {
        issues.push({ level: 'warning', message: '域名为空，将使用默认域名', field: 'domains' });
      }

      return {
        request: item,
        issues,
      };
    });
  }

  /**
   * 启用 server
   */
  async enableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw nginxErrors.serverNotFound(id);
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
      throw nginxErrors.serverNotFound(id);
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
        const sanitizedContent = stripCommentsPreserveOffsets(content);
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

      const end = findBlockEnd(sanitizedContent, cursor);
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
    const metadataId = this.normalizeManagedServerId(this.parseManagedMeta(content, 'id'));
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

    const id = this.ensureUniqueServerId(metadataId || this.createServerId(filePath, blockIndex), filePath, blockIndex);
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

      const end = findBlockEnd(uncommented, cursor);
      if (end < 0) {
        continue;
      }

      const blockContent = uncommented.slice(cursor + 1, end);
      candidates.push({
        start: match.index,
        end: wrapperRegex.lastIndex,
        blockContent,
        sanitizedBlockContent: stripCommentsPreserveOffsets(blockContent),
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

  private normalizeManagedServerId(value?: string): string | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return undefined;
    }
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(normalized)) {
      return undefined;
    }
    return normalized;
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
      'proxy_set_header X-Forwarded-Proto $scheme;',
      'proxy_set_header X-Forwarded-Host $host;',
      'proxy_set_header X-Forwarded-Port $server_port;',
      'proxy_set_header Upgrade $http_upgrade;',
      'proxy_set_header Connection "upgrade";',
    ]);
    return defaults.has(normalized);
  }

  private isWebSocketProxyLocation(rawConfig?: string): boolean {
    const normalizedRaw = String(rawConfig || '').toLowerCase();
    if (normalizedRaw.includes('upgrade $http_upgrade') || normalizedRaw.includes('connection "upgrade"')) {
      return true;
    }
    return false;
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

  private   async applyEnabledState(server: NginxServer, enabled: boolean): Promise<void> {
    if (!server.filePath) {
      throw nginxErrors.serverFileInvalid('', 'Server 配置文件路径不存在');
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
      throw nginxErrors.serverFileInvalid(source.filePath, 'Server 配置块定位失败，请刷新后重试');
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
      throw nginxErrors.serverFileInvalid(filePath, 'Server 配置块定位失败，请刷新后重试');
    }

    const next = `${original.slice(0, start)}${nextBlockContent}${original.slice(end)}`;
    await this.configService.writeConfigFile(filePath, next);
  }

  private async removeServerBlock(filePath: string, start: number, end: number): Promise<void> {
    const original = await readFile(filePath, 'utf-8');
    if (start < 0 || end > original.length || start >= end) {
      throw nginxErrors.serverFileInvalid(filePath, 'Server 配置块定位失败，请刷新后重试');
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
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: number }).code === 20205;
    }
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('Server 配置块定位失败') || message.includes('Server 配置文件无效');
  }

  private createServerId(filePath: string, blockIndex: number): string {
    return createHash('sha1').update(`${filePath}#${blockIndex}`).digest('hex').slice(0, 24);
  }

  private createManagedServerId(): string {
    let candidate = this.genId('srv');
    while (this.servers.has(candidate) || this.serverSources.has(candidate)) {
      candidate = this.genId('srv');
    }
    return candidate;
  }

  private ensureUniqueServerId(candidate: string, filePath: string, blockIndex: number): string {
    let next = candidate;
    let salt = 0;
    while (this.servers.has(next) || this.serverSources.has(next)) {
      salt += 1;
      next = this.createServerId(filePath, blockIndex + salt);
    }
    return next;
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

  private createDeleteSnapshot(server: NginxServer): string {
    const snapshotId = this.genId('del');
    const request: CreateNginxServerRequest = {
      name: String(server.name || '').trim(),
      listen: [...(server.listen || [])],
      domains: [...(server.domains || [])],
      root: String(server.root || '').trim() || undefined,
      index: [...(server.index || [])],
      locations: (server.locations || []).map(item => ({ ...item })),
      ssl: Boolean(server.ssl),
      protocol: server.ssl ? 'https' : 'http',
      enabled: Boolean(server.enabled),
      sslCert: String(server.sslCert || '').trim() || undefined,
      sslKey: String(server.sslKey || '').trim() || undefined,
      extraConfig: String(server.extraConfig || '').trim() || undefined,
      createdBy: server.createdBy,
    };
    this.deletedSnapshots.set(snapshotId, {
      request,
      createdAt: Date.now(),
    });
    this.compactDeletedSnapshots();
    return snapshotId;
  }

  private compactDeletedSnapshots(): void {
    if (this.deletedSnapshots.size <= this.maxDeletedSnapshots) {
      return;
    }
    const ordered = Array.from(this.deletedSnapshots.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    const overflow = ordered.length - this.maxDeletedSnapshots;
    for (let i = 0; i < overflow; i += 1) {
      this.deletedSnapshots.delete(ordered[i][0]);
    }
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
    let firstConflictPort = 0;
    let firstConflictOwners: string[] = [];
    for (const port of candidatePorts) {
      const owners = ownersByPort.get(port);
      if (!owners?.size) {
        continue;
      }
      const ownerList = Array.from(owners);
      conflicts.push(`${port}（已被 ${ownerList.join('、')} 使用）`);
      if (firstConflictPort === 0) {
        firstConflictPort = port;
        firstConflictOwners = ownerList;
      }
    }

    if (conflicts.length) {
      throw nginxErrors.serverPortConflict(firstConflictPort, firstConflictOwners);
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

  private normalizeImportContent(configText: string): string {
    const repaired = String(configText || '').replace(
      /(ngm:disable-(?:start|end))\s*#/gi,
      '$1\n#'
    );
    const lines = repaired.split(/\r?\n/);
    const normalizedLines: string[] = [];
    let inDisabled = false;

    for (const rawLine of lines) {
      const line = String(rawLine || '');
      const marker = line.match(/^\s*#\s*ngm:disable-(start|end)\b/i);
      if (marker) {
        inDisabled = marker[1].toLowerCase() === 'start';
        continue;
      }

      if (inDisabled) {
        normalizedLines.push(line.replace(/^\s*#\s?/, ''));
      } else {
        normalizedLines.push(line);
      }
    }

    return normalizedLines.join('\n');
  }

  private extractImportServerBlocks(configText: string): string[] {
    const content = this.normalizeImportContent(configText);
    const blocks: string[] = [];
    const token = /\bserver\b/g;
    let match: RegExpExecArray | null = null;
    while ((match = token.exec(content)) !== null) {
      let cursor = match.index + match[0].length;
      while (cursor < content.length && /\s/.test(content[cursor])) {
        cursor += 1;
      }
      if (content[cursor] !== '{') {
        continue;
      }
      const end = findBlockEnd(content, cursor);
      if (end < 0) {
        continue;
      }
      blocks.push(content.slice(match.index, end + 1));
      token.lastIndex = end + 1;
    }
    return blocks;
  }

  private extractTopLevelDirectives(content: string): Map<string, string[]> {
    const directiveMap = new Map<string, string[]>();
    let depth = 0;
    let statement = '';
    const flush = () => {
      const normalized = statement.trim();
      statement = '';
      if (!normalized) {
        return;
      }
      const m = normalized.match(/^([a-zA-Z_][\w]*)\s+([\s\S]+)$/);
      if (!m) {
        return;
      }
      const key = m[1].toLowerCase();
      const value = m[2].replace(/;$/, '').trim();
      if (!value) {
        return;
      }
      if (!directiveMap.has(key)) {
        directiveMap.set(key, []);
      }
      directiveMap.get(key)!.push(value);
    };

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];
      if (ch === '#') {
        while (i < content.length && content[i] !== '\n') {
          i += 1;
        }
        continue;
      }
      if (ch === '{') {
        depth += 1;
        continue;
      }
      if (ch === '}') {
        if (depth > 0) {
          depth -= 1;
        }
        continue;
      }
      if (depth > 0) {
        continue;
      }
      statement += ch;
      if (ch === ';') {
        flush();
      }
    }
    return directiveMap;
  }

  private stripLineCommentPrefix(content: string): string {
    return String(content || '')
      .split(/\r?\n/)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join('\n');
  }

  private parseImportServerBlockToRequest(serverBlock: string): CreateNginxServerRequest | null {
    const openIndex = serverBlock.indexOf('{');
    const closeIndex = serverBlock.lastIndexOf('}');
    if (openIndex < 0 || closeIndex <= openIndex) {
      return null;
    }
    const body = serverBlock.slice(openIndex + 1, closeIndex);
    const uncommentedBody = this.stripLineCommentPrefix(body);
    const topLevel = this.extractTopLevelDirectives(body);
    const commentedTopLevel = this.extractTopLevelDirectives(uncommentedBody);
    const chooseDirective = (key: string): string[] => {
      const raw = topLevel.get(key) || [];
      if (raw.length) {
        return raw;
      }
      return commentedTopLevel.get(key) || [];
    };

    const listenRaw = chooseDirective('listen');
    const listens = listenRaw
      .map(item => this.parseListenPort(item))
      .filter((value): value is number => Number.isInteger(value))
      .map(value => String(value));
    const domains = chooseDirective('server_name')
      .flatMap(item => item.split(/\s+/))
      .map(item => item.trim())
      .filter(item => item && item !== '_');
    const root = (chooseDirective('root')[0] || '').trim();
    const index = (chooseDirective('index')[0] || '')
      .split(/\s+/)
      .map(item => item.trim())
      .filter(Boolean);
    const sslCert = (chooseDirective('ssl_certificate')[0] || '').trim();
    const sslKey = (chooseDirective('ssl_certificate_key')[0] || '').trim();
    let locations = this.parseLocations(body);
    if (!locations.length) {
      locations = this.parseLocations(uncommentedBody);
    }
    const managedName = serverBlock.match(/#\s*ngm-name:\s*([^\r\n]+)/i)?.[1]?.trim() || '';

    const hasSslListen = listenRaw.some(item => /\bssl\b/i.test(item));
    const ssl = Boolean(sslCert && sslKey) || hasSslListen;
    const name = managedName || domains[0] || '';
    const uniqueListen = Array.from(new Set(listens));

    return {
      name,
      listen: uniqueListen.length ? uniqueListen : [ssl ? '443' : '80'],
      domains: domains.length ? Array.from(new Set(domains)) : ['127.0.0.1'],
      root,
      index: index.length ? Array.from(new Set(index)) : ['index.html'],
      locations,
      ssl,
      protocol: ssl ? 'https' : 'http',
      enabled: true,
      sslCert: sslCert || undefined,
      sslKey: sslKey || undefined,
      extraConfig: '',
    };
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

}

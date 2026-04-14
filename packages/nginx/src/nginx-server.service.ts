import { createHash, randomUUID } from 'crypto';
import { access, constants, readFile, symlink, unlink } from 'fs/promises';
import { basename, join } from 'path';
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
    const normalizedServer: NginxServer = {
      id: '',
      name: normalizedName,
      listen: this.normalizeListenValues(request.listen, ssl),
      domains: this.normalizeDomains(request.domains),
      root: this.normalizeOptionalText(request.root),
      locations: this.normalizeLocations(request.locations),
      ssl,
      sslCert: this.normalizeOptionalText(request.sslCert),
      sslKey: this.normalizeOptionalText(request.sslKey),
      enabled: request.enabled !== false,
      extraConfig: this.normalizeOptionalText(request.extraConfig),
      configText: '',
    };

    const configDir = await this.configService.resolveServerConfigDir();

    const baseName = this.makeSafeFileStem(normalizedName);
    const filePath = await this.makeUniqueConfigPath(configDir, `${baseName}.conf`);
    normalizedServer.filePath = filePath;
    normalizedServer.id = this.createServerId(filePath, 0);
    normalizedServer.configText = this.generateServerConfig(normalizedServer);

    await this.configService.writeConfigFile(filePath, normalizedServer.configText);
    await this.applyEnabledState(normalizedServer, normalizedServer.enabled);

    this.servers.set(normalizedServer.id, normalizedServer);
    return normalizedServer;
  }

  /**
   * 更新 server
   */
  async updateServer(id: string, request: UpdateNginxServerRequest): Promise<NginxServer> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }

    if (request.name !== undefined) server.name = this.normalizeName(request.name);
    if (request.listen !== undefined) {
      server.listen = this.normalizeListenValues(request.listen, this.resolveSsl(request.ssl ?? server.ssl, request.protocol));
    }
    if (request.domains !== undefined) server.domains = this.normalizeDomains(request.domains);
    if (request.root !== undefined) server.root = this.normalizeOptionalText(request.root);
    if (request.locations !== undefined) server.locations = this.normalizeLocations(request.locations);
    if (request.protocol !== undefined) server.ssl = this.resolveSsl(server.ssl, request.protocol);
    if (request.ssl !== undefined) server.ssl = this.resolveSsl(request.ssl, undefined);
    if (request.sslCert !== undefined) server.sslCert = this.normalizeOptionalText(request.sslCert);
    if (request.sslKey !== undefined) server.sslKey = this.normalizeOptionalText(request.sslKey);
    if (request.extraConfig !== undefined) server.extraConfig = this.normalizeOptionalText(request.extraConfig);

    const nextEnabled = request.enabled ?? server.enabled;
    server.configText = this.generateServerConfig(server);

    const source = this.serverSources.get(id);
    if (!source) {
      throw new Error('Server 配置文件不存在');
    }

    await this.replaceServerBlock(source.filePath, source.start, source.end, server.configText);
    await this.applyEnabledState(server, nextEnabled);

    server.enabled = nextEnabled;
    this.servers.set(id, server);
    return server;
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
    const servers: NginxServer[] = [];
    const serverTokenRegex = /\bserver\b/g;
    let match: RegExpExecArray | null = null;
    let blockIndex = 0;

    while ((match = serverTokenRegex.exec(sanitizedContent)) !== null) {
      let cursor = match.index + match[0].length;
      while (cursor < sanitizedContent.length && /\s/.test(sanitizedContent[cursor])) {
        cursor += 1;
      }

      if (sanitizedContent[cursor] !== '{') {
        continue;
      }

      let depth = 0;
      let end = -1;
      for (let i = cursor; i < sanitizedContent.length; i += 1) {
        const ch = sanitizedContent[i];
        if (ch === '{') {
          depth += 1;
        } else if (ch === '}') {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }

      if (end < 0) {
        continue;
      }

      const blockContent = content.slice(cursor + 1, end);
      const sanitizedBlockContent = sanitizedContent.slice(cursor + 1, end);
      const server = await this.parseServerBlock(blockContent, sanitizedBlockContent, filePath, blockIndex);
      if (server) {
        servers.push(server);
        this.serverSources.set(server.id, { filePath, start: match.index, end: end + 1 });
      }
      blockIndex += 1;
      serverTokenRegex.lastIndex = end + 1;
    }

    return servers;
  }

  private async parseServerBlock(
    content: string,
    sanitizedContent: string,
    filePath: string,
    blockIndex: number
  ): Promise<NginxServer | null> {
    const listenMatch = sanitizedContent.match(/listen\s+([^;]+);/g);
    const listen =
      listenMatch
        ?.map(item => item.replace(/^\s*listen\s+/i, '').replace(/;$/, '').trim())
        .filter(Boolean) || ['80'];

    const serverNameMatch = sanitizedContent.match(/server_name\s+([^;]+);/);
    const domains =
      serverNameMatch?.[1]
        ?.trim()
        .split(/\s+/)
        .map(item => item.trim())
        .filter(item => item !== '_')
        .filter(Boolean) || [];

    const name = domains[0] || basename(filePath, '.conf') || '_';
    const rootMatch = sanitizedContent.match(/^\s*root\s+([^;]+);/m);
    const sslCertMatch = sanitizedContent.match(/ssl_certificate\s+([^;]+);/);
    const sslKeyMatch = sanitizedContent.match(/ssl_certificate_key\s+([^;]+);/);
    const ssl = sanitizedContent.includes('ssl_certificate') || listen.some(item => /\bssl\b/.test(item));
    const locations = this.parseLocations(sanitizedContent);

    let enabled = true;
    if (filePath.includes('sites-available')) {
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
      root: rootMatch?.[1]?.trim(),
      locations,
      ssl,
      sslCert: sslCertMatch?.[1]?.trim(),
      sslKey: sslKeyMatch?.[1]?.trim(),
      enabled,
      extraConfig: '',
      configText: `server {${content}}`,
      filePath,
    };
  }

  private parseLocations(content: string): NginxLocation[] {
    const locations: NginxLocation[] = [];
    const locationRegex = /location\s+(\S+)\s*\{([^}]*)\}/gs;
    let match: RegExpExecArray | null = null;

    while ((match = locationRegex.exec(content)) !== null) {
      const path = match[1];
      const blockContent = match[2];
      const proxyMatch = blockContent.match(/proxy_pass\s+([^;]+);/);
      const rootMatch = blockContent.match(/root\s+([^;]+);/);
      const indexMatch = blockContent.match(/index\s+([^;]+);/);
      const tryFilesMatch = blockContent.match(/try_files\s+([^;]+);/);

      locations.push({
        path,
        proxyPass: proxyMatch?.[1]?.trim(),
        root: rootMatch?.[1]?.trim(),
        index: indexMatch?.[1]?.trim().split(/\s+/),
        tryFiles: tryFilesMatch?.[1]?.trim().split(/\s+/),
        rawConfig: match[0],
      });
    }

    return locations;
  }

  private generateServerConfig(server: {
    name: string;
    listen: string[];
    domains?: string[];
    root?: string;
    locations: NginxLocation[];
    ssl?: boolean;
    sslCert?: string;
    sslKey?: string;
    extraConfig?: string;
  }): string {
    const lines: string[] = ['server {'];

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
      lines.push(`    root ${server.root};`);
    }

    if (server.ssl) {
      lines.push('');
      lines.push('    # SSL 配置');
      lines.push(`    ssl_certificate ${server.sslCert || '/path/to/cert.pem'};`);
      lines.push(`    ssl_certificate_key ${server.sslKey || '/path/to/key.pem'};`);
    }

    for (const loc of server.locations || []) {
      lines.push('');
      lines.push(`    location ${loc.path} {`);

      if (loc.proxyPass) {
        lines.push(`        proxy_pass ${loc.proxyPass};`);
        lines.push('        proxy_set_header Host $host;');
        lines.push('        proxy_set_header X-Real-IP $remote_addr;');
      }
      if (loc.root) {
        lines.push(`        root ${loc.root};`);
      }
      if (loc.index && loc.index.length > 0) {
        lines.push(`        index ${loc.index.join(' ')};`);
      }
      if (loc.tryFiles && loc.tryFiles.length > 0) {
        lines.push(`        try_files ${loc.tryFiles.join(' ')};`);
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

    if (normalized.length) {
      return normalized;
    }
    return [{ path: '/', proxyPass: undefined, root: undefined, index: undefined, tryFiles: undefined }];
  }

  private normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
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
    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    const sitesAvailableDir = this.configService.getSitesAvailableDir();
    if (!sitesEnabledDir || !sitesAvailableDir) {
      return;
    }
    if (!server.filePath) {
      throw new Error('Server 配置文件不存在');
    }
    const normalizedFilePath = server.filePath.replace(/\\/g, '/');
    const normalizedSitesAvailableDir = sitesAvailableDir.replace(/\\/g, '/');
    if (!normalizedFilePath.startsWith(normalizedSitesAvailableDir)) {
      return;
    }

    const linkPath = join(sitesEnabledDir, basename(server.filePath));
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

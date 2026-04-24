import { access, constants, readFile } from 'fs/promises';
import { basename, join } from 'path';
import { NginxConfigService } from '../core/nginx-config.service';
import { findBlockEnd, stripCommentsPreserveOffsets } from '../utils/nginx-module-utils';
import { extractTopLevelDirectiveValues } from '../utils/nginx-directive-parser';
import { ServerIdGenerator } from '../utils/server-id-generator';
import type { NginxLocation, NginxServer } from '../types/nginx.types';
import { ServerGeneratorService } from './server-generator.service';
import { ServerLocationParserService } from './server-location-parser.service';

export interface ServerSource {
  filePath: string;
  start: number;
  end: number;
}

type Candidate = {
  start: number;
  end: number;
  blockContent: string;
  sanitizedBlockContent: string;
  enabledOverride?: boolean;
};

/**
 * Server 解析服务
 * 负责从 Nginx 配置文件中解析出 Server 配置块，并将其转换为系统中的 NginxServer 数据结构
 * 由于 Nginx 配置的灵活性和多样性，Server 配置块可能会有各种不同的写法和结构，例如不同的指令顺序、可选的参数、注释等
 * 该服务需要能够正确地处理这些变体，并且在解析过程中保持对原始配置文本的忠实，以便在必要时能够进行准确的修改或重构
 * 主要功能包括：
 * - 从 Nginx 配置文件中识别和提取 Server 配置块
 * - 解析 Server 配置块的名称、监听端口、域名、根目录、索引文件、SSL 配置、Location 块等信息
 * - 将解析结果封装为 NginxServer 对象，供其他服务使用
 * - 在解析过程中忽略注释和不相关的内容，以提高解析的准确性
 */
export class ServerParserService {
  private readonly locationParser: ServerLocationParserService;

  constructor(
    private readonly configService: NginxConfigService,
    private readonly generator: ServerGeneratorService,
    private readonly idGenerator: ServerIdGenerator
  ) {
    this.locationParser = new ServerLocationParserService(this.generator);
  }

  async parseServersFromConfig(): Promise<{ servers: NginxServer[]; sources: Map<string, ServerSource> }> {
    const configFiles = await this.configService.getIncludedConfigs();
    const servers: NginxServer[] = [];
    const sources = new Map<string, ServerSource>();

    for (const filePath of configFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const sanitizedContent = stripCommentsPreserveOffsets(content);
        const parsed = await this.parseServerBlocks(content, sanitizedContent, filePath);
        for (const item of parsed) {
          servers.push(item.server);
          sources.set(item.server.id, item.source);
        }
      } catch {
        // 读取失败，忽略
      }
    }

    return { servers, sources };
  }

  async parseServerBlocks(
    content: string,
    sanitizedContent: string,
    filePath: string
  ): Promise<Array<{ server: NginxServer; source: ServerSource }>> {
    const candidates: Candidate[] = [];
    candidates.push(...this.extractDisabledServerCandidates(content));

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

    const parsed: Array<{ server: NginxServer; source: ServerSource }> = [];
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
      parsed.push({
        server,
        source: {
          filePath,
          start: candidate.start,
          end: candidate.end,
        },
      });
    }
    return parsed;
  }

  async parseServerBlock(
    content: string,
    sanitizedContent: string,
    filePath: string,
    blockIndex: number,
    enabledOverride?: boolean
  ): Promise<NginxServer | null> {
    const listenValues = extractTopLevelDirectiveValues(sanitizedContent, 'listen');
    const listen = listenValues.length ? listenValues : ['80'];

    const serverNameValue =
      extractTopLevelDirectiveValues(sanitizedContent, 'server_name')[0] ||
      sanitizedContent.match(/server_name\s+([^;]+);/)?.[1] ||
      '';
    const domains =
      serverNameValue
        ?.trim()
        .split(/\s+/)
        .map(item => item.trim())
        .filter(item => item !== '_')
        .filter(Boolean) || [];

    const metadataName = this.generator.parseManagedDisplayName(content);
    const metadataId = this.generator.normalizeManagedServerId(this.generator.parseManagedMeta(content, 'id'));
    const metadataCreatedAt = this.generator.parseManagedMeta(content, 'created-at');
    const metadataUpdatedAt = this.generator.parseManagedMeta(content, 'updated-at');
    const metadataCreatedBy = this.generator.parseManagedMeta(content, 'created-by');
    const name = this.generator.normalizeName(metadataName || domains[0] || basename(filePath, '.conf') || '_');
    const rootValue =
      extractTopLevelDirectiveValues(sanitizedContent, 'root')[0] ||
      sanitizedContent.match(/^\s*root\s+([^;]+);/m)?.[1];
    const indexValue = extractTopLevelDirectiveValues(sanitizedContent, 'index')[0];
    const sslCertValue =
      extractTopLevelDirectiveValues(sanitizedContent, 'ssl_certificate')[0] ||
      sanitizedContent.match(/ssl_certificate\s+([^;]+);/)?.[1];
    const sslKeyValue =
      extractTopLevelDirectiveValues(sanitizedContent, 'ssl_certificate_key')[0] ||
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

    const id = this.idGenerator.ensureUniqueServerId(metadataId || this.idGenerator.createServerId(filePath, blockIndex), filePath, blockIndex);
    return {
      id,
      name,
      listen,
      domains,
      root: this.generator.stripOptionalQuotes(rootValue?.trim()),
      index: this.generator.normalizeServerIndex(indexValue?.split(/\s+/), Boolean(rootValue)),
      locations,
      ssl,
      sslCert: this.generator.stripOptionalQuotes(sslCertValue?.trim()),
      sslKey: this.generator.stripOptionalQuotes(sslKeyValue?.trim()),
      enabled,
      extraConfig: '',
      configText: `server {${content}}`,
      filePath,
      createdAt: metadataCreatedAt,
      updatedAt: metadataUpdatedAt,
      createdBy: metadataCreatedBy,
    };
  }

  extractDisabledServerCandidates(content: string): Candidate[] {
    const candidates: Candidate[] = [];
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

  uncommentDisabledContent(content: string): string {
    const lineBreak = content.includes('\r\n') ? '\r\n' : '\n';
    return content
      .split(/\r?\n/)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join(lineBreak);
  }

parseLocations(content: string): NginxLocation[] {
    return this.locationParser.parseLocations(content);
  }

  extractListenPorts(listen: string[]): number[] {
    const ports = new Set<number>();
    for (const item of listen || []) {
      const port = this.parseListenPort(item);
      if (port !== null) {
        ports.add(port);
      }
    }
    return Array.from(ports.values()).sort((a, b) => a - b);
  }

  parseListenPort(rawListen: string): number | null {
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

}

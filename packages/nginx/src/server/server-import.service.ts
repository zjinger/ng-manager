import { findBlockEnd } from '../utils/nginx-module-utils';
import { extractTopLevelDirectives } from '../utils/nginx-directive-parser';
import type { CreateNginxServerRequest, NginxServer } from '../types/nginx.types';
import type { NginxImportAnalyzeCandidate, NginxImportIssue, NginxImportParseCandidate } from './nginx-server.import.types';
import { ServerParserService } from './server-parser.service';

/**
 * Server 导入服务
 * 负责将用户提供的 Nginx 配置文本解析为 Server 数据结构，并对潜在的问题进行分析和提示
 * 该服务的目标是帮助用户将现有的 Nginx 配置导入到系统中，同时提供必要的验证和问题反馈，以确保导入的配置能够正确地转换为系统中的 Server 实例，并且在启用后不会引起冲突或错误
 * 主要功能包括：
 * - 从原始配置文本中提取 server 块
 * - 将 server 块解析为 CreateNginxServerRequest 数据结构
 * - 对解析结果进行分析，检查名称冲突、端口冲突、潜在的配置问题等，并返回详细的分析结果和建议
 * - 提供配置内容的规范化处理，例如修复注释格式、提取顶级指令等，以提高解析的准确性和鲁棒性
 */
export class ServerImportService {
  constructor(
    private readonly parser: ServerParserService,
    private readonly getAllServers: () => Promise<NginxServer[]>
  ) {}

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
        this.parser.extractListenPorts(server.listen || []).forEach(port => existingEnabledPorts.add(port));
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

  normalizeImportContent(configText: string): string {
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

  extractImportServerBlocks(configText: string): string[] {
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

  stripLineCommentPrefix(content: string): string {
    return String(content || '')
      .split(/\r?\n/)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join('\n');
  }

  parseImportServerBlockToRequest(serverBlock: string): CreateNginxServerRequest | null {
    const openIndex = serverBlock.indexOf('{');
    const closeIndex = serverBlock.lastIndexOf('}');
    if (openIndex < 0 || closeIndex <= openIndex) {
      return null;
    }
    const body = serverBlock.slice(openIndex + 1, closeIndex);
    const uncommentedBody = this.stripLineCommentPrefix(body);
    const topLevel = extractTopLevelDirectives(body);
    const commentedTopLevel = extractTopLevelDirectives(uncommentedBody);
    const chooseDirective = (key: string): string[] => {
      const raw = topLevel.get(key) || [];
      if (raw.length) {
        return raw;
      }
      return commentedTopLevel.get(key) || [];
    };

    const listenRaw = chooseDirective('listen');
    const listens = listenRaw
      .map(item => this.parser.parseListenPort(item))
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
    let locations = this.parser.parseLocations(body);
    if (!locations.length) {
      locations = this.parser.parseLocations(uncommentedBody);
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
}


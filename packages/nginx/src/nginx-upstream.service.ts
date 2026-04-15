import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { NginxConfigService } from './nginx-config.service';
import { findBlockEnd, isSamePath, stripCommentsPreserveOffsets } from './nginx-module-utils';
import { NginxService } from './nginx.service';
import type { NginxUpstream } from './nginx.types';

/**
 * Upstream 配置服务
 */
export class NginxUpstreamService {
  private readonly managedUpstreamFileName = 'ngm-upstreams.conf';

  constructor(
    private nginxService: NginxService,
    private configService: NginxConfigService
  ) {}

  async getUpstreams(): Promise<NginxUpstream[]> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return [];
    }

    const managedPath = await this.getManagedUpstreamFilePath(false);
    const included = await this.configService.getIncludedConfigs();
    const upstreams: NginxUpstream[] = [];
    let order = 0;

    for (const filePath of included) {
      let content = '';
      try {
        content = await readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      const parsed = this.parseUpstreamsFromContent(content, filePath, managedPath, order);
      upstreams.push(...parsed);
      order += parsed.length;
    }

    return upstreams;
  }

  async saveUpstreams(upstreams: NginxUpstream[]): Promise<void> {
    const managedPath = await this.getManagedUpstreamFilePath(true);
    if (!managedPath) {
      throw new Error('Nginx 未绑定');
    }

    const normalized = this.normalizeUpstreams(upstreams, managedPath);
    const managedOnly = normalized.filter(item => isSamePath(item.sourceFile || managedPath, managedPath));
    const rendered = this.renderManagedUpstreams(managedOnly);
    await this.configService.writeConfigFile(managedPath, rendered);
  }

  private parseUpstreamsFromContent(
    content: string,
    filePath: string,
    managedPath: string | null,
    startOrder: number
  ): NginxUpstream[] {
    const sanitized = stripCommentsPreserveOffsets(content);
    const upstreamRegex = /\bupstream\s+([a-zA-Z0-9._-]+)\s*\{/g;
    const upstreams: NginxUpstream[] = [];
    let match: RegExpExecArray | null = null;
    let localIndex = 0;

    while ((match = upstreamRegex.exec(sanitized)) !== null) {
      const name = match[1];
      const openBraceIndex = match.index + match[0].lastIndexOf('{');
      const endIndex = findBlockEnd(sanitized, openBraceIndex);
      if (endIndex < 0) {
        continue;
      }

      const blockSanitized = sanitized.slice(openBraceIndex + 1, endIndex);
      const nodes = this.parseUpstreamNodes(blockSanitized);
      const strategy = this.parseUpstreamStrategy(blockSanitized);
      const id = createHash('sha1')
        .update(`${resolve(filePath)}:${name}:${startOrder + localIndex}`)
        .digest('hex')
        .slice(0, 24);
      const managed = managedPath ? isSamePath(filePath, managedPath) : false;

      upstreams.push({
        id,
        name,
        strategy,
        nodes,
        sourceFile: filePath,
        managed,
        readonly: !managed,
        health: nodes.length ? `${nodes.length}/${nodes.length} 已配置` : '0/0',
        healthy: nodes.length > 0,
      });

      localIndex += 1;
      upstreamRegex.lastIndex = endIndex + 1;
    }

    return upstreams;
  }

  private parseUpstreamNodes(blockContent: string): string[] {
    const result: string[] = [];
    const serverRegex = /^\s*server\s+([^;]+);/gm;
    let match: RegExpExecArray | null = null;
    while ((match = serverRegex.exec(blockContent)) !== null) {
      const node = match[1]?.trim();
      if (node) {
        result.push(node);
      }
    }
    return result;
  }

  private parseUpstreamStrategy(blockContent: string): NginxUpstream['strategy'] {
    if (/\bleast_conn\s*;/m.test(blockContent)) {
      return 'least_conn';
    }
    if (/\bip_hash\s*;/m.test(blockContent)) {
      return 'ip_hash';
    }
    if (/\bhash\s+[^;]+;/m.test(blockContent)) {
      return 'hash';
    }
    return 'round-robin';
  }

  private normalizeUpstreams(upstreams: NginxUpstream[], managedPath: string): NginxUpstream[] {
    const normalized: NginxUpstream[] = [];
    const nameSet = new Set<string>();
    const strategies: NginxUpstream['strategy'][] = ['round-robin', 'least_conn', 'ip_hash', 'hash'];

    for (const item of upstreams || []) {
      const name = item.name?.trim();
      if (!name) {
        throw new Error('Upstream 名称不能为空');
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        throw new Error(`Upstream 名称非法: ${name}`);
      }
      if (nameSet.has(name)) {
        throw new Error(`Upstream 名称重复: ${name}`);
      }

      const nodes = (item.nodes || []).map(node => node.trim()).filter(Boolean);
      if (!nodes.length) {
        throw new Error(`Upstream "${name}" 至少需要一个节点`);
      }

      const strategy = strategies.includes(item.strategy) ? item.strategy : 'round-robin';
      const sourceFile = item.sourceFile?.trim() || managedPath;
      const managed = isSamePath(sourceFile, managedPath);
      const id =
        item.id?.trim() ||
        createHash('sha1')
          .update(`${resolve(sourceFile)}:${name}`)
          .digest('hex')
          .slice(0, 24);

      nameSet.add(name);
      normalized.push({
        ...item,
        id,
        name,
        strategy,
        nodes,
        sourceFile,
        managed,
        readonly: !managed,
        health: `${nodes.length}/${nodes.length} 已配置`,
        healthy: true,
      });
    }

    return normalized;
  }

  private renderManagedUpstreams(upstreams: NginxUpstream[]): string {
    const lines: string[] = [
      '# Generated by ng-manager. Manual edits may be overwritten.',
      '# If you need full manual control, move upstream blocks to another *.conf file.',
      '',
    ];

    for (const upstream of upstreams) {
      lines.push(`upstream ${upstream.name} {`);
      if (upstream.strategy === 'least_conn') {
        lines.push('    least_conn;');
      } else if (upstream.strategy === 'ip_hash') {
        lines.push('    ip_hash;');
      } else if (upstream.strategy === 'hash') {
        lines.push('    hash $request_uri consistent;');
      }

      for (const node of upstream.nodes) {
        lines.push(`    server ${node};`);
      }
      lines.push('}');
      lines.push('');
    }

    return `${lines.join('\n').trimEnd()}\n`;
  }

  private async getManagedUpstreamFilePath(ensureInclude: boolean): Promise<string | null> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }

    const confDir = ensureInclude
      ? await this.configService.resolveServerConfigDir()
      : this.configService.getConfDir() || join(dirname(instance.configPath), 'conf.d');
    return join(confDir, this.managedUpstreamFileName);
  }
}


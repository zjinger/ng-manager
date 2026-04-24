import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { NginxConfigService } from '../core/nginx-config.service';
import { findBlockEnd, stripCommentsPreserveOffsets } from '../utils/nginx-module-utils';
import { NginxModuleStateStore } from './nginx-module-state.store';
import { NginxService } from '../core/nginx.service';
import type { NginxSslCertificate } from '../types/nginx.types';
import { nginxErrors } from '@yinuo-ngm/errors';

/**
 * SSL 证书配置服务
 */
export class NginxSslService {
  constructor(
    private nginxService: NginxService,
    private configService: NginxConfigService,
    private stateStore: NginxModuleStateStore
  ) {}

  async getSslCertificates(): Promise<NginxSslCertificate[]> {
    const state = await this.stateStore.readState();
    const discovered = await this.readSslCertificatesFromIncludedConfigs();
    const savedById = new Map(state.sslCertificates.map(item => [item.id, item]));
    const merged: NginxSslCertificate[] = [];
    const emitted = new Set<string>();

    for (const item of discovered) {
      const override = savedById.get(item.id);
      const normalized = this.normalizeSslCertificate(override ? { ...item, ...override } : item, false);
      merged.push(normalized);
      emitted.add(normalized.id);
    }

    for (const item of state.sslCertificates) {
      const normalized = this.normalizeSslCertificate(item, false);
      if (emitted.has(normalized.id)) {
        continue;
      }
      merged.push(normalized);
    }

    return merged;
  }

  async saveSslCertificates(certificates: NginxSslCertificate[]): Promise<void> {
    const state = await this.stateStore.readState();
    state.sslCertificates = this.normalizeSslCertificates(certificates, true);
    await this.stateStore.writeState(state);
  }

  private async readSslCertificatesFromIncludedConfigs(): Promise<NginxSslCertificate[]> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return [];
    }

    const included = await this.configService.getIncludedConfigs();
    const certificates: NginxSslCertificate[] = [];
    const dedup = new Set<string>();

    for (const filePath of included) {
      let content = '';
      try {
        content = await readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      const parsed = this.parseSslCertificatesFromContent(content, filePath);
      for (const item of parsed) {
        const key = `${item.id}|${item.domain}|${item.certPath}|${item.keyPath}`;
        if (dedup.has(key)) {
          continue;
        }
        dedup.add(key);
        certificates.push(item);
      }
    }

    return certificates;
  }

  private parseSslCertificatesFromContent(content: string, filePath: string): NginxSslCertificate[] {
    const sanitized = stripCommentsPreserveOffsets(content);
    const serverTokenRegex = /\bserver\b/g;
    const certificates: NginxSslCertificate[] = [];
    let match: RegExpExecArray | null = null;

    while ((match = serverTokenRegex.exec(sanitized)) !== null) {
      let cursor = match.index + match[0].length;
      while (cursor < sanitized.length && /\s/.test(sanitized[cursor])) {
        cursor += 1;
      }

      if (sanitized[cursor] !== '{') {
        continue;
      }

      const end = findBlockEnd(sanitized, cursor);
      if (end < 0) {
        continue;
      }

      const blockContent = sanitized.slice(cursor + 1, end);
      const certMatch = blockContent.match(/ssl_certificate\s+([^;]+);/);
      const keyMatch = blockContent.match(/ssl_certificate_key\s+([^;]+);/);
      if (!certMatch?.[1] || !keyMatch?.[1]) {
        serverTokenRegex.lastIndex = end + 1;
        continue;
      }

      const certPath = certMatch[1].trim();
      const keyPath = keyMatch[1].trim();
      if (!certPath || !keyPath) {
        serverTokenRegex.lastIndex = end + 1;
        continue;
      }

      const domainMatch = blockContent.match(/server_name\s+([^;]+);/);
      const domains = this.parseServerNames(domainMatch?.[1]);

      for (let domainIndex = 0; domainIndex < domains.length; domainIndex += 1) {
        const domain = domains[domainIndex];
        certificates.push({
          id: this.createSslId(filePath, match.index, domainIndex),
          domain,
          certPath,
          keyPath,
          expireAt: '',
          status: 'pending',
          autoRenew: false,
        });
      }

      serverTokenRegex.lastIndex = end + 1;
    }

    return certificates;
  }

  private parseServerNames(input?: string): string[] {
    const normalized = (input || '')
      .split(/\s+/)
      .map(item => item.trim())
      .map(item => item.replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .filter(item => item !== ';');
    return normalized.length ? normalized : ['_'];
  }

  private normalizeSslCertificates(certificates: NginxSslCertificate[], strict: boolean): NginxSslCertificate[] {
    const normalized: NginxSslCertificate[] = [];
    const idSet = new Set<string>();

    for (const item of certificates || []) {
      const next = this.normalizeSslCertificate(item, strict);
      if (!strict && idSet.has(next.id)) {
        next.id = this.stateStore.makeId('ssl');
      } else if (idSet.has(next.id)) {
        throw nginxErrors.serverAlreadyExists(`ssl:${next.id}`);
      }
      idSet.add(next.id);
      normalized.push(next);
    }

    return normalized;
  }

  private normalizeSslCertificate(item: NginxSslCertificate, strict: boolean): NginxSslCertificate {
    const id = item.id?.trim() || this.stateStore.makeId('ssl');
    const domain = item.domain?.trim() || '';
    const certPath = item.certPath?.trim() || '';
    const keyPath = item.keyPath?.trim() || '';
    const expireAt = item.expireAt?.trim() || '';
    if (strict && !domain) {
      throw nginxErrors.sslCertInvalid(id, '证书域名不能为空');
    }
    if (strict && !certPath) {
      throw nginxErrors.sslCertNotFound(`"${domain || id}" 的证书路径`);
    }
    if (strict && !keyPath) {
      throw nginxErrors.sslKeyNotFound(`"${domain || id}" 的私钥路径`);
    }
    if (strict && expireAt && !/^\d{4}-\d{2}-\d{2}$/.test(expireAt)) {
      throw nginxErrors.sslCertInvalid(id, `域名 "${domain || id}" 的到期时间格式无效，应为 YYYY-MM-DD`);
    }

    return {
      ...item,
      id,
      domain,
      certPath,
      keyPath,
      expireAt,
      status: this.normalizeSslStatus(item.status),
      autoRenew: Boolean(item.autoRenew),
    };
  }

  private normalizeSslStatus(status: NginxSslCertificate['status']): NginxSslCertificate['status'] {
    if (status === 'valid' || status === 'expiring' || status === 'expired' || status === 'pending') {
      return status;
    }
    return 'pending';
  }

  private createSslId(filePath: string, serverStartIndex: number, domainIndex: number): string {
    return createHash('sha1')
      .update(`${resolve(filePath)}:${serverStartIndex}:${domainIndex}`)
      .digest('hex')
      .slice(0, 24);
  }
}


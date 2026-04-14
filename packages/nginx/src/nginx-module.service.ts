import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { NginxService } from './nginx.service';
import type {
  NginxPerformanceConfig,
  NginxSslCertificate,
  NginxTrafficConfig,
  NginxUpstream,
} from './nginx.types';

interface NginxModuleState {
  upstreams: NginxUpstream[];
  sslCertificates: NginxSslCertificate[];
  traffic: NginxTrafficConfig;
  performance: NginxPerformanceConfig;
}

/**
 * Nginx Phase2 模块配置服务
 * 以 JSON 文件维护 upstream/ssl/traffic/performance 配置
 */
export class NginxModuleService {
  private volatileState: NginxModuleState = this.buildDefaultState();

  constructor(private nginxService: NginxService) {}

  async getUpstreams(): Promise<NginxUpstream[]> {
    const state = await this.readState();
    return state.upstreams;
  }

  async saveUpstreams(upstreams: NginxUpstream[]): Promise<void> {
    const state = await this.readState();
    state.upstreams = upstreams.map(item => ({
      ...item,
      id: item.id?.trim() || this.makeId('upstream'),
      name: item.name?.trim() || 'upstream',
      strategy: item.strategy || 'round-robin',
      nodes: (item.nodes || []).map(node => node.trim()).filter(Boolean),
    }));
    await this.writeState(state);
  }

  async getSslCertificates(): Promise<NginxSslCertificate[]> {
    const state = await this.readState();
    return state.sslCertificates;
  }

  async saveSslCertificates(certificates: NginxSslCertificate[]): Promise<void> {
    const state = await this.readState();
    state.sslCertificates = certificates.map(item => ({
      ...item,
      id: item.id?.trim() || this.makeId('ssl'),
      domain: item.domain?.trim() || '',
      certPath: item.certPath?.trim() || '',
      keyPath: item.keyPath?.trim() || '',
      expireAt: item.expireAt?.trim() || '',
      status: item.status || 'pending',
      autoRenew: Boolean(item.autoRenew),
    }));
    await this.writeState(state);
  }

  async getTrafficConfig(): Promise<NginxTrafficConfig> {
    const state = await this.readState();
    return state.traffic;
  }

  async saveTrafficConfig(traffic: NginxTrafficConfig): Promise<void> {
    const state = await this.readState();
    state.traffic = {
      rateLimitEnabled: Boolean(traffic.rateLimitEnabled),
      rateLimit: traffic.rateLimit?.trim() || '20r/s',
      connLimitEnabled: Boolean(traffic.connLimitEnabled),
      connLimit: Number.isFinite(traffic.connLimit) ? Math.max(1, Number(traffic.connLimit)) : 50,
      blacklistIps: (traffic.blacklistIps || []).map(ip => ip.trim()).filter(Boolean),
    };
    await this.writeState(state);
  }

  async getPerformanceConfig(): Promise<NginxPerformanceConfig> {
    const state = await this.readState();
    return state.performance;
  }

  async savePerformanceConfig(performance: NginxPerformanceConfig): Promise<void> {
    const state = await this.readState();
    state.performance = {
      gzipEnabled: Boolean(performance.gzipEnabled),
      gzipTypes: performance.gzipTypes?.trim() || 'text/plain text/css application/json application/javascript',
      keepaliveTimeout: performance.keepaliveTimeout?.trim() || '65s',
      workerProcesses: performance.workerProcesses?.trim() || 'auto',
      sendfile: Boolean(performance.sendfile),
      tcpNopush: Boolean(performance.tcpNopush),
    };
    await this.writeState(state);
  }

  private async readState(): Promise<NginxModuleState> {
    const path = this.getStateFilePath();
    if (!path) {
      return this.volatileState;
    }

    try {
      const raw = await readFile(path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<NginxModuleState>;
      const normalized = this.normalizeState(parsed);
      this.volatileState = normalized;
      return normalized;
    } catch {
      const defaults = this.buildDefaultState();
      await this.writeState(defaults);
      return defaults;
    }
  }

  private async writeState(next: NginxModuleState): Promise<void> {
    const normalized = this.normalizeState(next);
    this.volatileState = normalized;

    const path = this.getStateFilePath();
    if (!path) {
      return;
    }

    await writeFile(path, JSON.stringify(normalized, null, 2), 'utf-8');
  }

  private getStateFilePath(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }
    return join(dirname(instance.configPath), '.ngm-nginx-module.json');
  }

  private buildDefaultState(): NginxModuleState {
    return {
      upstreams: [
        {
          id: 'upstream-backend-cluster',
          name: 'backend_cluster',
          strategy: 'round-robin',
          nodes: ['127.0.0.1:3001', '127.0.0.1:3002', '127.0.0.1:3003'],
          health: '3/3 健康',
          healthy: true,
        },
        {
          id: 'upstream-static-assets',
          name: 'static_assets',
          strategy: 'ip_hash',
          nodes: ['127.0.0.1:4001', '127.0.0.1:4002'],
          health: '1/2 健康',
          healthy: false,
        },
      ],
      sslCertificates: [
        {
          id: 'ssl-api',
          domain: 'api.example.com',
          certPath: '/etc/nginx/ssl/api.crt',
          keyPath: '/etc/nginx/ssl/api.key',
          expireAt: '2026-12-20',
          status: 'valid',
          autoRenew: true,
        },
        {
          id: 'ssl-www',
          domain: 'example.com',
          certPath: '/etc/nginx/ssl/www.crt',
          keyPath: '/etc/nginx/ssl/www.key',
          expireAt: '2026-05-01',
          status: 'expiring',
          autoRenew: false,
        },
      ],
      traffic: {
        rateLimitEnabled: true,
        rateLimit: '20r/s',
        connLimitEnabled: true,
        connLimit: 50,
        blacklistIps: ['192.168.1.10', '10.10.10.5'],
      },
      performance: {
        gzipEnabled: true,
        gzipTypes: 'text/plain text/css application/json application/javascript',
        keepaliveTimeout: '65s',
        workerProcesses: 'auto',
        sendfile: true,
        tcpNopush: true,
      },
    };
  }

  private normalizeState(input?: Partial<NginxModuleState>): NginxModuleState {
    const defaults = this.buildDefaultState();
    return {
      upstreams: Array.isArray(input?.upstreams) ? input!.upstreams! : defaults.upstreams,
      sslCertificates: Array.isArray(input?.sslCertificates)
        ? input!.sslCertificates!
        : defaults.sslCertificates,
      traffic: input?.traffic
        ? {
            ...defaults.traffic,
            ...input.traffic,
          }
        : defaults.traffic,
      performance: input?.performance
        ? {
            ...defaults.performance,
            ...input.performance,
          }
        : defaults.performance,
    };
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
}

import { NginxConfigService } from './nginx-config.service';
import { NginxModuleStateStore } from './nginx-module-state.store';
import { NginxPerformanceService } from './nginx-performance.service';
import { NginxService } from './nginx.service';
import { NginxSslService } from './nginx-ssl.service';
import { NginxTrafficService } from './nginx-traffic.service';
import { NginxUpstreamService } from './nginx-upstream.service';
import type {
  NginxModuleSettings,
  NginxPerformanceConfig,
  NginxSslCertificate,
  NginxTrafficConfig,
  NginxUpstream,
} from './nginx.types';

/**
 * 模块配置
 */
export class NginxModuleService {
  private readonly stateStore: NginxModuleStateStore;
  private readonly configService: NginxConfigService;
  private readonly upstreamService: NginxUpstreamService;
  private readonly sslService: NginxSslService;
  private readonly trafficService: NginxTrafficService;
  private readonly performanceService: NginxPerformanceService;

  constructor(
    nginxService: NginxService,
    configService: NginxConfigService
  ) {
    this.configService = configService;
    const stateStore = new NginxModuleStateStore(nginxService);
    this.stateStore = stateStore;
    this.upstreamService = new NginxUpstreamService(nginxService, configService);
    this.sslService = new NginxSslService(nginxService, configService, stateStore);
    this.trafficService = new NginxTrafficService(stateStore);
    this.performanceService = new NginxPerformanceService(stateStore);
  }

  async getUpstreams(): Promise<NginxUpstream[]> {
    return await this.upstreamService.getUpstreams();
  }

  async saveUpstreams(upstreams: NginxUpstream[]): Promise<void> {
    await this.upstreamService.saveUpstreams(upstreams);
  }

  async getSslCertificates(): Promise<NginxSslCertificate[]> {
    return await this.sslService.getSslCertificates();
  }

  async saveSslCertificates(certificates: NginxSslCertificate[]): Promise<void> {
    await this.sslService.saveSslCertificates(certificates);
  }

  async getTrafficConfig(): Promise<NginxTrafficConfig> {
    return await this.trafficService.getTrafficConfig();
  }

  async saveTrafficConfig(traffic: NginxTrafficConfig): Promise<void> {
    await this.trafficService.saveTrafficConfig(traffic);
  }

  async getPerformanceConfig(): Promise<NginxPerformanceConfig> {
    return await this.performanceService.getPerformanceConfig();
  }

  async savePerformanceConfig(performance: NginxPerformanceConfig): Promise<void> {
    await this.performanceService.savePerformanceConfig(performance);
  }

  async getModuleSettings(): Promise<NginxModuleSettings> {
    return await this.stateStore.getSettings();
  }

  async saveModuleSettings(settings: Partial<NginxModuleSettings>): Promise<NginxModuleSettings> {
    const next = await this.stateStore.saveSettings(settings);
    await this.configService.cleanupAllConfigBackups(next.configBackupRetention);
    return next;
  }
}

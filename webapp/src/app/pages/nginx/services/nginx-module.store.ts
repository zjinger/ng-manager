import { Injectable, signal } from '@angular/core';
import type {
  NginxModuleSettings,
  NginxPerformanceConfig,
  NginxSslCertificate,
  NginxTrafficConfig,
  NginxUpstream,
} from '../models/nginx.types';
import { NginxService } from './nginx.service';

@Injectable({
  providedIn: 'root',
})
export class NginxModuleStore {
  constructor(private nginxService: NginxService) {}

  readonly upstreams = signal<NginxUpstream[]>([]);
  readonly sslCertificates = signal<NginxSslCertificate[]>([]);
  readonly trafficConfig = signal<NginxTrafficConfig>({
    rateLimitEnabled: false,
    rateLimit: '',
    connLimitEnabled: false,
    connLimit: 0,
    blacklistIps: [],
  });
  readonly performanceConfig = signal<NginxPerformanceConfig>({
    gzipEnabled: false,
    gzipTypes: '',
    keepaliveTimeout: '',
    workerProcesses: '',
    sendfile: false,
    tcpNopush: false,
  });
  readonly moduleSettings = signal<NginxModuleSettings>({
    backupRetention: 5,
    configBackupRetention: 20,
  });

  readonly upstreamsLoading = signal(false);
  readonly sslLoading = signal(false);
  readonly trafficLoading = signal(false);
  readonly performanceLoading = signal(false);
  readonly settingsLoading = signal(false);

  async loadUpstreams() {
    this.upstreamsLoading.set(true);
    try {
      const res = await this.nginxService.getUpstreams();
      if (res.upstreams) {
        this.upstreams.set(res.upstreams);
      }
      return res;
    } finally {
      this.upstreamsLoading.set(false);
    }
  }

  async saveUpstreams(upstreams: NginxUpstream[]) {
    await this.nginxService.saveUpstreams(upstreams);
    this.upstreams.set(upstreams.map(item => ({ ...item })));
  }

  async loadSslCertificates() {
    this.sslLoading.set(true);
    try {
      const res = await this.nginxService.getSslCertificates();
      if (res.certificates) {
        this.sslCertificates.set(res.certificates.map(item => ({ ...item })));
      }
      return res;
    } finally {
      this.sslLoading.set(false);
    }
  }

  async saveSslCertificates(certificates: NginxSslCertificate[]) {
    await this.nginxService.saveSslCertificates(certificates);
    this.sslCertificates.set(certificates.map(item => ({ ...item })));
  }

  async loadTrafficConfig() {
    this.trafficLoading.set(true);
    try {
      const res = await this.nginxService.getTrafficConfig();
      if (res.traffic) {
        this.trafficConfig.set({
          ...res.traffic,
          connLimit: Math.max(0, Number(res.traffic.connLimit ?? 0)),
        });
      }
      return res;
    } finally {
      this.trafficLoading.set(false);
    }
  }

  async saveTrafficConfig(traffic: NginxTrafficConfig) {
    await this.nginxService.saveTrafficConfig(traffic);
    this.trafficConfig.set({ ...traffic });
  }

  async loadPerformanceConfig() {
    this.performanceLoading.set(true);
    try {
      const res = await this.nginxService.getPerformanceConfig();
      if (res.performance) {
        this.performanceConfig.set({
          ...res.performance,
        });
      }
      return res;
    } finally {
      this.performanceLoading.set(false);
    }
  }

  async savePerformanceConfig(performance: NginxPerformanceConfig) {
    await this.nginxService.savePerformanceConfig(performance);
    this.performanceConfig.set({ ...performance });
  }

  async loadModuleSettings() {
    this.settingsLoading.set(true);
    try {
      const res = await this.nginxService.getModuleSettings();
      if (res.settings) {
        this.moduleSettings.set({
          backupRetention: Math.max(1, Number(res.settings.backupRetention ?? 5)),
          configBackupRetention: Math.max(1, Number(res.settings.configBackupRetention ?? 20)),
        });
      }
      return res;
    } finally {
      this.settingsLoading.set(false);
    }
  }

  async saveModuleSettings(settings: Partial<NginxModuleSettings>) {
    const res = await this.nginxService.saveModuleSettings(settings);
    if (res.settings) {
      this.moduleSettings.set({
        backupRetention: Math.max(1, Number(res.settings.backupRetention ?? 5)),
        configBackupRetention: Math.max(1, Number(res.settings.configBackupRetention ?? 20)),
      });
    }
    return res;
  }
}

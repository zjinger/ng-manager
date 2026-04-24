import { readdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { NginxService } from './nginx.service';
import type {
  NginxModuleSettings,
  NginxPerformanceConfig,
  NginxSslCertificate,
  NginxTrafficConfig,
  NginxUpstream,
} from './nginx.types';

export interface NginxModuleState {
  upstreams: NginxUpstream[];
  sslCertificates: NginxSslCertificate[];
  traffic: NginxTrafficConfig;
  performance: NginxPerformanceConfig;
}

/**
 * 模块状态存储（.ngm-nginx-module.json）
 * 仅负责状态读写与回退，不承担具体业务解析逻辑
 */
export class NginxModuleStateStore {
  private volatileState: NginxModuleState = this.buildDefaultState();
  private volatileSettings: NginxModuleSettings = this.buildDefaultSettings();

  constructor(private nginxService: NginxService) {}

  async readState(): Promise<NginxModuleState> {
    const path = this.getStateFilePath();
    if (!path) {
      return this.volatileState;
    }

    try {
      const raw = await readFile(path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<NginxModuleState>;
      let normalized = this.normalizeState(parsed);

      if (!this.hasPersistedState(normalized)) {
        await this.safeUnlink(path);
      }

      this.volatileState = normalized;
      return normalized;
    } catch {
      const defaults = this.buildDefaultState();
      this.volatileState = defaults;
      return defaults;
    }
  }

  async writeState(next: NginxModuleState): Promise<void> {
    const normalized = this.normalizeState(next);
    this.volatileState = normalized;

    const path = this.getStateFilePath();
    if (!path) {
      return;
    }
    const settings = await this.getSettings();

    if (!this.hasPersistedState(normalized)) {
      await this.safeUnlink(path);
      await this.cleanupBackups(path, settings.backupRetention);
      return;
    }

    const content = JSON.stringify(normalized, null, 2);
    let previousContent: string | null = null;

    try {
      previousContent = await readFile(path, 'utf-8');
      const backupPath = `${path}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await writeFile(backupPath, previousContent, 'utf-8');
    } catch {
      previousContent = null;
    }

    try {
      await writeFile(path, content, 'utf-8');
    } catch (error) {
      if (previousContent !== null) {
        try {
          await writeFile(path, previousContent, 'utf-8');
        } catch {
          // 回滚失败，保留原始异常
        }
      }
      throw error;
    }

    await this.cleanupBackups(path, settings.backupRetention);
  }

  makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  async getSettings(): Promise<NginxModuleSettings> {
    const path = this.getSettingsFilePath();
    if (!path) {
      return this.volatileSettings;
    }

    try {
      const raw = await readFile(path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<NginxModuleSettings>;
      const normalized = this.normalizeSettings(parsed);
      this.volatileSettings = normalized;
      return normalized;
    } catch {
      const defaults = this.buildDefaultSettings();
      this.volatileSettings = defaults;
      return defaults;
    }
  }

  async saveSettings(input: Partial<NginxModuleSettings>): Promise<NginxModuleSettings> {
    const current = await this.getSettings();
    const next = this.normalizeSettings({
      ...current,
      ...(input || {}),
    });
    this.volatileSettings = next;

    const path = this.getSettingsFilePath();
    const defaults = this.buildDefaultSettings();
    if (!path) {
      await this.applyBackupRetention(next.backupRetention);
      return next;
    }

    if (
      next.backupRetention === defaults.backupRetention &&
      next.configBackupRetention === defaults.configBackupRetention
    ) {
      await this.safeUnlink(path);
      await this.applyBackupRetention(next.backupRetention);
      return next;
    }

    await writeFile(path, JSON.stringify(next, null, 2), 'utf-8');
    await this.applyBackupRetention(next.backupRetention);
    return next;
  }

  private getStateFilePath(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }
    return join(dirname(instance.configPath), '.ngm-nginx-module.json');
  }

  private getSettingsFilePath(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }
    return join(dirname(instance.configPath), '.ngm-nginx-module.settings.json');
  }

  private buildDefaultState(): NginxModuleState {
    return {
      upstreams: [],
      sslCertificates: [],
      traffic: {
        rateLimitEnabled: false,
        rateLimit: '',
        connLimitEnabled: false,
        connLimit: 0,
        blacklistIps: [],
      },
      performance: {
        gzipEnabled: false,
        gzipTypes: '',
        keepaliveTimeout: '',
        workerProcesses: '',
        sendfile: false,
        tcpNopush: false,
      },
    };
  }

  private buildDefaultSettings(): NginxModuleSettings {
    return {
      backupRetention: 5,
      configBackupRetention: 20,
    };
  }

  private normalizeState(input?: Partial<NginxModuleState>): NginxModuleState {
    const defaults = this.buildDefaultState();

    const normalizedTraffic: NginxTrafficConfig = {
      ...defaults.traffic,
      ...(input?.traffic || {}),
      rateLimitEnabled: Boolean(input?.traffic?.rateLimitEnabled),
      rateLimit: input?.traffic?.rateLimit?.trim() || '',
      connLimitEnabled: Boolean(input?.traffic?.connLimitEnabled),
      connLimit: Number.isFinite(Number(input?.traffic?.connLimit))
        ? Math.max(0, Number(input?.traffic?.connLimit))
        : defaults.traffic.connLimit,
      blacklistIps: Array.isArray(input?.traffic?.blacklistIps)
        ? input!.traffic!.blacklistIps!.map(item => String(item).trim()).filter(Boolean)
        : [],
    };

    const normalizedPerformance: NginxPerformanceConfig = {
      ...defaults.performance,
      ...(input?.performance || {}),
      gzipEnabled: Boolean(input?.performance?.gzipEnabled),
      gzipTypes: input?.performance?.gzipTypes?.trim() || '',
      keepaliveTimeout: input?.performance?.keepaliveTimeout?.trim() || '',
      workerProcesses: input?.performance?.workerProcesses?.trim() || '',
      sendfile: Boolean(input?.performance?.sendfile),
      tcpNopush: Boolean(input?.performance?.tcpNopush),
    };

    return {
      upstreams: Array.isArray(input?.upstreams) ? input!.upstreams! : defaults.upstreams,
      sslCertificates: Array.isArray(input?.sslCertificates)
        ? input!.sslCertificates!.map((item, index) => this.normalizeSsl(item, `ssl-legacy-${index}`))
        : defaults.sslCertificates,
      traffic: normalizedTraffic,
      performance: normalizedPerformance,
    };
  }

  private normalizeSettings(input?: Partial<NginxModuleSettings>): NginxModuleSettings {
    const defaults = this.buildDefaultSettings();
    const stateRaw = Number(input?.backupRetention);
    const stateNormalized = Number.isFinite(stateRaw) ? Math.trunc(stateRaw) : defaults.backupRetention;
    const configRaw = Number(input?.configBackupRetention);
    const configNormalized = Number.isFinite(configRaw)
      ? Math.trunc(configRaw)
      : defaults.configBackupRetention;
    return {
      backupRetention: Math.max(1, Math.min(200, stateNormalized)),
      configBackupRetention: Math.max(1, Math.min(200, configNormalized)),
    };
  }

  private normalizeSsl(input: Partial<NginxSslCertificate>, fallbackId: string): NginxSslCertificate {
    const status = input.status;
    return {
      id: String(input.id || fallbackId).trim() || fallbackId,
      domain: String(input.domain || '').trim(),
      certPath: String(input.certPath || '').trim(),
      keyPath: String(input.keyPath || '').trim(),
      expireAt: String(input.expireAt || '').trim(),
      status: status === 'valid' || status === 'expiring' || status === 'expired' || status === 'pending' ? status : 'pending',
      autoRenew: Boolean(input.autoRenew),
    };
  }

  private hasPersistedState(state: NginxModuleState): boolean {
    const defaults = this.buildDefaultState();
    if (state.sslCertificates.length > 0) {
      return true;
    }
    if (JSON.stringify(state.traffic) !== JSON.stringify(defaults.traffic)) {
      return true;
    }
    if (JSON.stringify(state.performance) !== JSON.stringify(defaults.performance)) {
      return true;
    }
    return false;
  }

  private async cleanupBackups(statePath: string, keep: number): Promise<void> {
    const keepCount = Math.max(1, Math.trunc(keep));
    const dir = dirname(statePath);
    const prefix = `${basename(statePath)}.backup-`;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const backupNames = entries
        .filter(entry => entry.isFile() && entry.name.startsWith(prefix))
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

      const removeNames = backupNames.slice(0, Math.max(0, backupNames.length - keepCount));
      await Promise.all(removeNames.map(name => this.safeUnlink(join(dir, name))));
    } catch {
      // 备份清理失败不影响主流程
    }
  }

  private async applyBackupRetention(keep: number): Promise<void> {
    const statePath = this.getStateFilePath();
    if (!statePath) {
      return;
    }
    await this.cleanupBackups(statePath, keep);
  }

  private async safeUnlink(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch {
      // 文件不存在或不可删除时忽略
    }
  }
}

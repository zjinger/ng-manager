import { access, constants, mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { atomicWrite, FileLock } from '@yinuo-ngm/storage';
import { NginxService } from './nginx.service';
import type { NginxConfig, NginxConfigValidation } from '../types/nginx.types';
import { nginxErrors } from '@yinuo-ngm/errors';
import {
  extractIncludePatterns,
  injectIncludeIntoHttp,
  normalizeConfigBackupRetention,
  normalizeLockPath,
  resolveFromConfig,
} from './nginx-config-utils';
export class NginxConfigService {
  private readonly writeLock = new FileLock();
  private readonly moduleSettingsCacheTtlMs = 5000;
  private moduleSettingsCache: {
    loadedAt: number;
    value: {
      configBackupRetention: number;
    };
  } | null = null;

  constructor(private nginxService: NginxService) {}
  async readMainConfig(): Promise<NginxConfig> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw nginxErrors.notBound();
    }

    const configPath = instance.configPath;

    try {
      const content = await readFile(configPath, 'utf-8');
      const isWritable = await this.checkWritable(configPath);

      return {
        mainConfigPath: configPath,
        content,
        isWritable,
      };
    } catch (error: any) {
      throw nginxErrors.configReadFailed(configPath, error.message);
    }
  }
  async writeMainConfig(content: string): Promise<void> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw nginxErrors.notBound();
    }

    const configPath = instance.configPath;

    const validation = await this.validateConfig(content);
    if (!validation.valid) {
      throw nginxErrors.configInvalid(instance.configPath, validation.errors?.join(', ') || '配置验证失败');
    }

    try {
      await this.withWriteLock(configPath, async () => {
        await this.backupConfig(configPath);
        try {
          await atomicWrite(configPath, content);
        } finally {
          await this.cleanupConfigBackups(configPath, await this.getConfigBackupRetention());
        }
      });
    } catch (error: any) {
      throw nginxErrors.configWriteFailed(configPath, error.message);
    }
  }
  async validateConfig(content?: string): Promise<NginxConfigValidation> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return { valid: false, errors: ['Nginx 未绑定'] };
    }

    if (content) {
      const tempPath = join(dirname(instance.configPath), 'nginx.conf.tmp');
      try {
        await writeFile(tempPath, content, 'utf-8');
        const result = await this.nginxService.testConfig(tempPath);

        try {
          await access(tempPath, constants.F_OK);
        } catch {
          // 文件不存在，忽略
        }

        return result;
      } catch (error: any) {
        return { valid: false, errors: [error.message] };
      }
    }

    return this.nginxService.testConfig();
  }
  async getIncludedConfigs(): Promise<string[]> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return [];
    }

    const includes: string[] = [];
    const seen = new Set<string>();
    const queue: string[] = [instance.configPath];

    while (queue.length) {
      const currentPath = queue.shift()!;
      if (seen.has(currentPath)) {
        continue;
      }
      seen.add(currentPath);
      includes.push(currentPath);

      try {
        const content = await readFile(currentPath, 'utf-8');
        const targets = await this.resolveIncludeTargets(content, currentPath);
        for (const target of targets) {
          if (!seen.has(target)) {
            queue.push(target);
          }
        }
      } catch {
        // 文件不可读，忽略
      }
    }

    return includes;
  }
  async resolveServerConfigDir(): Promise<string> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw nginxErrors.notBound();
    }

    const mainConfig = await this.readMainConfig();
    const includePatterns = extractIncludePatterns(mainConfig.content).map(pattern =>
      resolveFromConfig(pattern, instance.configPath)
    );

    const preferredPattern = includePatterns.find(pattern => /\*.*\.conf|\.conf.*\*/i.test(pattern));
    if (preferredPattern) {
      return dirname(preferredPattern);
    }

    const configDir = this.getConfDir() || join(dirname(instance.configPath), 'conf.d');
    const hasConfDInclude = /include\s+["']?(?:[^;"']*[\\/])?conf\.d[\\/]\*\.conf["']?\s*;/i.test(mainConfig.content);
    if (!hasConfDInclude) {
      const updated = injectIncludeIntoHttp(mainConfig.content, 'include conf.d/*.conf;');
      if (updated !== mainConfig.content) {
        await this.writeMainConfig(updated);
      }
    }

    return configDir;
  }
  async readConfigFile(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error: any) {
      throw nginxErrors.configReadFailed(filePath, error.message);
    }
  }
  async writeConfigFile(filePath: string, content: string): Promise<void> {
    try {
      await this.withWriteLock(filePath, async () => {
        await this.writeContentWithBackup(filePath, content);
      });
    } catch (error: any) {
      throw nginxErrors.configWriteFailed(filePath, error.message);
    }
  }

  async mutateConfigFile(
    filePath: string,
    mutator: (
      original: string
    ) => Promise<{ type: 'write'; content: string } | { type: 'delete' } | { type: 'noop' }> | { type: 'write'; content: string } | { type: 'delete' } | { type: 'noop' }
  ): Promise<void> {
    try {
      await this.withWriteLock(filePath, async () => {
        const original = await readFile(filePath, 'utf-8');
        const mutation = await mutator(original);
        if (mutation.type === 'noop') {
          return;
        }
        if (mutation.type === 'delete') {
          await this.deleteFileWithBackup(filePath);
          return;
        }
        await this.writeContentWithBackup(filePath, mutation.content);
      });
    } catch (error: any) {
      throw nginxErrors.configWriteFailed(filePath, error.message);
    }
  }
  async cleanupAllConfigBackups(keep: number): Promise<void> {
    const keepCount = normalizeConfigBackupRetention(keep);
    const includedFiles = await this.getIncludedConfigs();
    const uniqueFiles = new Set<string>(includedFiles);
    for (const filePath of uniqueFiles) {
      await this.cleanupConfigBackups(filePath, keepCount);
    }
  }
  async isConfigFileWritable(filePath: string): Promise<boolean> {
    return this.checkWritable(filePath);
  }
  getConfigDir(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }

    return dirname(instance.configPath);
  }
  getSitesAvailableDir(): string | null {
    const configDir = this.getConfigDir();
    if (!configDir) return null;

    return join(configDir, 'sites-available');
  }
  getSitesEnabledDir(): string | null {
    const configDir = this.getConfigDir();
    if (!configDir) return null;

    return join(configDir, 'sites-enabled');
  }
  getConfDir(): string | null {
    const configDir = this.getConfigDir();
    if (!configDir) return null;

    return join(configDir, 'conf.d');
  }

  private async checkWritable(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async backupConfig(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;

    try {
      const content = await readFile(filePath, 'utf-8');
      await writeFile(backupPath, content, 'utf-8');
    } catch {
      // 备份失败，继续
    }
  }

  private async getConfigBackupRetention(): Promise<number> {
    const settings = await this.getModuleSettingsSnapshot();
    return settings.configBackupRetention;
  }

  private getModuleSettingsPath(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }
    return join(dirname(instance.configPath), '.ngm-nginx-module.settings.json');
  }

  private async cleanupConfigBackups(filePath: string, keep: number): Promise<void> {
    const keepCount = normalizeConfigBackupRetention(keep);
    const dir = dirname(filePath);
    const prefix = `${basename(filePath)}.backup-`;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const names = entries
        .filter(entry => entry.isFile() && entry.name.startsWith(prefix))
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));
      const remove = names.slice(0, Math.max(0, names.length - keepCount));
      await Promise.all(
        remove.map(async name => {
          try {
            await unlink(join(dir, name));
          } catch {
            // ignore
          }
        })
      );
    } catch {
      // ignore cleanup failures
    }
  }

  private async resolveIncludeTargets(content: string, configPath: string): Promise<string[]> {
    const targets: string[] = [];
    const seen = new Set<string>();
    const patterns = extractIncludePatterns(content);

    for (const pattern of patterns) {
      const absolutePattern = resolveFromConfig(pattern, configPath);
      if (absolutePattern.includes('*')) {
        const baseDir = dirname(absolutePattern);
        try {
          const files = await readdir(baseDir);
          for (const file of files) {
            if (!file.endsWith('.conf')) {
              continue;
            }
            const resolved = join(baseDir, file);
            if (!seen.has(resolved)) {
              seen.add(resolved);
              targets.push(resolved);
            }
          }
        } catch {
          // 目录不存在，忽略
        }
        continue;
      }

      if (!seen.has(absolutePattern)) {
        seen.add(absolutePattern);
        targets.push(absolutePattern);
      }
    }

    return targets;
  }

  private async withWriteLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = normalizeLockPath(filePath);
    return this.writeLock.withLock(lockKey, fn);
  }

  private async writeContentWithBackup(filePath: string, content: string): Promise<void> {
    const dir = dirname(filePath);
    try {
      await access(dir, constants.F_OK);
    } catch {
      await mkdir(dir, { recursive: true });
    }

    await this.backupConfig(filePath);
    try {
      await atomicWrite(filePath, content);
    } finally {
      await this.cleanupConfigBackups(filePath, await this.getConfigBackupRetention());
    }
  }

  private async deleteFileWithBackup(filePath: string): Promise<void> {
    await this.backupConfig(filePath);
    try {
      await unlink(filePath);
    } finally {
      await this.cleanupConfigBackups(filePath, await this.getConfigBackupRetention());
    }
  }

  private async getModuleSettingsSnapshot(): Promise<{
    configBackupRetention: number;
  }> {
    const now = Date.now();
    if (this.moduleSettingsCache && now - this.moduleSettingsCache.loadedAt < this.moduleSettingsCacheTtlMs) {
      return this.moduleSettingsCache.value;
    }

    const defaults = {
      configBackupRetention: 20,
    };

    const settingsPath = this.getModuleSettingsPath();
    if (!settingsPath) {
      this.moduleSettingsCache = { loadedAt: now, value: defaults };
      return defaults;
    }

    try {
      const raw = await readFile(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw) as {
        configBackupRetention?: unknown;
      };
      const value = {
        configBackupRetention: normalizeConfigBackupRetention(parsed?.configBackupRetention),
      };
      this.moduleSettingsCache = { loadedAt: now, value };
      return value;
    } catch {
      this.moduleSettingsCache = { loadedAt: now, value: defaults };
      return defaults;
    }
  }

}


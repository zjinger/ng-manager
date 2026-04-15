import { access, constants, mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'path';
import { NginxService } from './nginx.service';
import type { NginxConfig, NginxConfigValidation } from './nginx.types';

/**
 * Nginx 配置管理服务
 * 负责配置文件的读取、写入、验证等
 */
export class NginxConfigService {
  constructor(private nginxService: NginxService) {}

  /**
   * 读取主配置文件
   */
  async readMainConfig(): Promise<NginxConfig> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw new Error('Nginx 未绑定');
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
      throw new Error(`读取配置文件失败: ${error.message}`);
    }
  }

  /**
   * 写入主配置文件
   */
  async writeMainConfig(content: string): Promise<void> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw new Error('Nginx 未绑定');
    }

    const configPath = instance.configPath;

    const validation = await this.validateConfig(content);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors?.join(', ')}`);
    }

    try {
      await this.backupConfig(configPath);
      await writeFile(configPath, content, 'utf-8');
      await this.cleanupConfigBackups(configPath, await this.getConfigBackupRetention());
    } catch (error: any) {
      throw new Error(`写入配置文件失败: ${error.message}`);
    }
  }

  /**
   * 验证配置语法
   */
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

  /**
   * 获取包含的配置文件列表
   */
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

  /**
   * 解析“新增 server”应保存的目录。
   * 优先复用 nginx.conf 里已有的 *.conf include 目录；若不存在则自动补 conf.d/*.conf。
   */
  async resolveServerConfigDir(): Promise<string> {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      throw new Error('Nginx 未绑定');
    }

    const mainConfig = await this.readMainConfig();
    const includePatterns = this.extractIncludePatterns(mainConfig.content).map(pattern =>
      this.resolveFromConfig(pattern, instance.configPath)
    );

    const preferredPattern = includePatterns.find(pattern => /\*.*\.conf|\.conf.*\*/i.test(pattern));
    if (preferredPattern) {
      return dirname(preferredPattern);
    }

    const configDir = this.getConfDir() || join(dirname(instance.configPath), 'conf.d');
    const hasConfDInclude = /include\s+["']?(?:[^;"']*[\\/])?conf\.d[\\/]\*\.conf["']?\s*;/i.test(mainConfig.content);
    if (!hasConfDInclude) {
      const updated = this.injectIncludeIntoHttp(mainConfig.content, 'include conf.d/*.conf;');
      if (updated !== mainConfig.content) {
        await this.writeMainConfig(updated);
      }
    }

    return configDir;
  }

  /**
   * 读取指定配置文件
   */
  async readConfigFile(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`读取配置文件失败: ${error.message}`);
    }
  }

  /**
   * 写入指定配置文件
   */
  async writeConfigFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = dirname(filePath);
      try {
        await access(dir, constants.F_OK);
      } catch {
        await mkdir(dir, { recursive: true });
      }

      await this.backupConfig(filePath);
      await writeFile(filePath, content, 'utf-8');
      await this.cleanupConfigBackups(filePath, await this.getConfigBackupRetention());
    } catch (error: any) {
      throw new Error(`写入配置文件失败: ${error.message}`);
    }
  }

  /**
   * 按保留数量清理所有已纳入管理的配置备份文件（*.conf.backup-*）
   */
  async cleanupAllConfigBackups(keep: number): Promise<void> {
    const keepCount = this.normalizeConfigBackupRetention(keep);
    const includedFiles = await this.getIncludedConfigs();
    const uniqueFiles = new Set<string>(includedFiles);
    for (const filePath of uniqueFiles) {
      await this.cleanupConfigBackups(filePath, keepCount);
    }
  }

  /**
   * 判断指定配置文件是否可写
   */
  async isConfigFileWritable(filePath: string): Promise<boolean> {
    return this.checkWritable(filePath);
  }

  /**
   * 获取 Nginx 配置目录
   */
  getConfigDir(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }

    return dirname(instance.configPath);
  }

  /**
   * 获取 sites-available 目录（Debian/Ubuntu 风格）
   */
  getSitesAvailableDir(): string | null {
    const configDir = this.getConfigDir();
    if (!configDir) return null;

    return join(configDir, 'sites-available');
  }

  /**
   * 获取 sites-enabled 目录（Debian/Ubuntu 风格）
   */
  getSitesEnabledDir(): string | null {
    const configDir = this.getConfigDir();
    if (!configDir) return null;

    return join(configDir, 'sites-enabled');
  }

  /**
   * 获取 conf.d 目录（通用风格）
   */
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
    const settingsPath = this.getModuleSettingsPath();
    if (!settingsPath) {
      return 20;
    }

    try {
      const raw = await readFile(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw) as { configBackupRetention?: unknown };
      return this.normalizeConfigBackupRetention(parsed?.configBackupRetention);
    } catch {
      return 20;
    }
  }

  private normalizeConfigBackupRetention(input: unknown): number {
    const raw = Number(input);
    const normalized = Number.isFinite(raw) ? Math.trunc(raw) : 20;
    return Math.max(1, Math.min(200, normalized));
  }

  private getModuleSettingsPath(): string | null {
    const instance = this.nginxService.getInstance();
    if (!instance) {
      return null;
    }
    return join(dirname(instance.configPath), '.ngm-nginx-module.settings.json');
  }

  private async cleanupConfigBackups(filePath: string, keep: number): Promise<void> {
    const keepCount = this.normalizeConfigBackupRetention(keep);
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

  private resolveFromConfig(rawPath: string, configPath: string): string {
    if (isAbsolute(rawPath)) {
      return rawPath;
    }
    return resolve(dirname(configPath), rawPath);
  }

  private async resolveIncludeTargets(content: string, configPath: string): Promise<string[]> {
    const targets: string[] = [];
    const seen = new Set<string>();
    const patterns = this.extractIncludePatterns(content);

    for (const pattern of patterns) {
      const absolutePattern = this.resolveFromConfig(pattern, configPath);
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

  private extractIncludePatterns(content: string): string[] {
    const patterns: string[] = [];
    const includeRegex = /include\s+([^;]+);/g;
    let match: RegExpExecArray | null = null;

    while ((match = includeRegex.exec(content)) !== null) {
      const raw = match[1]?.trim();
      if (!raw) {
        continue;
      }
      patterns.push(raw.replace(/^["']|["']$/g, ''));
    }

    return patterns;
  }

  private injectIncludeIntoHttp(content: string, includeLine: string): string {
    const httpMatch = /http\s*\{/.exec(content);
    const newline = content.includes('\r\n') ? '\r\n' : '\n';

    if (!httpMatch) {
      return `${content.trimEnd()}${newline}${includeLine}${newline}`;
    }

    const insertPos = httpMatch.index + httpMatch[0].length;
    return `${content.slice(0, insertPos)}${newline}    ${includeLine}${content.slice(insertPos)}`;
  }
}

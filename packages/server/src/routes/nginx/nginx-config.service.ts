import { access, constants, mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { nginxService } from './nginx.service';
import type { NginxConfig, NginxConfigValidation } from './nginx.types';

/**
 * Nginx 配置管理服务
 * 负责配置文件的读取、写入、验证等
 */
export class NginxConfigService {
  /**
   * 读取主配置文件
   */
  async readMainConfig(): Promise<NginxConfig> {
    const instance = nginxService.getInstance();
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
    const instance = nginxService.getInstance();
    if (!instance) {
      throw new Error('Nginx 未绑定');
    }

    const configPath = instance.configPath;

    // 先验证配置语法
    const validation = await nginxService.testConfig();
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors?.join(', ')}`);
    }

    try {
      // 备份原配置
      await this.backupConfig(configPath);
      
      // 写入新配置
      await writeFile(configPath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`写入配置文件失败: ${error.message}`);
    }
  }

  /**
   * 验证配置语法
   */
  async validateConfig(content?: string): Promise<NginxConfigValidation> {
    const instance = nginxService.getInstance();
    if (!instance) {
      return {
        valid: false,
        errors: ['Nginx 未绑定'],
      };
    }

    // 如果有内容，先写入临时文件验证
    if (content) {
      const tempPath = join(dirname(instance.configPath), 'nginx.conf.tmp');
      try {
        await writeFile(tempPath, content, 'utf-8');
        const result = await nginxService.testConfig(tempPath);
        
        // 清理临时文件
        try {
          await access(tempPath, constants.F_OK);
          // 不删除，保留作为备份
        } catch {
          // 文件不存在，忽略
        }

        return result;
      } catch (error: any) {
        return {
          valid: false,
          errors: [error.message],
        };
      }
    }

    // 验证当前配置
    return nginxService.testConfig();
  }

  /**
   * 获取包含的配置文件列表
   */
  async getIncludedConfigs(): Promise<string[]> {
    const instance = nginxService.getInstance();
    if (!instance) {
      return [];
    }

    const mainConfig = await this.readMainConfig();
    const includes: string[] = [];

    // 解析 include 指令
    const includeRegex = /include\s+([^;]+);/g;
    let match;

    while ((match = includeRegex.exec(mainConfig.content)) !== null) {
      const pattern = match[1].trim();
      
      // 处理通配符
      if (pattern.includes('*')) {
        const dir = dirname(pattern);
        const baseDir = join(dirname(instance.configPath), dir);
        
        try {
          const files = await readdir(baseDir);
          for (const file of files) {
            if (file.endsWith('.conf')) {
              includes.push(join(baseDir, file));
            }
          }
        } catch {
          // 目录不存在，忽略
        }
      } else {
        includes.push(join(dirname(instance.configPath), pattern));
      }
    }

    return includes;
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
      // 确保目录存在
      const dir = dirname(filePath);
      try {
        await access(dir, constants.F_OK);
      } catch {
        await mkdir(dir, { recursive: true });
      }

      // 备份原配置
      await this.backupConfig(filePath);

      // 写入新配置
      await writeFile(filePath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`写入配置文件失败: ${error.message}`);
    }
  }

  /**
   * 检查文件是否可写
   */
  private async checkWritable(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 备份配置文件
   */
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

  /**
   * 获取 Nginx 配置目录
   */
  getConfigDir(): string | null {
    const instance = nginxService.getInstance();
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
}

// 单例实例
export const nginxConfigService = new NginxConfigService();

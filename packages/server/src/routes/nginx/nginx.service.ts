import { execFile } from 'child_process';
import { access, constants } from 'fs/promises';
import { platform } from 'os';
import { dirname, join, resolve } from 'path';
import { promisify } from 'util';
import type {
  NginxCommandResult,
  NginxConfigValidation,
  NginxInstance,
  NginxStatus,
} from './nginx.types';

const execFileAsync = promisify(execFile);

/**
 * Nginx 核心服务
 * 负责 Nginx 进程的启动、停止、状态检测等
 */
export class NginxService {
  private instance: NginxInstance | null = null;

  /**
   * 获取当前绑定的 Nginx 实例
   */
  getInstance(): NginxInstance | null {
    return this.instance;
  }

  /**
   * 绑定 Nginx 实例
   */
  async bind(path: string): Promise<NginxInstance> {
    // 验证路径是否存在且可执行
    await this.validateExecutable(path);

    // 获取版本信息
    const version = await this.getVersion(path);

    // 获取配置路径和前缀路径
    const { configPath, prefixPath } = await this.getPaths(path);

    this.instance = {
      path,
      version,
      configPath,
      prefixPath,
      isBound: true,
    };

    return this.instance;
  }

  /**
   * 解绑 Nginx 实例
   */
  unbind(): void {
    this.instance = null;
  }

  /**
   * 获取 Nginx 状态
   */
  async getStatus(): Promise<NginxStatus> {
    if (!this.instance) {
      return { isRunning: false };
    }

    const pid = await this.findPid();
    if (!pid) {
      return { isRunning: false };
    }

    // 获取进程信息
    const uptime = await this.getProcessUptime(pid);

    return {
      isRunning: true,
      pid,
      uptime,
    };
  }

  /**
   * 启动 Nginx
   */
  async start(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return {
        success: false,
        error: 'Nginx 未绑定',
      };
    }

    // 检查是否已在运行
    const status = await this.getStatus();
    if (status.isRunning) {
      return {
        success: false,
        error: 'Nginx 已在运行',
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync(this.instance.path, [], {
        cwd: this.instance.prefixPath,
      });

      return {
        success: true,
        output: stdout || 'Nginx 启动成功',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error.stderr || '启动失败',
        exitCode: error.code,
      };
    }
  }

  /**
   * 停止 Nginx
   */
  async stop(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return {
        success: false,
        error: 'Nginx 未绑定',
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        this.instance.path,
        ['-s', 'stop'],
        { cwd: this.instance.prefixPath }
      );

      return {
        success: true,
        output: stdout || 'Nginx 停止成功',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error.stderr || '停止失败',
        exitCode: error.code,
      };
    }
  }

  /**
   * 重载配置
   */
  async reload(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return {
        success: false,
        error: 'Nginx 未绑定',
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        this.instance.path,
        ['-s', 'reload'],
        { cwd: this.instance.prefixPath }
      );

      return {
        success: true,
        output: stdout || '配置重载成功',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error.stderr || '重载失败',
        exitCode: error.code,
      };
    }
  }

  /**
   * 测试配置
   */
  async testConfig(configPath?: string): Promise<NginxConfigValidation> {
    if (!this.instance) {
      return {
        valid: false,
        errors: ['Nginx 未绑定'],
      };
    }

    const args = ['-t'];
    if (configPath) {
      args.push('-c', configPath);
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        this.instance.path,
        args,
        { cwd: this.instance.prefixPath }
      );

      // Nginx -t 输出到 stderr
      const output = stderr || stdout;
      
      if (output?.includes('syntax is ok') && output?.includes('test is successful')) {
        return {
          valid: true,
          warnings: this.parseWarnings(output),
        };
      }

      return {
        valid: false,
        errors: this.parseErrors(output),
      };
    } catch (error: any) {
      const output = error.stderr || error.stdout || error.message;
      return {
        valid: false,
        errors: this.parseErrors(output),
      };
    }
  }

  /**
   * 验证可执行文件
   */
  private async validateExecutable(path: string): Promise<void> {
    try {
      await access(path, constants.X_OK);
    } catch {
      throw new Error(`无法访问 Nginx 可执行文件: ${path}`);
    }
  }

  /**
   * 获取 Nginx 版本
   */
  private async getVersion(path: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync(path, ['-v']);
      // 输出格式: nginx version: nginx/1.24.0
      const match = stdout.match(/nginx\/(\d+\.\d+\.\d+)/);
      return match?.[1] || 'unknown';
    } catch (error: any) {
      throw new Error(`无法获取 Nginx 版本: ${error.message}`);
    }
  }

  /**
   * 获取配置路径和前缀路径
   */
  private async getPaths(path: string): Promise<{ configPath: string; prefixPath: string }> {
    try {
      // 使用 -V 获取编译参数（Windows 输出到 stderr，Unix 输出到 stdout）
      const { stdout, stderr } = await execFileAsync(path, ['-V']);
      
      // 合并 stdout 和 stderr，Windows 下版本信息在 stderr
      const output = `${stdout}${stderr}`;
      
      // 解析 --conf-path 和 --prefix
      const confMatch = output.match(/--conf-path=(\S+)/);
      const prefixMatch = output.match(/--prefix=(\S+)/);

      let configPath = confMatch?.[1];
      let prefixPath = prefixMatch?.[1];

      // 如果没有找到，使用默认值
      if (!prefixPath) {
        // Windows: nginx.exe 同级目录作为 prefix
        if (platform() === 'win32') {
          prefixPath = dirname(path);
        } else {
          // Unix: 父级目录
          prefixPath = dirname(dirname(path));
        }
      }
      
      if (!configPath) {
        configPath = join(prefixPath, 'conf', 'nginx.conf');
      }

      // 如果是相对路径，转换为绝对路径
      if (!configPath.startsWith('/') && !/^[a-zA-Z]:/.test(configPath)) {
        configPath = resolve(prefixPath, configPath);
      }

      return { configPath, prefixPath };
    } catch (error: any) {
      // 使用默认路径
      const isWin = platform() === 'win32';
      const prefixPath = isWin ? dirname(path) : dirname(dirname(path));
      return {
        configPath: join(prefixPath, 'conf', 'nginx.conf'),
        prefixPath,
      };
    }
  }

  /**
   * 查找 Nginx 进程 PID
   */
  private async findPid(): Promise<number | undefined> {
    if (!this.instance) return undefined;

    const plat = platform();

    try {
      if (plat === 'win32') {
        // Windows: 使用 tasklist
        const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq nginx.exe', '/FO', 'CSV']);
        const lines = stdout.split('\n').filter(l => l.includes('nginx.exe'));
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          const pid = parseInt(parts[1]?.replace(/"/g, ''), 10);
          return isNaN(pid) ? undefined : pid;
        }
      } else {
        // Unix-like: 使用 pgrep 或 pidof
        try {
          const { stdout } = await execFileAsync('pgrep', ['-f', `nginx.*master`]);
          const pid = parseInt(stdout.trim(), 10);
          return isNaN(pid) ? undefined : pid;
        } catch {
          // 尝试 pidof
          const { stdout } = await execFileAsync('pidof', ['nginx']);
          const pids = stdout.trim().split(' ').map(Number);
          return pids[0];
        }
      }
    } catch {
      // 进程未运行
    }

    return undefined;
  }

  /**
   * 获取进程运行时间
   */
  private async getProcessUptime(pid: number): Promise<string | undefined> {
    const plat = platform();

    try {
      if (plat === 'win32') {
        // Windows: 使用 wmic
        const { stdout } = await execFileAsync('wmic', ['process', 'where', `ProcessId=${pid}`, 'get', 'CreationDate']);
        // 解析创建时间并计算运行时间
        return undefined; // 简化处理
      } else {
        // Unix-like: 使用 ps
        const { stdout } = await execFileAsync('ps', ['-p', pid.toString(), '-o', 'etime=']);
        return stdout.trim() || undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * 解析错误信息
   */
  private parseErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('[emerg]') || line.includes('[error]')) {
        errors.push(line.trim());
      }
    }

    return errors.length > 0 ? errors : [output];
  }

  /**
   * 解析警告信息
   */
  private parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('[warn]')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}

// 单例实例
export const nginxService = new NginxService();

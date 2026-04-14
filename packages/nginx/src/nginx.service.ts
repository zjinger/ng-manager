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
    const normalizedPath = this.normalizePath(path);
    await this.validateExecutable(normalizedPath);
    const version = await this.getVersion(normalizedPath);
    const { configPath, prefixPath } = await this.getPaths(normalizedPath);

    this.instance = {
      path: normalizedPath,
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

    const uptime = await this.getProcessUptime(pid);
    const activeConnections = await this.getActiveConnections(pid);

    return {
      isRunning: true,
      pid,
      uptime,
      activeConnections,
    };
  }

  /**
   * 启动 Nginx
   */
  async start(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return { success: false, error: 'Nginx 未绑定' };
    }

    const status = await this.getStatus();
    if (status.isRunning) {
      return { success: false, error: 'Nginx 已在运行' };
    }

    try {
      const { stdout } = await execFileAsync(this.instance.path, [], {
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
      return { success: false, error: 'Nginx 未绑定' };
    }

    try {
      const { stdout } = await execFileAsync(
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
      return { success: false, error: 'Nginx 未绑定' };
    }

    try {
      const { stdout } = await execFileAsync(
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
      return { valid: false, errors: ['Nginx 未绑定'] };
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

  private async validateExecutable(path: string): Promise<void> {
    try {
      await access(path, constants.X_OK);
    } catch {
      throw new Error(`无法访问 Nginx 可执行文件: ${path}`);
    }
  }

  private async getVersion(path: string): Promise<string> {
    try {
      // nginx -v 典型输出在 stderr，需合并 stdout/stderr 解析
      const { stdout, stderr } = await execFileAsync(path, ['-v']);
      const output = `${stdout || ''}\n${stderr || ''}`;
      const strictMatch = output.match(/nginx\/([0-9][0-9A-Za-z._-]*)/);
      if (strictMatch?.[1]) {
        return strictMatch[1];
      }
      const looseMatch = output.match(/nginx\/([^\s]+)/);
      return looseMatch?.[1] || 'unknown';
    } catch (error: any) {
      throw new Error(`无法获取 Nginx 版本: ${error.message}`);
    }
  }

  private async getPaths(path: string): Promise<{ configPath: string; prefixPath: string }> {
    try {
      const { stdout, stderr } = await execFileAsync(path, ['-V']);
      const output = `${stdout}${stderr}`;

      const confMatch = output.match(/--conf-path=(\S+)/);
      const prefixMatch = output.match(/--prefix=(\S+)/);

      let configPath = this.stripShellQuotes(confMatch?.[1]);
      let prefixPath = this.stripShellQuotes(prefixMatch?.[1]);

      if (!prefixPath) {
        if (platform() === 'win32') {
          prefixPath = dirname(path);
        } else {
          prefixPath = dirname(dirname(path));
        }
      }

      if (!configPath) {
        configPath = join(prefixPath, 'conf', 'nginx.conf');
      }

      if (!configPath.startsWith('/') && !/^[a-zA-Z]:/.test(configPath)) {
        configPath = resolve(prefixPath, configPath);
      }

      return { configPath, prefixPath };
    } catch (error: any) {
      const isWin = platform() === 'win32';
      const prefixPath = isWin ? dirname(path) : dirname(dirname(path));
      return {
        configPath: join(prefixPath, 'conf', 'nginx.conf'),
        prefixPath,
      };
    }
  }

  private normalizePath(rawPath: string): string {
    return rawPath.trim().replace(/^['"]|['"]$/g, '');
  }

  private stripShellQuotes(value?: string): string | undefined {
    if (!value) {
      return value;
    }
    return value.replace(/^['"]|['"]$/g, '');
  }

  private async findPid(): Promise<number | undefined> {
    if (!this.instance) return undefined;

    const plat = platform();

    try {
      if (plat === 'win32') {
        const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq nginx.exe', '/FO', 'CSV']);
        const lines = stdout.split('\n').filter(l => l.includes('nginx.exe'));
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          const pid = parseInt(parts[1]?.replace(/"/g, ''), 10);
          return isNaN(pid) ? undefined : pid;
        }
      } else {
        try {
          const { stdout } = await execFileAsync('pgrep', ['-f', `nginx.*master`]);
          const pid = parseInt(stdout.trim(), 10);
          return isNaN(pid) ? undefined : pid;
        } catch {
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

  private async getProcessUptime(pid: number): Promise<string | undefined> {
    const plat = platform();

    try {
      if (plat === 'win32') {
        return undefined;
      } else {
        const { stdout } = await execFileAsync('ps', ['-p', pid.toString(), '-o', 'etime=']);
        return stdout.trim() || undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * 获取活跃连接数（ESTABLISHED）
   * 尽力统计，不保证所有平台都可用
   */
  private async getActiveConnections(pid: number): Promise<number | undefined> {
    const plat = platform();

    try {
      if (plat === 'win32') {
        const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp']);
        const lines = stdout.split(/\r?\n/);
        let count = 0;
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !/\s+ESTABLISHED\s+/i.test(line)) {
            continue;
          }
          const parts = line.split(/\s+/);
          const linePid = Number(parts[parts.length - 1]);
          if (linePid === pid) {
            count += 1;
          }
        }
        return count;
      }

      // Linux/macOS: 优先 ss
      try {
        const { stdout } = await execFileAsync('ss', ['-Htanp']);
        const lines = stdout.split('\n');
        let count = 0;
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !line.startsWith('ESTAB')) {
            continue;
          }
          if (line.includes(`pid=${pid},`)) {
            count += 1;
          }
        }
        return count;
      } catch {
        // fallback 到 netstat
        const { stdout } = await execFileAsync('netstat', ['-antp']);
        const lines = stdout.split('\n');
        let count = 0;
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !/\sESTABLISHED\s/i.test(line)) {
            continue;
          }
          if (line.includes(`${pid}/`)) {
            count += 1;
          }
        }
        return count;
      }
    } catch {
      return undefined;
    }
  }

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

import { execFile, spawn } from 'child_process';
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
  private lastConfigAppliedAt: number | null = null;

  getLastConfigAppliedAt(): number | null {
    return this.lastConfigAppliedAt;
  }

  private markConfigAppliedNow(): void {
    this.lastConfigAppliedAt = Date.now();
  }

  async validateFileReadable(path: string): Promise<{ exists: boolean; readable: boolean; error?: string }> {
    const target = this.normalizePath(path);
    if (!target) {
      return { exists: false, readable: false, error: '路径不能为空' };
    }

    try {
      await access(target, constants.F_OK);
    } catch {
      return { exists: false, readable: false, error: '文件不存在' };
    }

    try {
      await access(target, constants.R_OK);
      return { exists: true, readable: true };
    } catch {
      return { exists: true, readable: false, error: '文件不可读' };
    }
  }

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
   * 获取本机 IP 地址
   */
  async getLocalIp(): Promise<{ success: boolean; ip?: string; error?: string }> {
    try {
      const { networkInterfaces } = await import('os');
      const interfaces = networkInterfaces();

      const candidates: string[] = [];

      for (const name of Object.keys(interfaces)) {
        const net = interfaces[name];
        if (!net) continue;

        for (const info of net) {
          if (info.internal) continue;
          if (info.family !== 'IPv4') continue;
          const addr = info.address;
          if (!addr || addr.startsWith('127.')) continue;
          candidates.push(addr);
        }
      }

      if (candidates.length === 0) {
        return { success: false, error: '未找到有效的本机 IP 地址' };
      }

      return { success: true, ip: candidates[0] };
    } catch (error: any) {
      return { success: false, error: error.message || '获取本机 IP 失败' };
    }
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
    const activeConnections = await this.getActiveConnections(await this.findAllPids(pid));
    if (this.lastConfigAppliedAt === null) {
      // 进程已在运行但尚未有本进程内 reload/start 记录时，建立一个基线时间。
      this.markConfigAppliedNow();
    }

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
      const startArgs = this.buildRuntimeArgs();
      await new Promise<void>((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        
        // Windows: 使用 spawn + detached 避免阻塞
        // Linux/Mac: 同样使用 spawn
        const child = spawn(this.instance!.path, startArgs, {
          cwd: this.instance!.prefixPath,
          detached: !isWindows,      // Linux/Mac 使用 detached
          windowsHide: isWindows,    // Windows 隐藏窗口
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';
        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('error', (err) => {
          reject(err);
        });

        if (isWindows) {
          // Windows: 等待一小段时间确认启动成功
          setTimeout(() => {
            resolve();
          }, 500);
        } else {
          // Linux/Mac: unref 让父进程可以退出
          child.unref();
          child.on('spawn', () => resolve());
        }
      });

      // 等待 nginx 完全启动
      await this.waitForStart(3000);

      const finalStatus = await this.getStatus();
      if (finalStatus.isRunning) {
        this.markConfigAppliedNow();
        return { success: true, output: 'Nginx 启动成功' };
      } else {
        return { success: false, error: 'Nginx 启动失败，请检查配置' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error.stderr || '启动失败',
        exitCode: error.code,
      };
    }
  }

  /**
   * 等待 nginx 进程启动
   */
  private async waitForStart(timeout: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = await this.getStatus();
      if (status.isRunning) return;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * 停止 Nginx
   */
  async stop(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return { success: false, error: 'Nginx 未绑定' };
    }

    // 先检查是否在运行
    const status = await this.getStatus();
    if (!status.isRunning) {
      return { success: true, output: 'Nginx 未在运行' };
    }

    const isWindows = process.platform === 'win32';

    try {
      if (isWindows) {
        // Windows: 优先使用 nginx -s quit（优雅退出），失败则用 taskkill
        try {
          await execFileAsync(this.instance.path, this.buildSignalArgs('quit'), {
            cwd: this.instance.prefixPath,
            timeout: 5000
          });
        } catch {
          // nginx -s quit 在 Windows 上可能失败，使用 taskkill
          await execFileAsync('taskkill', ['/F', '/IM', 'nginx.exe'], {
            timeout: 5000
          });
        }
      } else {
        // Linux/Mac: 使用 nginx -s stop
        await execFileAsync(this.instance.path, this.buildSignalArgs('stop'), {
          cwd: this.instance.prefixPath
        });
      }

      // 等待进程退出
      await this.waitForStop(3000);

      return {
        success: true,
        output: 'Nginx 停止成功',
      };
    } catch (error: any) {
      // 检查是否实际已停止
      const currentStatus = await this.getStatus();
      if (!currentStatus.isRunning) {
        return { success: true, output: 'Nginx 已停止' };
      }

      return {
        success: false,
        error: error.stderr || error.message || '停止失败',
        exitCode: error.code,
      };
    }
  }

  /**
   * 等待 nginx 进程停止
   */
  private async waitForStop(timeout: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = await this.getStatus();
      if (!status.isRunning) return;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * 重载配置
   */
  async reload(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return { success: false, error: 'Nginx 未绑定' };
    }

    // 先检查是否在运行
    const status = await this.getStatus();
    if (!status.isRunning) {
      return { success: false, error: 'Nginx 未在运行，无法重载配置' };
    }

    try {
      const { stdout } = await execFileAsync(
        this.instance.path,
        this.buildSignalArgs('reload'),
        { cwd: this.instance.prefixPath }
      );
      this.markConfigAppliedNow();

      return {
        success: true,
        output: stdout || '配置重载成功',
      };
    } catch (error: any) {
      const stderrText = String(error?.stderr || '');
      const messageText = String(error?.message || '');
      const mayBeWindowsSignalMismatch =
        platform() === 'win32' &&
        (stderrText.includes('OpenEvent(') ||
          stderrText.includes('OpenEvent "') ||
          messageText.includes('OpenEvent(') ||
          messageText.includes('OpenEvent "'));

      if (mayBeWindowsSignalMismatch) {
        const stopResult = await this.stop();
        if (stopResult.success) {
          const startResult = await this.start();
          if (startResult.success) {
            this.markConfigAppliedNow();
            return {
              success: true,
              output: 'reload 信号失败，已自动重启并应用配置',
            };
          }
          return {
            success: false,
            error: `reload 信号失败，自动重启启动失败: ${startResult.error || '未知错误'}`,
          };
        }
      }

      return {
        success: false,
        error: error.stderr || error.message || '重载失败',
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

    const args = ['-t', ...this.buildRuntimeArgs(configPath)];

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
        try {
          const { stdout } = await execFileAsync('powershell', [
            '-NoProfile',
            '-Command',
            "$p = Get-Process nginx -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1; if ($p) { $p.Id }",
          ]);
          const pid = parseInt(stdout.trim(), 10);
          if (!isNaN(pid)) {
            return pid;
          }
        } catch {
          // fallback to tasklist
        }

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
        const byPid = await this.getWindowsProcessUptimeSecondsByPid(pid);
        if (byPid !== undefined) {
          return this.formatDuration(byPid);
        }

        const earliestNginx = await this.getWindowsOldestNginxUptimeSeconds();
        if (earliestNginx !== undefined) {
          return this.formatDuration(earliestNginx);
        }
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
  private async getActiveConnections(pids: number[]): Promise<number | undefined> {
    const plat = platform();
    const pidSet = new Set(
      (pids || [])
        .map(item => Number(item))
        .filter(item => Number.isInteger(item) && item > 0)
    );
    if (!pidSet.size) {
      return undefined;
    }

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
          if (pidSet.has(linePid)) {
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
          const pidMatches = line.match(/pid=(\d+),/g) || [];
          if (pidMatches.some(token => pidSet.has(Number(token.replace(/[^\d]/g, ''))))) {
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
          const pidProgramMatches = line.match(/\s(\d+)\/[^\s]+/g) || [];
          if (pidProgramMatches.some(token => pidSet.has(Number(token.replace(/[^\d]/g, ''))))) {
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

  private async findAllPids(primaryPid?: number): Promise<number[]> {
    const result = new Set<number>();
    if (Number.isInteger(primaryPid) && Number(primaryPid) > 0) {
      result.add(Number(primaryPid));
    }

    const plat = platform();
    try {
      if (plat === 'win32') {
        try {
          const { stdout } = await execFileAsync('powershell', [
            '-NoProfile',
            '-Command',
            'Get-Process nginx -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id',
          ]);
          stdout
            .split(/\r?\n/)
            .map(line => Number(line.trim()))
            .filter(pid => Number.isInteger(pid) && pid > 0)
            .forEach(pid => result.add(pid));
        } catch {
          // ignore
        }

        if (!result.size) {
          const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq nginx.exe', '/FO', 'CSV']);
          const lines = stdout.split('\n').filter(line => line.includes('nginx.exe'));
          for (const line of lines) {
            const parts = line.split(',');
            const pid = Number(parts[1]?.replace(/"/g, ''));
            if (Number.isInteger(pid) && pid > 0) {
              result.add(pid);
            }
          }
        }
      } else {
        try {
          const { stdout } = await execFileAsync('pgrep', ['-x', 'nginx']);
          stdout
            .split(/\r?\n/)
            .map(line => Number(line.trim()))
            .filter(pid => Number.isInteger(pid) && pid > 0)
            .forEach(pid => result.add(pid));
        } catch {
          // ignore
        }

        if (!result.size) {
          const { stdout } = await execFileAsync('pidof', ['nginx']);
          stdout
            .trim()
            .split(/\s+/)
            .map(line => Number(line.trim()))
            .filter(pid => Number.isInteger(pid) && pid > 0)
            .forEach(pid => result.add(pid));
        }
      }
    } catch {
      // ignore and fallback to primary pid
    }

    return Array.from(result);
  }

  private buildRuntimeArgs(configPath?: string): string[] {
    if (!this.instance) {
      return [];
    }
    const args = ['-p', this.instance.prefixPath];
    args.push('-c', configPath || this.instance.configPath);
    return args;
  }

  private buildSignalArgs(signal: 'stop' | 'quit' | 'reload'): string[] {
    return [...this.buildRuntimeArgs(), '-s', signal];
  }

  private async getWindowsProcessUptimeSecondsByPid(pid: number): Promise<number | undefined> {
    try {
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-Command',
        `(New-TimeSpan -Start (Get-Process -Id ${pid} -ErrorAction Stop).StartTime -End (Get-Date)).TotalSeconds`,
      ]);
      const raw = stdout.trim().replace(',', '.');
      const seconds = Number(raw);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return undefined;
      }
      return Math.floor(seconds);
    } catch {
      return undefined;
    }
  }

  private async getWindowsOldestNginxUptimeSeconds(): Promise<number | undefined> {
    try {
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-Command',
        '(New-TimeSpan -Start ((Get-Process nginx -ErrorAction Stop | Sort-Object StartTime | Select-Object -First 1).StartTime) -End (Get-Date)).TotalSeconds',
      ]);
      const raw = stdout.trim().replace(',', '.');
      const seconds = Number(raw);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return undefined;
      }
      return Math.floor(seconds);
    } catch {
      return undefined;
    }
  }

  private formatDuration(totalSeconds: number): string {
    const total = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    if (days > 0) {
      return `${days}d ${hh}:${mm}:${ss}`;
    }
    return `${hh}:${mm}:${ss}`;
  }
}

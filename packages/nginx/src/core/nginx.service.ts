import { execFile, spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { platform } from 'os';
import { promisify } from 'util';
import { normalizePath, resolveNginxPaths } from './nginx-path-utils';
import { extractNginxVersion, parseNginxErrors, parseNginxWarnings } from './nginx-output-utils';
import { buildRuntimeArgs, buildSignalArgs, waitForState } from './nginx-lifecycle-utils';
import {
  findAllNginxPids,
  findNginxPid,
  getNginxActiveConnections,
  getNginxProcessUptime,
} from './nginx-status-utils';
import type {
  NginxCommandResult,
  NginxConfigValidation,
  NginxInstance,
  NginxStatus,
} from '../types/nginx.types';
import { nginxErrors } from '@yinuo-ngm/errors';

const execFileAsync = promisify(execFile);
export class NginxService {
  private instance: NginxInstance | null = null;
  private lastConfigAppliedAt: number | null = null;
  private readonly startStopWaitTimeoutMs = 3000;
  private readonly statusPollIntervalMs = 200;

  getLastConfigAppliedAt(): number | null {
    return this.lastConfigAppliedAt;
  }

  private markConfigAppliedNow(): void {
    this.lastConfigAppliedAt = Date.now();
  }

  async validateFileReadable(path: string): Promise<{ exists: boolean; readable: boolean; error?: string }> {
    const target = normalizePath(path);
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
  getInstance(): NginxInstance | null {
    return this.instance;
  }
  async bind(path: string): Promise<NginxInstance> {
    const normalizedPath = normalizePath(path);
    try {
      await access(normalizedPath, constants.X_OK);
    } catch {
      throw nginxErrors.startFailed(`无法访问 Nginx 可执行文件: ${normalizedPath}`);
    }
    const version = await this.resolveVersion(normalizedPath);
    const { configPath, prefixPath } = await this.resolvePaths(normalizedPath);

    this.instance = {
      path: normalizedPath,
      version,
      configPath,
      prefixPath,
      isBound: true,
    };

    return this.instance;
  }
  unbind(): void {
    this.instance = null;
  }
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
  async getStatus(): Promise<NginxStatus> {
    if (!this.instance) {
      return { isRunning: false };
    }

    const pid = await findNginxPid(execFileAsync);
    if (!pid) {
      return { isRunning: false };
    }

    const uptime = await getNginxProcessUptime(execFileAsync, pid);
    const allPids = await findAllNginxPids(execFileAsync, pid);
    const activeConnections = await getNginxActiveConnections(execFileAsync, allPids);
    if (this.lastConfigAppliedAt === null) {
      // 进程已在运行但尚未有本进程内 reload/start 记录时，建立一个基线时间。
      this.markConfigAppliedNow();
    }

    return {
      isRunning: true,
      pid,
      uptime,
      activeConnections,
      workerProcesses: allPids.length,
    };
  }
  async start(): Promise<NginxCommandResult> {
    if (!this.instance) {
      return { success: false, error: 'Nginx 未绑定' };
    }

    const status = await this.getStatus();
    if (status.isRunning) {
      return { success: false, error: 'Nginx 已在运行' };
    }

    try {
      const startArgs = buildRuntimeArgs(this.instance);
      await new Promise<void>((resolve, reject) => {
        const isWindows = process.platform === 'win32';

        // 统一通过 spawn 事件确认子进程已成功拉起，再由 waitForStart 做运行态验证。
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

        child.on('spawn', () => {
          if (!isWindows) {
            child.unref();
          }
          resolve();
        });
      });

      // 等待 nginx 完全启动
      await waitForState(this.startStopWaitTimeoutMs, this.statusPollIntervalMs, async () => {
        const statusAfter = await this.getStatus();
        return statusAfter.isRunning;
      });

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
          await execFileAsync(this.instance.path, buildSignalArgs(this.instance, 'quit'), {
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
        await execFileAsync(this.instance.path, buildSignalArgs(this.instance, 'stop'), {
          cwd: this.instance.prefixPath
        });
      }

      await waitForState(this.startStopWaitTimeoutMs, this.statusPollIntervalMs, async () => {
        const statusAfter = await this.getStatus();
        return !statusAfter.isRunning;
      });

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
        buildSignalArgs(this.instance, 'reload'),
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
  async testConfig(configPath?: string): Promise<NginxConfigValidation> {
    if (!this.instance) {
      return { valid: false, errors: ['Nginx 未绑定'] };
    }

    const args = ['-t', ...buildRuntimeArgs(this.instance, configPath)];

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
          warnings: parseNginxWarnings(output),
        };
      }

      return {
        valid: false,
        errors: parseNginxErrors(output),
      };
    } catch (error: any) {
      const output = error.stderr || error.stdout || error.message;
      return {
        valid: false,
        errors: parseNginxErrors(output),
      };
    }
  }

  private async resolveVersion(path: string): Promise<string> {
    try {
      // nginx -v 典型输出在 stderr，需合并 stdout/stderr 解析
      const { stdout, stderr } = await execFileAsync(path, ['-v']);
      const output = `${stdout || ''}\n${stderr || ''}`;
      return extractNginxVersion(output);
    } catch (error: any) {
      throw nginxErrors.startFailed(`无法获取 Nginx 版本: ${error.message}`);
    }
  }

  private async resolvePaths(path: string): Promise<{ configPath: string; prefixPath: string }> {
    try {
      const { stdout, stderr } = await execFileAsync(path, ['-V']);
      return resolveNginxPaths(path, `${stdout}${stderr}`);
    } catch (error: any) {
      return resolveNginxPaths(path);
    }
  }

}


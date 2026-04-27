import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecOptions {  // execFile 执行选项
  /** 是否隐藏 Windows 窗口 */
  windowsHide?: boolean;
  /** 超时时间（毫秒），默认 60000 */
  timeout?: number;
  /** 工作目录 */
  cwd?: string;
}

export async function execFileRunner(
  command: string,
  args: string[],
  options: ExecOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, { timeout: options.timeout ?? 60_000, windowsHide: options.windowsHide ?? true });
}

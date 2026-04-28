import { silentExecFile } from '@yinuo-ngm/process';

export interface ExecOptions {
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
  return silentExecFile(command, args, {
    timeoutMs: options.timeout ?? 60_000,
    cwd: options.cwd,
  });
}

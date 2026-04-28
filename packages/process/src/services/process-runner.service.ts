import { silentSpawn } from '../runners/silent-spawn';
import type { RunCommandOptions } from '../models/process-options';
import type { ProcessResult } from '../models/process-result';

export class ProcessRunnerService {
  run(options: RunCommandOptions): Promise<ProcessResult> {
    const startedAt = Date.now();
    const args = options.args ?? [];
    const encoding = options.encoding ?? 'utf8';

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = silentSpawn(options.command, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        hideWindow: options.hideWindow ?? true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = options.timeoutMs
        ? setTimeout(() => {
            timedOut = true;
            child.kill();
          }, options.timeoutMs)
        : undefined;

      child.stdout?.on('data', chunk => {
        stdout += Buffer.isBuffer(chunk)
          ? chunk.toString(encoding)
          : String(chunk);
      });

      child.stderr?.on('data', chunk => {
        stderr += Buffer.isBuffer(chunk)
          ? chunk.toString(encoding)
          : String(chunk);
      });

      child.once('error', error => {
        if (timer) clearTimeout(timer);
        reject(error);
      });

      child.once('exit', (exitCode, signal) => {
        if (timer) clearTimeout(timer);

        resolve({
          command: options.command,
          args,
          cwd: options.cwd,
          exitCode,
          signal,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          timedOut,
        });
      });
    });
  }
}

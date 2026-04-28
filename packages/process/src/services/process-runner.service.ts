import { silentSpawn } from '../runners/silent-spawn';
import type { RunCommandOptions } from '../models/process-options';
import type { ProcessResult } from '../models/process-result';

export class ProcessRunnerService {
  run(options: RunCommandOptions): Promise<ProcessResult> {
    const startedAt = Date.now();
    const args = options.args ?? [];
    const encoding = options.encoding ?? 'utf8';
    const maxBytes = options.maxBuffer ?? 10 * 1024 * 1024;

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let exceeded = false;
      let totalBytes = 0;

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

      function collect(chunk: string | Buffer, target: 'stdout' | 'stderr') {
        if (exceeded) return;
        const str = Buffer.isBuffer(chunk) ? chunk.toString(encoding) : String(chunk);
        const bytes = Buffer.byteLength(str, encoding);
        if (totalBytes + bytes > maxBytes) {
          exceeded = true;
          child.kill();
          return;
        }
        totalBytes += bytes;
        if (target === 'stdout') stdout += str;
        else stderr += str;
      }

      child.stdout?.on('data', chunk => collect(chunk, 'stdout'));
      child.stderr?.on('data', chunk => collect(chunk, 'stderr'));

      child.once('error', error => {
        if (timer) clearTimeout(timer);
        reject(error);
      });

      child.once('exit', (exitCode, signal) => {
        if (timer) clearTimeout(timer);

        if (exceeded) {
          reject(new Error(
            `Process output exceeded maxBuffer (${maxBytes} bytes).` +
            ` command=${options.command} args=[${args.join(', ')}]`
          ));
          return;
        }

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

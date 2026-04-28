import {
  execFile,
  type ExecFileOptions,
  type ExecFileException,
} from 'node:child_process';
import { CREATE_NO_WINDOW } from '../constants/windows';

export interface SilentExecFileOptions extends ExecFileOptions {
  hideWindow?: boolean;
}

export function silentExecFile(
  file: string,
  args: readonly string[] = [],
  options: SilentExecFileOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const hideWindow = options.hideWindow ?? true;

  const execOpts: any = { ...options };
  if (process.platform === 'win32') {
    execOpts.windowsHide = hideWindow;
    if (hideWindow) {
      execOpts.creationflags = CREATE_NO_WINDOW;
    }
  }

  return new Promise((resolve, reject) => {
    execFile(
      file,
      args as string[],
      execOpts,
      (
        error: ExecFileException | null,
        stdout: string | Buffer,
        stderr: string | Buffer,
      ) => {
        const normalizedStdout = Buffer.isBuffer(stdout)
          ? stdout.toString('utf8')
          : stdout;
        const normalizedStderr = Buffer.isBuffer(stderr)
          ? stderr.toString('utf8')
          : stderr;

        if (error) {
          reject(
            Object.assign(error, {
              stdout: normalizedStdout,
              stderr: normalizedStderr,
            }),
          );
          return;
        }

        resolve({
          stdout: normalizedStdout,
          stderr: normalizedStderr,
        });
      },
    );
  });
}

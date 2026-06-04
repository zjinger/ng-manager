import { execFile, type ExecFileException } from "node:child_process";
import type { NodeRuntimeTestResult, ResolvedNodeRuntime } from "./types";

function execRuntimeFile(
  file: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs = 15_000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        env,
        timeout: timeoutMs,
        windowsHide: true,
      },
      (error: ExecFileException | null, stdout: string | Buffer, stderr: string | Buffer) => {
        const out = Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout;
        const err = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : stderr;
        if (error) {
          reject(Object.assign(error, { stdout: out, stderr: err }));
          return;
        }
        resolve({ stdout: out, stderr: err });
      }
    );
  });
}

export async function testResolvedRuntime(runtime: ResolvedNodeRuntime): Promise<NodeRuntimeTestResult> {
  const errors: string[] = [];
  let nodeVersion: string | undefined;
  let npmVersion: string | undefined;

  try {
    const result = await execRuntimeFile(runtime.nodePath, ["-v"], runtime.env);
    nodeVersion = result.stdout.trim() || result.stderr.trim();
  } catch (error: any) {
    errors.push(error?.message || "Node executable test failed");
  }

  const npmLaunchCommand = runtime.npmCliPath
    ? { command: runtime.nodePath, args: [runtime.npmCliPath, "--version"] }
    : runtime.npmPath
      ? { command: runtime.npmPath, args: ["--version"] }
      : undefined;

  if (npmLaunchCommand) {
    try {
      const result = await execRuntimeFile(npmLaunchCommand.command, npmLaunchCommand.args, runtime.env);
      npmVersion = result.stdout.trim() || result.stderr.trim();
    } catch (error: any) {
      errors.push(error?.message || "npm test failed");
    }
  } else {
    errors.push("npm-cli.js not found in selected runtime");
  }

  return {
    ok: errors.length === 0,
    nodeVersion,
    npmVersion,
    nodePath: runtime.nodePath,
    npmLaunchCommand,
    errors,
  };
}

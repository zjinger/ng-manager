
import { spawn } from "child_process";
import type { IProcessDriver } from "../../domain/process/process.driver";
import type { SpawnOptions, SpawnedProcess } from "../../domain/process/process.model";

/**
 * NodeProcessDriver
 * - IProcessDriver 的 Node(child_process) 实现
 * - 属于 infra 层：可替换实现（未来可替换为 node-pty / docker / remote agent）
 */
export class NodeProcessDriver implements IProcessDriver {
    async spawn(command: string, opts: SpawnOptions): Promise<SpawnedProcess> {
        const child = spawn(command, {
            cwd: opts.cwd,
            env: { ...process.env, ...(opts.env || {}) },
            shell: opts.shell ?? true,
            windowsHide: true,
        });

        const stdoutHandlers = new Set<(chunk: Buffer) => void>();
        const stderrHandlers = new Set<(chunk: Buffer) => void>();
        const exitHandlers = new Set<(code: number | null, signal: string | null) => void>();

        if (child.stdout) {
            child.stdout.on("data", (chunk: Buffer) => {
                for (const h of Array.from(stdoutHandlers)) {
                    try {
                        h(chunk);
                    } catch { }
                }
            });
        }

        if (child.stderr) {
            child.stderr.on("data", (chunk: Buffer) => {
                for (const h of Array.from(stderrHandlers)) {
                    try {
                        h(chunk);
                    } catch { }
                }
            });
        }

        child.on("exit", (code, signal) => {
            for (const h of Array.from(exitHandlers)) {
                try {
                    h(code, signal);
                } catch { }
            }
        });

        // spawn 失败会触发 error 事件（例如 command 不存在）
        // 这里用 Promise 包一层确保可被 try/catch 捕获
        await new Promise<void>((resolve, reject) => {
            if (child.pid) return resolve();
            child.once("spawn", () => resolve());
            child.once("error", (err) => reject(err));
        });

        return {
            pid: child.pid!,
            kill: (signal?: NodeJS.Signals) => {
                try {
                    child.kill(signal);
                } catch { }
            },
            onStdout: (cb) => stdoutHandlers.add(cb),
            onStderr: (cb) => stderrHandlers.add(cb),
            onExit: (cb) => exitHandlers.add(cb),
        };
    }
}

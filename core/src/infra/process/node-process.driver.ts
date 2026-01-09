
import { spawn } from "child_process";
import type { IProcessDriver } from "../../domain/process";
import type { SpawnOptions, SpawnedProcess } from "../../domain/process";

/**
 * NodeProcessDriver
 * - IProcessDriver 的 Node(child_process) 实现
 * - 属于 infra 层：可替换实现（未来可替换为 node-pty / docker / remote agent）
 */
export class NodeProcessDriver implements IProcessDriver {
    async spawn(
        command: string,
        args: string[],
        opts: SpawnOptions
    ): Promise<SpawnedProcess> {

        const child = spawn(command, args, {
            cwd: opts.cwd,
            env: { ...process.env, ...(opts.env || {}) },
            shell: opts.shell ?? false,
            windowsHide: true,
            detached: !!opts.detached,
            stdio: opts.stdio ?? "pipe",
        });

        // detached + ignore 时必须 unref
        if (opts.detached && opts.stdio === "ignore") {
            child.unref();
        }

        const stdoutHandlers = new Set<(chunk: Buffer) => void>();
        const stderrHandlers = new Set<(chunk: Buffer) => void>();
        const exitHandlers = new Set<(code: number | null, signal: string | null) => void>();

        if (child.stdout) {
            child.stdout.on("data", (chunk) => {
                for (const h of stdoutHandlers) h(chunk);
            });
        }

        if (child.stderr) {
            child.stderr.on("data", (chunk) => {
                for (const h of stderrHandlers) h(chunk);
            });
        }

        child.on("exit", (code, signal) => {
            for (const h of exitHandlers) h(code, signal);
        });

        // 核心：把 spawn error 转成 awaitable
        // spawn 失败会触发 error 事件（例如 command 不存在）
        // 这里用 Promise 包一层确保可被 try/catch 捕获
        await new Promise<void>((resolve, reject) => {
            child.once("spawn", () => resolve());
            child.once("error", (err) => reject(err));
        });

        return {
            pid: child.pid!,
            kill: (signal) => {
                try { child.kill(signal); } catch { }
            },
            onStdout: (cb) => stdoutHandlers.add(cb),
            onStderr: (cb) => stderrHandlers.add(cb),
            onExit: (cb) => exitHandlers.add(cb),
            write: (data: string) => { }, // pipe 模式不支持写入
            interrupt: () => { }, // pipe 模式不支持 Ctrl+C

        };
    }
}

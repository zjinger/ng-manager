import { spawn } from "child_process";
import { CREATE_NO_WINDOW } from "./constants/windows";
import type { IProcessDriver } from "./process.driver";
import type { SpawnOptions, SpawnedProcess } from "./process.types";

export class NodeProcessDriver implements IProcessDriver {
    async spawn(
        command: string,
        args: string[],
        opts: SpawnOptions
    ): Promise<SpawnedProcess> {
        const spawnOpts: any = {
            cwd: opts.cwd,
            env: { ...process.env, ...(opts.env || {}) },
            shell: opts.shell ?? false,
            detached: !!opts.detached,
            stdio: opts.stdio ?? "pipe",
        };

        if (process.platform === 'win32') {
            spawnOpts.windowsHide = true;
            spawnOpts.creationflags = CREATE_NO_WINDOW;
        }

        const child = spawn(command, args, spawnOpts);

        if (opts.detached && opts.stdio === "ignore") {
            child.unref();
        }

        const stdoutHandlers = new Set<(chunk: Buffer) => void>();
        const stderrHandlers = new Set<(chunk: Buffer) => void>();
        const exitHandlers = new Set<(code: number | null, signal: string | null) => void>();

        child.stdout?.on("data", (chunk) => {
            for (const h of stdoutHandlers) h(chunk);
        });

        child.stderr?.on("data", (chunk) => {
            for (const h of stderrHandlers) h(chunk);
        });

        child.on("exit", (code, signal) => {
            for (const h of exitHandlers) h(code, signal);
        });

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
            write: () => { },
            interrupt: () => { },
        };
    }
}

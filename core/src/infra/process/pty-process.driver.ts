import type { IProcessDriver } from "../../domain/process/process.driver";
import type { SpawnOptions, SpawnedProcess } from "../../domain/process/process.types";
import * as pty from "node-pty";

function mergeEnv(env?: Record<string, string>) {
    return { ...process.env, ...(env || {}) } as Record<string, string>;
}

function buildShellCommand(command: string) {
    const isWin = process.platform === "win32";
    if (isWin) {
        //  用 cmd /d /s /c 执行整段命令
        // /d: 不执行 AutoRun
        // /s: 处理引号
        // /c: 执行后退出
        return {
            file: "cmd.exe",
            args: ["/d", "/s", "/c", command],
        };
    }

    // mac/linux
    // -l: login shell（可选）
    // -c: 执行命令
    return {
        file: "bash",
        args: ["-lc", command],
    };
}

export class PtyProcessDriver implements IProcessDriver {
    async spawn(command: string, args: string[], opts: SpawnOptions): Promise<SpawnedProcess> {
        // 这里的 IProcessDriver.spawn 签名是 (command,args)
        // 对于 PTY，忽略 args，把 command 当“整段命令”
        const cols = Math.max(10, opts.cols ?? 140);
        const rows = Math.max(5, opts.rows ?? 40);

        const { file, args: shellArgs } = buildShellCommand(command);

        const p = pty.spawn(file, shellArgs, {
            name: "xterm-256color",
            cols,
            rows,
            cwd: opts.cwd,
            env: mergeEnv(opts.env),
        });

        const dataHandlers = new Set<(s: string) => void>();
        const exitHandlers = new Set<(code: number | null, signal: string | null) => void>();

        p.onData((s) => {
            for (const h of dataHandlers) h(s);
        });

        p.onExit((e: any) => {
            const code = typeof e?.exitCode === "number" ? e.exitCode : null;
            const signal = e?.signal ?? null;
            for (const h of exitHandlers) h(code, signal);
        });

        // pipe 协议兼容：stdout/stderr 不区分，统一走 stdout
        const stdoutHandlers = new Set<(b: Buffer) => void>();
        const stderrHandlers = new Set<(b: Buffer) => void>();

        dataHandlers.add((s) => {
            const b = Buffer.from(s, "utf8");
            for (const h of stdoutHandlers) h(b);
        });

        return {
            pid: p.pid,

            write: (data) => { try { p.write(data); } catch { } },

            interrupt: () => {
                try {
                    // Ctrl+C
                    p.write("\x03");
                } catch { }
            },

            kill: () => {
                try { p.kill(); } catch { }
            },

            resize: (c, r) => {
                try { p.resize(Math.max(10, c), Math.max(5, r)); } catch { }
            },

            onStdout: (cb) => stdoutHandlers.add(cb),
            onStderr: (cb) => stderrHandlers.add(cb), // PTY 不区分，留空也行
            onExit: (cb) => exitHandlers.add(cb),

            onData: (cb) => dataHandlers.add(cb),
        };
    }
}

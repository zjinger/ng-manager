import * as pty from "node-pty";
import { spawn } from "child_process";
import { CREATE_NO_WINDOW } from "./constants/windows";
import type { IProcessDriver } from "./process.driver";
import type { SpawnOptions, SpawnedProcess } from "./process.types";

function mergeEnv(env?: Record<string, string>) {
    return { ...process.env, ...(env || {}) } as Record<string, string>;
}

function quoteWin(arg: string) {
    if (!/[ \t"]/g.test(arg)) return arg;
    return `"${arg.replace(/"/g, '\\"')}"`;
}

function buildShellCommand(command: string) {
    const isWin = process.platform === "win32";
    if (isWin) {
        return {
            file: "cmd.exe",
            args: ["/d", "/s", "/c", command],
        };
    }
    return {
        file: "bash",
        args: ["-lc", command],
    };
}

const isWin = process.platform === "win32";

export class PtyProcessDriver implements IProcessDriver {
    async spawn(command: string, args: string[], opts: SpawnOptions): Promise<SpawnedProcess> {
        const cols = Math.max(10, opts.cols ?? 140);
        const rows = Math.max(5, opts.rows ?? 40);
        const env = mergeEnv(opts.env);
        const useShell = opts.shell ?? false;
        let p: pty.IPty;

        if (useShell) {
            const commandLine =
                args && args.length > 0
                    ? (isWin
                        ? [command, ...args].map(quoteWin).join(" ")
                        : [command, ...args].join(" "))
                    : command;

            const { file, args: shellArgs } = buildShellCommand(commandLine);
            p = pty.spawn(file, shellArgs, {
                name: "xterm-256color",
                cols,
                rows,
                cwd: opts.cwd,
                env,
                ...(isWin && { hideWindow: true }),
            });
        } else if (isWin) {
            const commandLine = [command, ...(args ?? [])].map(quoteWin).join(" ");
            const { file, args: shellArgs } = buildShellCommand(commandLine);
            p = pty.spawn(file, shellArgs, {
                name: "xterm-256color",
                cols,
                rows,
                cwd: opts.cwd,
                env,
                ...(isWin && { hideWindow: true }),
            });
        } else {
            p = pty.spawn(command, args ?? [], {
                name: "xterm-256color",
                cols,
                rows,
                cwd: opts.cwd,
                env,
            });
        }

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

        const stdoutHandlers = new Set<(b: Buffer) => void>();
        const stderrHandlers = new Set<(b: Buffer) => void>();

        dataHandlers.add((s) => {
            const b = Buffer.from(s, "utf8");
            for (const h of stdoutHandlers) h(b);
        });

        return {
            pid: p.pid,
            write: (data) => {
                try { p.write(data); } catch { }
            },
            interrupt: () => {
                try { p.write("\x03"); } catch { }
            },
            kill: (signal?: string) => {
                if (isWin) {
                    try { p.kill(); } catch { }
                    const pid = p.pid;
                    const tk = spawn("taskkill", ["/F", "/T", "/PID", String(pid)], {
                        windowsHide: true,
                        creationFlags: CREATE_NO_WINDOW,
                        stdio: "ignore",
                    } as any);
                    tk.on("error", () => { });
                    tk.unref();
                } else {
                    try { p.kill(); } catch { }
                }
            },
            resize: (c, r) => {
                try { p.resize(Math.max(10, c), Math.max(5, r)); } catch { }
            },
            onStdout: (cb) => stdoutHandlers.add(cb),
            onStderr: (cb) => stderrHandlers.add(cb),
            onExit: (cb) => exitHandlers.add(cb),
            onData: (cb) => dataHandlers.add(cb),
        };
    }
}

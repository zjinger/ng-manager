import type { IProcessDriver } from "./process.driver";
import type { SpawnOptions, SpawnedProcess } from "./process.types";
import * as pty from "node-pty";

function mergeEnv(env?: Record<string, string>) {
    return { ...process.env, ...(env || {}) } as Record<string, string>;
}

function quoteWin(arg: string) {
    // 用于 cmd.exe /c 拼接：含空格/引号才加引号
    if (!/[ \t"]/g.test(arg)) return arg;
    return `"${arg.replace(/"/g, '\\"')}"`;
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

const isWin = process.platform === "win32";

export class PtyProcessDriver implements IProcessDriver {
    async spawn(command: string, args: string[], opts: SpawnOptions): Promise<SpawnedProcess> {
        const cols = Math.max(10, opts.cols ?? 140);
        const rows = Math.max(5, opts.rows ?? 40);

        const env = mergeEnv(opts.env);
        const useShell = opts.shell ?? false;

        let p: pty.IPty;

        if (useShell) {
            // shell 模式：把 command + args 拼成一行交给 cmd/bash
            // command 在 shell 模式下通常已经是“整段命令行”（包含空格）
            // 只有当 args 非空时，才需要拼接并对各参数做 quote

            // const commandLine = isWin
            //     ? [command, ...(args ?? [])].map(quoteWin).join(" ")
            //     : [command, ...(args ?? [])].join(" ");

            const commandLine =
                (args && args.length > 0)
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
            });
        } else {
            // 非 shell：必须把 args 原样传给 node-pty
            if (isWin) {
                // Windows：用 cmd.exe 执行，避免 node-pty 找不到 git.exe
                const commandLine = [command, ...(args ?? [])].map(quoteWin).join(" ");
                const { file, args: shellArgs } = buildShellCommand(commandLine);
                p = pty.spawn(file, shellArgs, {
                    name: "xterm-256color",
                    cols,
                    rows,
                    cwd: opts.cwd,
                    env,
                });
            } else {
                // mac/linux：直接 file+args
                p = pty.spawn(command, args ?? [], {
                    name: "xterm-256color",
                    cols,
                    rows,
                    cwd: opts.cwd,
                    env,
                });
            }
        }

        // === 下面保持你原来的封装 ===
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

            kill: () => {
                try { p.kill(); } catch { }
            },

            resize: (c, r) => {
                try { p.resize(Math.max(10, c), Math.max(5, r)); } catch { }
            },

            onStdout: (cb) => stdoutHandlers.add(cb),
            onStderr: (cb) => stderrHandlers.add(cb), // PTY 不区分
            onExit: (cb) => exitHandlers.add(cb),

            onData: (cb) => dataHandlers.add(cb),
        };
    }
}


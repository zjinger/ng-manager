import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
    clearLocalServerLock,
    createLocalServerRuntime,
    readLocalServerLock,
    writeLocalServerLock,
    type LocalServerLockInfo,
    type ManagedServerProcess,
} from "@yinuo-ngm/core";

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const require = createRequire(import.meta.url);

export type ServerMode = "dev" | "prod";

export interface ServerManagerOptions {
    mode: ServerMode;
    serverDir: string; // absolute path to ../server
    host: string;      // usually 127.0.0.1
    port: number;      // usually 3210
    healthPath?: string; // default /health
    startupTimeoutMs?: number; // default 15000
    healthIntervalMs?: number; // default 300
    onLog?: (line: string) => void;
}

export class ServerManager {
    private proc: ChildProcessWithoutNullStreams | null = null;
    private ownsProcess = false;
    private runtime: ReturnType<typeof createLocalServerRuntime<DesktopServerProcess, { host?: string; port?: number }>>;

    constructor(private opts: ServerManagerOptions) {
        this.runtime = createLocalServerRuntime<DesktopServerProcess, { host?: string; port?: number }>({
            startServer: (opts) => this.spawnServerProcess(opts),
            isHealthy: (port, host) => this.isHealthy(port, host),
            readLock: () => this.readDesktopLock(),
            writeLock: (info) => writeLocalServerLock(info),
            clearLock: () => clearLocalServerLock(),
            pickPort: async () => this.opts.port,
            tryHttpShutdown: (port, host) => this.tryHttpShutdown(port, host),
            pidExists: (pid) => this.pidExists(pid),
            sleep: delay,
            startupTimeoutMs: this.opts.startupTimeoutMs ?? 30_000,
        });
    }

    get baseUrl() {
        return `http://${this.opts.host}:${this.opts.port}`;
    }

    async start(): Promise<void> {
        if (this.proc || this.ownsProcess) return;

        const server = await this.runtime.ensureServer({
            host: this.opts.host,
            port: this.opts.port,
        });

        this.ownsProcess = !server.reused;
        this.proc = server.child?.raw ?? null;
    }

    async stop(): Promise<void> {
        if (!this.ownsProcess) return;

        const p = this.proc;
        if (!p) return;

        // Windows 可靠杀子进程树：taskkill /T /F
        if (process.platform === "win32") {
            await new Promise<void>((resolve) => {
                const killer = spawn("cmd", ["/c", "taskkill", "/pid", String(p.pid), "/T", "/F"], {
                    windowsHide: true,
                    stdio: "ignore",
                });
                killer.on("exit", () => resolve());
                killer.on("error", () => resolve());
            });
            this.proc = null;
            clearLocalServerLock();
            return;
        }

        // *nix：先 SIGTERM，等一会，不行再 SIGKILL
        p.kill("SIGTERM");
        await delay(600).catch(() => { });
        if (!p.killed) {
            p.kill("SIGKILL");
        }
        this.proc = null;
        clearLocalServerLock();
        this.ownsProcess = false;
    }

    private async isHealthy(port: number, host = this.opts.host): Promise<boolean> {
        try {
            const res = await fetch(`http://${host}:${port}${this.opts.healthPath ?? "/health"}`);
            return res.ok;
        } catch {
            return false;
        }
    }

    private async tryHttpShutdown(port: number, host = this.opts.host): Promise<boolean> {
        try {
            const res = await fetch(`http://${host}:${port}/shutdown`, { method: "POST" });
            return res.ok;
        } catch {
            return false;
        }
    }

    private pidExists(pid: number): boolean {
        if (!pid || pid <= 0) return false;
        try {
            process.kill(pid, 0);
            return true;
        } catch {
            return false;
        }
    }

    private spawnServerProcess(opts: { host?: string; port?: number }): DesktopServerProcess {
        const { mode, serverDir, onLog } = this.opts;
        const env = {
            ...process.env,
            NGM_SERVER_HOST: opts.host ?? this.opts.host,
            NGM_SERVER_PORT: String(opts.port ?? this.opts.port),
            FORCE_COLOR: "1",
        };
        const isWin = process.platform === "win32";

        let cmd = isWin ? "node.exe" : "node";
        let args: string[];

        if (mode === "dev") {
            const tsxBin = require.resolve("tsx/dist/cli.mjs", { paths: [serverDir] });
            args = [tsxBin, join(serverDir, "src", "index.ts")];
        } else {
            args = [join(serverDir, "lib", "index.js")];
        }

        const raw = spawn(cmd, args, {
            cwd: serverDir,
            env,
            stdio: "pipe",
            windowsHide: true,
            detached: process.platform !== "win32",
        });

        raw.stdout.on("data", (buf) => onLog?.(String(buf)));
        raw.stderr.on("data", (buf) => onLog?.(String(buf)));

        raw.on("exit", (code, signal) => {
            onLog?.(`[server] exited code=${code} signal=${signal}\n`);
            this.proc = null;
            if (this.ownsProcess) {
                clearLocalServerLock();
            }
            this.ownsProcess = false;
        });

        const exitPromise = new Promise<void>((resolve, reject) => {
            raw.once("exit", (code, signal) => {
                if (code === 0 || signal === "SIGINT" || signal === "SIGTERM") {
                    resolve();
                    return;
                }
                reject(new Error(`Local server exited before startup completed: code=${code} signal=${signal}`));
            });
            raw.once("error", (error) => {
                reject(error);
            });
        });

        return {
            raw,
            pid: raw.pid,
            kill(signal?: string) {
                raw.kill(signal as NodeJS.Signals | undefined);
            },
            once(event: "exit", listener: (...args: any[]) => void) {
                raw.once(event, listener);
            },
            then: exitPromise.then.bind(exitPromise),
        };
    }

    private readDesktopLock(): LocalServerLockInfo | null {
        const lock = readLocalServerLock();
        if (lock) return lock;

        return {
            pid: -1,
            port: this.opts.port,
            host: this.opts.host,
            startedAt: 0,
        };
    }
}

type DesktopServerProcess = ManagedServerProcess & {
    raw: ChildProcessWithoutNullStreams;
};

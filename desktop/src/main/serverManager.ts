import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    constructor(private opts: ServerManagerOptions) { }

    get baseUrl() {
        return `http://${this.opts.host}:${this.opts.port}`;
    }

    async start(): Promise<void> {
        if (this.proc) return;

        const {
            mode,
            serverDir,
            host,
            port,
            onLog,
        } = this.opts;

        const env = {
            ...process.env,
            NGM_SERVER_HOST: host,
            NGM_SERVER_PORT: String(port),
            // 让日志更“开发友好”
            FORCE_COLOR: "1",
        };

        // dev：用 npm run dev（tsx watch）
        // prod：用 node dist/index.js（后面打包用）
        const cmd =
            process.platform === "win32" ? "cmd" : "npm";
        const args =
            process.platform === "win32"
                ? [
                    "/c",
                    "npm",
                    "--prefix",
                    serverDir,
                    "run",
                    mode === "dev" ? "dev" : "start",
                ]
                : ["--prefix", serverDir, "run", mode === "dev" ? "dev" : "start"];

        const p = spawn(cmd, args, {
            cwd: serverDir,
            env,
            stdio: "pipe",
            windowsHide: true,
        });

        this.proc = p;

        p.stdout.on("data", (buf) => onLog?.(String(buf)));
        p.stderr.on("data", (buf) => onLog?.(String(buf)));

        p.on("exit", (code, signal) => {
            onLog?.(`[server] exited code=${code} signal=${signal}\n`);
            this.proc = null;
        });

        await this.waitUntilHealthy();
    }

    async stop(): Promise<void> {
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
            return;
        }

        // *nix：先 SIGTERM，等一会，不行再 SIGKILL
        p.kill("SIGTERM");
        await delay(600).catch(() => { });
        if (!p.killed) {
            p.kill("SIGKILL");
        }
        this.proc = null;
    }

    private async waitUntilHealthy(): Promise<void> {
        const {
            healthPath = "/health",
            startupTimeoutMs = 15_000,
            healthIntervalMs = 300,
            onLog,
        } = this.opts;

        const url = `${this.baseUrl}${healthPath}`;
        const start = Date.now();

        while (Date.now() - start < startupTimeoutMs) {
            // 如果进程已经挂了，直接失败
            if (!this.proc) {
                throw new Error("Local server process exited before becoming healthy.");
            }
            try {
                const res = await fetch(url, { method: "GET" });
                if (res.ok) {
                    onLog?.(`[server] healthy: ${url}\n`);
                    return;
                }
            } catch {
                // ignore
            }
            await delay(healthIntervalMs);
        }
        throw new Error(`Local server did not become healthy within ${startupTimeoutMs}ms: ${url}`);
    }
}

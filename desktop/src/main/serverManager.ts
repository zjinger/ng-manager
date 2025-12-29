import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { join } from "node:path";

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
        const { mode, serverDir, host, port, onLog } = this.opts;

        const env = {
            ...process.env,
            NGM_SERVER_HOST: host,
            NGM_SERVER_PORT: String(port),
            FORCE_COLOR: "1",
        };

        const isWin = process.platform === "win32";

        let cmd: string;
        let args: string[] = [];
        let cwd = serverDir;

        if (mode === "dev") {
            // ✅ dev：直接用 node 跑 tsx（不走 npm，不依赖 prefix）
            // 要求：server/package.json 里有 devDependencies: tsx
            cmd = isWin ? "cmd" : "node";
            args = isWin
                ? ["/c", "npm", "run", "start:dev"]
                : ["run", "start:dev"];

            // if (isWin) {
            //     args = [
            //         "/c",
            //         "node",
            //         join(serverDir, "node_modules", "tsx", "dist", "cli.mjs"),
            //         join(serverDir, "src", "index.ts"),
            //     ];
            // } else {
            //     args = [
            //         join(serverDir, "node_modules", "tsx", "dist", "cli.mjs"),
            //         join(serverDir, "src", "index.ts"),
            //     ];
            // }
        } else {
            // ✅ prod：直接 node dist
            cmd = isWin ? "node.exe" : "node";
            // args = [join(serverDir, "dist", "index.js")];
            args = ["dist/index.js"];
        }

        const p = spawn(cmd, args, {
            cwd: serverDir,   // ✅ 关键：在 serverDir 内执行
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

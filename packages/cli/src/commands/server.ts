import path from "path";
import { execa } from "execa";

export type ServerOptions = {
    port?: number;
    host?: string;
    dataDir?: string;
    logLevel?: string;
};

export function startServerOnly(opts: ServerOptions) {
    const serverPkgJson = require.resolve("@ngm/server/package.json");
    const serverDir = path.dirname(serverPkgJson);
    const entry = path.join(serverDir, "lib", "index.js");

    const env = {
        ...process.env,
        ...(opts.port && { NGM_SERVER_PORT: String(opts.port) }),
        ...(opts.host && { NGM_SERVER_HOST: opts.host }),
        ...(opts.dataDir && { NGM_DATA_DIR: opts.dataDir }),
        ...(opts.logLevel && { NGM_LOG_LEVEL: opts.logLevel }),
    };

    const child = execa(process.execPath, [entry], { stdio: "inherit", env });

    const kill = () => {
        child.kill("SIGINT");
        setTimeout(() => child.kill("SIGKILL"), 2000);
    };

    process.on("SIGINT", kill);
    process.on("SIGTERM", kill);

    return child; // 给 ui.ts 用（pid/kill）
}

/** commander action：必须返回 void 或 Promise<void> */
export async function startServerAction(opts: ServerOptions): Promise<void> {
    const child = startServerOnly(opts);
    try {
        await child;
    } catch (err: any) {
        // Ctrl+C / SIGINT / SIGKILL：忽略
        if (
            err?.isCanceled ||
            err?.signal === "SIGINT" ||
            err?.signal === "SIGKILL" ||
            err?.exitCode === 3221225786 // Windows 强杀
        ) {
            return;
        }
        throw err; // 真错误才抛
    }

    // 保持进程不退出：等待子进程结束
    // execa 的 child 本身是 Promise-like
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await new Promise<void>(() => { });
}

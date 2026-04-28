import path from "path";
import { execa } from "execa";

export type ServerOptions = {
    port?: number;
    host?: string;
    dataDir?: string;
    logLevel?: string;
    shutdownToken?: string;
    version?: string;
};

export function startServer(opts: ServerOptions) {
    const serverPkgJson = require.resolve("@yinuo-ngm/server/package.json");
    const serverDir = path.dirname(serverPkgJson);
    const entry = path.join(serverDir, "lib", "index.js");

    const env = {
        ...process.env,
        ...(opts.port && { NGM_SERVER_PORT: String(opts.port) }),
        ...(opts.host && { NGM_SERVER_HOST: opts.host }),
        ...(opts.dataDir && { NGM_DATA_DIR: opts.dataDir }),
        ...(opts.logLevel && { NGM_LOG_LEVEL: opts.logLevel }),
        ...(opts.shutdownToken && { NGM_SHUTDOWN_TOKEN: opts.shutdownToken }),
    };

    // 纯启动器：不在这里绑 process.on('SIGINT')，避免重复注册/泄露
    return execa(process.execPath, [entry], { stdio: "inherit", env });
}

/** commander action：必须返回 void 或 Promise<void> */
export async function startServerAction(opts: ServerOptions): Promise<void> {
    const child = startServer(opts);

    // 可选：这个 action 也把 SIGINT/SIGTERM 视为正常退出
    const onSigint = () => {
        try {
            child.kill("SIGINT");
        } finally {
            process.exitCode = 0;
        }
    };
    const onSigterm = () => {
        try {
            child.kill("SIGTERM");
        } finally {
            process.exitCode = 0;
        }
    };

    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);

    try {
        await child;
    } catch (err: any) {
        // Ctrl+C / SIGINT / SIGTERM / SIGKILL：忽略
        if (
            err?.isCanceled ||
            err?.signal === "SIGINT" ||
            err?.signal === "SIGTERM" ||
            err?.signal === "SIGKILL" ||
            err?.exitCode === 3221225786 // Windows Ctrl+C
        ) {
            return;
        }
        throw err; // 真错误才抛
    } finally {
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
    }
}

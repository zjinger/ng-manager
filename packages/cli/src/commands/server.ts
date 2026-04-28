import path from "path";
import fs from "fs";
import { spawn, type ChildProcess } from "child_process";
import { getLocalServerDataDir } from "@yinuo-ngm/runtime";

export type ServerOptions = {
    port?: number;
    host?: string;
    dataDir?: string;
    logDir?: string;
    logLevel?: string;
    shutdownToken?: string;
    version?: string;
    foreground?: boolean;
};

function safeTimestamp(): string {
    return new Date()
        .toISOString()
        .replace(/[:.]/g, '-');
}

async function rotateIfExists(file: string): Promise<void> {
    try {
        await fs.promises.access(file);
    } catch {
        return;
    }
    const backup = `${file}.${safeTimestamp()}.backup`;
    await fs.promises.rename(file, backup);
}

function getLogDir(dataDir?: string): string {
    const base = dataDir || getLocalServerDataDir();
    return path.join(base, 'logs');
}

async function ensureLogDir(dataDir?: string): Promise<string> {
    const logDir = getLogDir(dataDir);
    await fs.promises.mkdir(logDir, { recursive: true });
    return logDir;
}

export async function startServer(opts: ServerOptions): Promise<ChildProcess> {
    const entry = require.resolve("@yinuo-ngm/server");

    const env = {
        ...process.env,
        ...(opts.port && { NGM_SERVER_PORT: String(opts.port) }),
        ...(opts.host && { NGM_SERVER_HOST: opts.host }),
        ...(opts.dataDir && { NGM_DATA_DIR: opts.dataDir }),
        ...(opts.logLevel && { NGM_LOG_LEVEL: opts.logLevel }),
        ...(opts.shutdownToken && { NGM_SHUTDOWN_TOKEN: opts.shutdownToken }),
    };

    // 前台模式：直接继承 stdio
    if (opts.foreground) {
        const child = spawn(process.execPath, [entry], {
            stdio: 'inherit',
            env,
        });
        return child;
    }

    // 后台模式：detached + stdio 重定向到日志文件
    const logDir = await ensureLogDir(opts.dataDir);
    const stdoutFile = path.join(logDir, 'server.out.log');
    const stderrFile = path.join(logDir, 'server.err.log');

    // 启动前轮转旧日志
    await rotateIfExists(stdoutFile);
    await rotateIfExists(stderrFile);

    const stdoutStream = fs.openSync(stdoutFile, 'a');
    const stderrStream = fs.openSync(stderrFile, 'a');

    const child = spawn(process.execPath, [entry], {
        detached: true,
        stdio: ['ignore', stdoutStream, stderrStream],
        ...(process.platform === 'win32' && { creationflags: 0x08000000 }),
        env,
    } as any);

    child.unref();
    return child;
}

/** commander action：必须返回 void 或 Promise<void> */
export async function startServerAction(opts: ServerOptions): Promise<void> {
    const child = await startServer(opts);

    // 前台模式需要处理信号
    if (opts.foreground) {
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
            await new Promise<void>((resolve, reject) => {
                child.once('exit', (code, signal) => {
                    if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
                        resolve();
                    } else if (code !== null) {
                        reject(new Error(`Server exited with code ${code}`));
                    } else {
                        resolve();
                    }
                });
                child.once('error', reject);
            });
        } catch (err: any) {
            if (
                err?.signal === "SIGINT" ||
                err?.signal === "SIGTERM" ||
                err?.signal === "SIGKILL" ||
                err?.exitCode === 3221225786 // Windows Ctrl+C
            ) {
                return;
            }
            throw err;
        } finally {
            process.off("SIGINT", onSigint);
            process.off("SIGTERM", onSigterm);
        }
    }
    // 后台模式：直接返回，不等待子进程
}

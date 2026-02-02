import getPort from "get-port";
import open from "open";
import { startServer } from "./server";
import { isHealthy } from "./health";
import { writeLock, readLock, clearLock } from "./lock";

export async function startUi(opts: any): Promise<void> {
    console.log(`Checking for existing ngm-server...`);
    console.log(`opts:`, opts);
    // 1) lock 复用
    const lock = readLock();
    const lockHost = lock?.host || "127.0.0.1";
    const lockPort = lock?.port;
    if (lockPort && (await isHealthy(lockPort, lockHost))) {
        if (opts.open !== false) {
            await open(`http://${lockHost}:${lockPort}`);
        }
        return;
    }
    clearLock();
    const host = opts.host || "127.0.0.1";
    // 2) port 决策
    const port = opts.port ?? (await getPort({ port: [3210, 3211, 3212, 0] }));

    console.log(`🚀  Starting GUI ...`);

    // 3) 启动 server（子进程）
    const child = startServer({ ...opts, port });

    // 3.1) 绑定信号：Ctrl+C / SIGTERM 时先终止子进程，再让主进程干净退出
    const onSigint = () => {
        try {
            child.kill("SIGINT");
        } finally {
            // 将 Ctrl+C 视为正常退出
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

    // 3.2) 子进程退出时：清理 lock + 解绑监听（避免 listener 泄露）
    child.once("exit", () => {
        clearLock();
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
    });

    // 4) 等待健康
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
        if (await isHealthy(port, host)) {
            writeLock({ pid: child.pid ?? -1, port, host, startedAt: Date.now() });

            if (opts.open !== false) {
                await open(`http://${host}:${port}`);
                console.log(`🎉  Ready on http://${host}:${port}`);
            }

            // 关键：前台阻塞，直到用户 Ctrl+C 或子进程退出
            await child.catch((err: any) => {
                // Ctrl+C / SIGTERM / 强杀：视为正常退出（不抛堆栈）
                if (
                    err?.signal === "SIGINT" ||
                    err?.signal === "SIGTERM" ||
                    err?.signal === "SIGKILL" ||
                    err?.exitCode === 3221225786 // Windows: 0xC000013A (Ctrl+C)
                ) {
                    return;
                }
                throw err;
            });

            return;
        }

        await sleep(150);
    }

    // 未能健康：终止子进程并报错
    try {
        child.kill("SIGINT");
    } catch {
        // ignore
    }
    throw new Error(`Server did not become healthy at http://${host}:${port} within 6 seconds.`);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

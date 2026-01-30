import getPort from "get-port";
import open from "open";
import { startServerOnly } from "./server";
import { isHealthy } from "./health";
import { writeLock, readLock, clearLock } from "./lock";

export async function startUi(opts: any) {
    // 1. lock 复用
    const lock = readLock();
    if (lock?.port && await isHealthy(lock.port)) {
        if (opts.open !== false) {
            const host = opts.host || "127.0.0.1";
            await open(`http://${host}:${lock.port}`);
        }
        return;
    }
    clearLock();

    // 2. port 决策
    const port =
        opts.port ??
        (await getPort({ port: [3210, 3211, 3212, 0] }));

    // 3. 启动 server
    const child = startServerOnly({ ...opts, port });

    // 4. 等待健康
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
        if (await isHealthy(port)) {
            writeLock({ pid: child.pid ?? -1, port, startedAt: Date.now() });
            if (opts.open !== false) {
                const host = opts.host || "127.0.0.1";
                await open(`http://${host}:${port}`);
            }
            return;
        }
        await sleep(150);
    }

    throw new Error(`Server did not become healthy on port ${port}`);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

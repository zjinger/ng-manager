import getPort from "get-port";
import open from "open";
import { startServerOnly } from "./server";
import { clearLock, readLock, writeLock } from "./lock";
import { isHealthy } from "./health";

export async function startUi() {

    // 1) 如果已有 lock 且健康：直接复用
    const lock = readLock();
    if (lock?.port) {
        const ok = await isHealthy(lock.port);
        if (ok) {
            await open(`http://127.0.0.1:${lock.port}`);
            return;
        } else {
            // lock 失效（端口不通 / 被占用但不是 ngm-server）
            clearLock();
        }
    }
    // 2) 找端口（优先 3210/3211，其次随机）
    const port = await getPort({ port: [3210, 3211, 3212, 0] });
    // 3) 启动 server
    const child = startServerOnly({ port });

    // 4) 等待健康（最多 6s），成功再写 lock + open
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
        if (await isHealthy(port)) {
            writeLock({ pid: child.pid ?? -1, port, startedAt: Date.now() });
            await open(`http://127.0.0.1:${port}`);
            return;
        }
        await sleep(150);
    }

    // 5) 启动失败：清理 lock（保险）
    clearLock();
    // 不强制 kill（因为 child 可能已经输出错误并退出了）
    throw new Error(`Server did not become healthy on port ${port}`);
}


function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
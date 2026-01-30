import { readLock, clearLock } from "./lock";
import { pidExists } from "./pid";

async function tryHttpShutdown(port: number, host = "127.0.0.1") {
    try {
        const r = await fetch(`http://${host}:${port}/shutdown`, { method: "POST" });
        return r.ok;
    } catch {
        return false;
    }
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export async function stopCmd(): Promise<void> {
    const lock = readLock();
    if (!lock) {
        console.log("ngm-server: not running");
        return;
    }

    const host = lock.host ?? "127.0.0.1";
    const port = lock.port;

    console.log(`Stopping ngm-server (pid=${lock.pid}) ...`);

    // 1 先尝试 HTTP shutdown
    const ok = await tryHttpShutdown(port, host);
    if (ok) {
        const deadline = Date.now() + 3000;
        while (Date.now() < deadline) {
            if (!pidExists(lock.pid)) break;
            await sleep(150);
        }
    }

    // 2 兜底：强杀
    if (pidExists(lock.pid)) {
        try {
            process.kill(lock.pid, "SIGINT");
        } catch { }

        await sleep(500);

        if (pidExists(lock.pid)) {
            try {
                process.kill(lock.pid, "SIGKILL");
            } catch { }
        }
    }

    clearLock();
    console.log("ngm-server stopped");
}

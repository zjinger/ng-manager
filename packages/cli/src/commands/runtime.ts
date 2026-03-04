import getPort from "get-port";
import { startServer, type ServerOptions } from "./server";
import { isHealthy } from "./health";
import { readLock, writeLock, clearLock, type LockInfo } from "./lock";

type ManagedServerInfo = {
    host: string;
    port: number;
    url: string;
    reused: boolean;
    child?: ReturnType<typeof startServer>;
};

export async function ensureManagedServer(opts: ServerOptions): Promise<ManagedServerInfo> {
    const lock = readLock();
    const lockedHost = lock?.host || "127.0.0.1";
    const lockedPort = lock?.port;

    if (lockedPort && (await isHealthy(lockedPort, lockedHost))) {
        return {
            host: lockedHost,
            port: lockedPort,
            url: `http://${lockedHost}:${lockedPort}`,
            reused: true,
        };
    }

    clearLock();

    const host = opts.host || "127.0.0.1";
    const port = opts.port ?? (await getPort({ port: [3210, 3211, 3212, 0] }));
    const child = startServer({ ...opts, host, port });

    await waitUntilHealthyOrThrow(port, host, 6000);

    writeLock({
        pid: child.pid ?? -1,
        port,
        host,
        startedAt: Date.now(),
    });

    return {
        host,
        port,
        url: `http://${host}:${port}`,
        reused: false,
        child,
    };
}

export async function waitForManagedServerExit(child: ReturnType<typeof startServer>): Promise<void> {
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

    child.once("exit", () => {
        clearLock();
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
    });

    try {
        await child;
    } catch (err: any) {
        if (
            err?.isCanceled ||
            err?.signal === "SIGINT" ||
            err?.signal === "SIGTERM" ||
            err?.signal === "SIGKILL" ||
            err?.exitCode === 3221225786
        ) {
            return;
        }
        throw err;
    } finally {
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
    }
}

export async function stopManagedServer(lock = readLock()): Promise<boolean> {
    if (!lock) return false;

    const host = lock.host ?? "127.0.0.1";
    const port = lock.port;

    const shutdownAccepted = await tryHttpShutdown(port, host);
    if (shutdownAccepted) {
        const stopped = await waitUntilStopped(lock, 3000);
        if (stopped) {
            clearLock();
            return true;
        }
    }

    if (pidExists(lock.pid)) {
        try {
            process.kill(lock.pid, "SIGINT");
        } catch {
            // ignore
        }

        await sleep(500);

        if (pidExists(lock.pid)) {
            try {
                process.kill(lock.pid, "SIGKILL");
            } catch {
                // ignore
            }
        }
    }

    clearLock();
    return true;
}

async function waitUntilHealthyOrThrow(port: number, host: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (await isHealthy(port, host)) return;
        await sleep(150);
    }

    throw new Error(`Server did not become healthy at http://${host}:${port} within ${timeoutMs}ms.`);
}

async function waitUntilStopped(lock: LockInfo, timeoutMs: number): Promise<boolean> {
    const host = lock.host ?? "127.0.0.1";
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (!(await isHealthy(lock.port, host)) && !pidExists(lock.pid)) {
            return true;
        }
        await sleep(150);
    }

    return !(await isHealthy(lock.port, host));
}

async function tryHttpShutdown(port: number, host = "127.0.0.1"): Promise<boolean> {
    try {
        const r = await fetch(`http://${host}:${port}/shutdown`, { method: "POST" });
        return r.ok;
    } catch {
        return false;
    }
}

function pidExists(pid: number): boolean {
    if (!pid || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

type RuntimeDeps = {
    startServer: typeof startServer;
    isHealthy: typeof isHealthy;
    readLock: typeof readLock;
    writeLock: typeof writeLock;
    clearLock: typeof clearLock;
    pickPort: () => Promise<number>;
    tryHttpShutdown: (port: number, host?: string) => Promise<boolean>;
    pidExists: (pid: number) => boolean;
    sleep: (ms: number) => Promise<void>;
};

export function createRuntime(deps: RuntimeDeps = defaultRuntimeDeps) {
    async function ensureManagedServer(opts: ServerOptions): Promise<ManagedServerInfo> {
        const lock = deps.readLock();
        const lockedHost = lock?.host || "127.0.0.1";
        const lockedPort = lock?.port;

        if (lockedPort && (await deps.isHealthy(lockedPort, lockedHost))) {
            return {
                host: lockedHost,
                port: lockedPort,
                url: `http://${lockedHost}:${lockedPort}`,
                reused: true,
            };
        }

        deps.clearLock();

        const host = opts.host || "127.0.0.1";
        const port = opts.port ?? (await deps.pickPort());
        const child = deps.startServer({ ...opts, host, port });

        try {
            await waitUntilHealthyOrThrow(port, host, 6000);
        } catch (error) {
            try {
                child.kill("SIGINT");
            } catch {
                // ignore
            }
            throw error;
        }

        deps.writeLock({
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

    async function waitForManagedServerExit(child: ReturnType<typeof startServer>): Promise<void> {
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
            deps.clearLock();
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

    async function stopManagedServer(lock = deps.readLock()): Promise<boolean> {
        if (!lock) return false;

        const host = lock.host ?? "127.0.0.1";
        const port = lock.port;

        const shutdownAccepted = await deps.tryHttpShutdown(port, host);
        if (shutdownAccepted) {
            const stopped = await waitUntilStopped(lock, 3000);
            if (stopped) {
                deps.clearLock();
                return true;
            }
        }

        if (deps.pidExists(lock.pid)) {
            try {
                process.kill(lock.pid, "SIGINT");
            } catch {
                // ignore
            }

            await deps.sleep(500);

            if (deps.pidExists(lock.pid)) {
                try {
                    process.kill(lock.pid, "SIGKILL");
                } catch {
                    // ignore
                }
            }
        }

        deps.clearLock();
        return true;
    }

    async function waitUntilHealthyOrThrow(port: number, host: string, timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            if (await deps.isHealthy(port, host)) return;
            await deps.sleep(150);
        }

        throw new Error(
            `Server did not become healthy at http://${host}:${port} within ${timeoutMs}ms.`
        );
    }

    async function waitUntilStopped(lock: LockInfo, timeoutMs: number): Promise<boolean> {
        const host = lock.host ?? "127.0.0.1";
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            if (!(await deps.isHealthy(lock.port, host)) && !deps.pidExists(lock.pid)) {
                return true;
            }
            await deps.sleep(150);
        }

        return !(await deps.isHealthy(lock.port, host));
    }

    return {
        ensureManagedServer,
        waitForManagedServerExit,
        stopManagedServer,
    };
}

const defaultRuntimeDeps: RuntimeDeps = {
    startServer,
    isHealthy,
    readLock,
    writeLock,
    clearLock,
    pickPort: async () => getPort({ port: [3210, 3211, 3212, 0] }),
    tryHttpShutdown,
    pidExists,
    sleep,
};

const runtime = createRuntime();

export const ensureManagedServer = runtime.ensureManagedServer;
export const waitForManagedServerExit = runtime.waitForManagedServerExit;
export const stopManagedServer = runtime.stopManagedServer;

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

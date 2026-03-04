export type LocalServerLockInfo = {
    pid: number;
    port: number;
    startedAt: number;
    host?: string;
};

export type ManagedServerInfo<TChild> = {
    host: string;
    port: number;
    url: string;
    reused: boolean;
    child?: TChild;
};

export type ManagedServerProcess = PromiseLike<unknown> & {
    pid?: number;
    kill(signal?: string): void;
    once(event: "exit", listener: (...args: any[]) => void): void;
};

type RuntimeDeps<TChild extends ManagedServerProcess, TOptions extends { host?: string; port?: number }> = {
    startServer: (opts: TOptions) => TChild;
    isHealthy: (port: number, host?: string) => Promise<boolean>;
    readLock: () => LocalServerLockInfo | null;
    writeLock: (info: LocalServerLockInfo) => void;
    clearLock: () => void;
    pickPort: () => Promise<number>;
    tryHttpShutdown: (port: number, host?: string) => Promise<boolean>;
    pidExists: (pid: number) => boolean;
    sleep: (ms: number) => Promise<void>;
    startupTimeoutMs?: number;
};

export function createLocalServerRuntime<
    TChild extends ManagedServerProcess,
    TOptions extends { host?: string; port?: number }
>(
    deps: RuntimeDeps<TChild, TOptions>
) {
    async function ensureServer(opts: TOptions): Promise<ManagedServerInfo<TChild>> {
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
            await waitUntilHealthyOrThrow(port, host, deps.startupTimeoutMs ?? 6000);
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

    async function waitForServerExit(child: TChild): Promise<void> {
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

    async function stopServer(lock = deps.readLock()): Promise<boolean> {
        if (!lock) return false;

        const host = lock.host ?? "127.0.0.1";
        const shutdownAccepted = await deps.tryHttpShutdown(lock.port, host);
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

    async function waitUntilHealthyOrThrow(
        port: number,
        host: string,
        timeoutMs: number
    ): Promise<void> {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            if (await deps.isHealthy(port, host)) return;
            await deps.sleep(150);
        }

        throw new Error(
            `Server did not become healthy at http://${host}:${port} within ${timeoutMs}ms.`
        );
    }

    async function waitUntilStopped(
        lock: LocalServerLockInfo,
        timeoutMs: number
    ): Promise<boolean> {
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
        ensureServer,
        waitForServerExit,
        stopServer,
    };
}

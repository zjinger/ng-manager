import crypto from "crypto";
import getPort from "get-port";
import {
    createLocalServerRuntime,
    type LocalServerLockInfo,
    type ManagedServerProcess,
} from "@yinuo-ngm/runtime";

import { startServer, type ServerOptions } from "./server";
import { isHealthy } from "./health";
import { readLock, writeLock, clearLock } from "./lock";

type CliServerProcess = ReturnType<typeof startServer> & ManagedServerProcess;

function generateShutdownToken(): string {
    return crypto.randomUUID();
}

const runtime = createLocalServerRuntime<CliServerProcess, ServerOptions>({
    startServer: (opts) => startServer(opts) as CliServerProcess,
    isHealthy,
    readLock: () => readLock() as LocalServerLockInfo | null,
    writeLock: (info) => writeLock(info),
    clearLock,
    pickPort: async () => getPort({ port: [3210, 3211, 3212, 0] }),
    tryHttpShutdown,
    pidExists,
    sleep,
});

export async function ensureManagedServer(opts: ServerOptions) {
    const token = generateShutdownToken();
    const version = require("@yinuo-ngm/cli/package.json").version;
    return runtime.ensureServer({ ...opts, shutdownToken: token, version });
}

export async function waitForManagedServerExit(child: ReturnType<typeof startServer>): Promise<void> {
    await runtime.waitForServerExit(child as CliServerProcess);
}

export async function stopManagedServer(lock = readLock()): Promise<boolean> {
    return runtime.stopServer(lock as LocalServerLockInfo | null);
}

async function tryHttpShutdown(port: number, host = "127.0.0.1", shutdownToken?: string): Promise<boolean> {
    try {
        const headers: HeadersInit = {};
        if (shutdownToken) {
            headers["X-NGM-Shutdown-Token"] = shutdownToken;
        }
        const r = await fetch(`http://${host}:${port}/shutdown`, { method: "POST", headers });
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

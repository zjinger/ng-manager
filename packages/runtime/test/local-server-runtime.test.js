const test = require("node:test");
const assert = require("node:assert/strict");
const { createLocalServerRuntime } = require("../lib/index.js");

test("ensureServer reuses a healthy locked server", async () => {
    const runtime = createLocalServerRuntime({
        startServer() {
            throw new Error("should not start");
        },
        isHealthy: async () => true,
        readLock: () => ({ pid: 123, port: 3210, host: "127.0.0.1", startedAt: 1 }),
        writeLock() { },
        clearLock() { },
        pickPort: async () => 3210,
        tryHttpShutdown: async () => true,
        pidExists: () => true,
        sleep: async () => { },
    });

    const server = await runtime.ensureServer({ host: "127.0.0.1", port: 3210 });
    assert.equal(server.reused, true);
    assert.equal(server.url, "http://127.0.0.1:3210");
});

test("ensureServer starts a new server when lock is stale", async () => {
    let wroteLock = null;
    let started = false;
    const child = {
        pid: 456,
        kill() { },
        once() { },
        then(resolve) {
            resolve();
        },
    };
    const runtime = createLocalServerRuntime({
        startServer() {
            started = true;
            return child;
        },
        isHealthy: async () => started,
        readLock: () => ({ pid: 111, port: 3210, host: "127.0.0.1", startedAt: 1 }),
        writeLock(info) {
            wroteLock = info;
        },
        clearLock() { },
        pickPort: async () => 3211,
        tryHttpShutdown: async () => true,
        pidExists: () => false,
        sleep: async () => { },
    });

    const server = await runtime.ensureServer({ host: "127.0.0.1", port: 3211 });
    assert.equal(server.reused, false);
    assert.equal(server.port, 3211);
    assert.deepEqual(wroteLock, {
        pid: 456,
        port: 3211,
        host: "127.0.0.1",
        startedAt: wroteLock.startedAt,
    });
});

test("stopServer clears lock after graceful shutdown", async () => {
    let cleared = false;
    let healthy = true;
    const runtime = createLocalServerRuntime({
        startServer() {
            throw new Error("unused");
        },
        isHealthy: async () => healthy,
        readLock: () => ({ pid: 222, port: 3210, host: "127.0.0.1", startedAt: 1 }),
        writeLock() { },
        clearLock() {
            cleared = true;
        },
        pickPort: async () => 3210,
        tryHttpShutdown: async () => {
            healthy = false;
            return true;
        },
        pidExists: () => false,
        sleep: async () => { },
    });

    const result = await runtime.stopServer();
    assert.equal(result, true);
    assert.equal(cleared, true);
});

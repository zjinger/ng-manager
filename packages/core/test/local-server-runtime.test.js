const test = require("node:test");
const assert = require("node:assert/strict");

const { createLocalServerRuntime } = require("../lib/index.js");

test("ensureServer reuses an existing healthy lock", async () => {
    let startCalls = 0;
    let clearCalls = 0;

    const runtime = createLocalServerRuntime({
        startServer: () => {
            startCalls += 1;
            return { pid: 1001, kill() {}, once() {} };
        },
        isHealthy: async () => true,
        readLock: () => ({ pid: 99, port: 3210, host: "127.0.0.1", startedAt: 1 }),
        writeLock: () => {
            throw new Error("writeLock should not be called when reusing");
        },
        clearLock: () => {
            clearCalls += 1;
        },
        pickPort: async () => 3211,
        tryHttpShutdown: async () => false,
        pidExists: () => false,
        sleep: async () => {},
    });

    const result = await runtime.ensureServer({});

    assert.equal(result.reused, true);
    assert.equal(result.url, "http://127.0.0.1:3210");
    assert.equal(startCalls, 0);
    assert.equal(clearCalls, 0);
});

test("ensureServer starts a new server and writes lock when needed", async () => {
    let startedWith = null;
    let writtenLock = null;

    const runtime = createLocalServerRuntime({
        startServer: (opts) => {
            startedWith = opts;
            return { pid: 2002, kill() {}, once() {} };
        },
        isHealthy: async () => true,
        readLock: () => null,
        writeLock: (info) => {
            writtenLock = info;
        },
        clearLock: () => {},
        pickPort: async () => 3211,
        tryHttpShutdown: async () => false,
        pidExists: () => false,
        sleep: async () => {},
    });

    const result = await runtime.ensureServer({});

    assert.equal(result.reused, false);
    assert.equal(result.url, "http://127.0.0.1:3211");
    assert.deepEqual(startedWith, { host: "127.0.0.1", port: 3211 });
    assert.equal(writtenLock.pid, 2002);
    assert.equal(writtenLock.port, 3211);
    assert.equal(writtenLock.host, "127.0.0.1");
});

test("stopServer clears lock after graceful shutdown", async () => {
    let clearCalls = 0;
    let healthChecks = 0;

    const runtime = createLocalServerRuntime({
        startServer: () => ({ pid: 0, kill() {}, once() {} }),
        isHealthy: async () => {
            healthChecks += 1;
            return healthChecks === 1;
        },
        readLock: () => null,
        writeLock: () => {},
        clearLock: () => {
            clearCalls += 1;
        },
        pickPort: async () => 3211,
        tryHttpShutdown: async () => true,
        pidExists: () => false,
        sleep: async () => {},
    });

    const stopped = await runtime.stopServer({
        pid: 3003,
        port: 3210,
        host: "127.0.0.1",
        startedAt: 1,
    });

    assert.equal(stopped, true);
    assert.equal(clearCalls, 1);
    assert.equal(healthChecks >= 2, true);
});

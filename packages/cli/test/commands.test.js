const test = require("node:test");
const assert = require("node:assert/strict");

const { createStartUi } = require("../lib/commands/ui.js");
const { createStopCmd } = require("../lib/commands/stop.js");
const { createStatusCmd, formatStatusLines } = require("../lib/commands/status.js");

test("startUi opens the browser and waits for a child process it started", async () => {
    const calls = [];

    const startUi = createStartUi({
        ensureManagedServer: async () => ({
            url: "http://127.0.0.1:3210",
            child: { pid: 1234 },
        }),
        openUrl: async (url) => {
            calls.push(`open:${url}`);
        },
        waitForManagedServerExit: async (child) => {
            calls.push(`wait:${child.pid}`);
        },
        log: (line) => {
            calls.push(`log:${line}`);
        },
    });

    await startUi({});

    assert.deepEqual(calls, [
        "log:🚀  Preparing local UI ...",
        "open:http://127.0.0.1:3210",
        "log:🎉  Ready on http://127.0.0.1:3210",
        "wait:1234",
    ]);
});

test("stopCmd reports not running when no lock exists", async () => {
    const lines = [];

    const stopCmd = createStopCmd({
        readLock: () => null,
        stopManagedServer: async () => true,
        log: (line) => {
            lines.push(line);
        },
    });

    await stopCmd();

    assert.deepEqual(lines, ["ngm-server: not running"]);
});

test("statusCmd prints a formatted healthy status report", async () => {
    const lines = [];

    const statusCmd = createStatusCmd({
        readLock: () => ({
            pid: 4321,
            port: 3210,
            host: "127.0.0.1",
            startedAt: Date.parse("2026-03-04T00:00:00.000Z"),
        }),
        isHealthy: async () => true,
        getHealth: async () => ({
            data: {
                pid: 4321,
                uptime: 18.9,
                dataDir: "D:/data",
            },
        }),
        pidExists: () => true,
        log: (line) => {
            lines.push(line);
        },
    });

    await statusCmd();

    assert.equal(lines[0], "ngm-server status:");
    assert.equal(lines[1], "  pid:     4321 (alive)");
    assert.equal(lines[2], "  port:    3210");
    assert.equal(lines[3], "  url:     http://127.0.0.1:3210");
    assert.equal(lines[4], "  health:  ok");
    assert.equal(lines[6], "  server:  pid=4321 uptime=18s dataDir=D:/data");
});

test("formatStatusLines returns a single line when no lock exists", () => {
    assert.deepEqual(
        formatStatusLines({
            lockExists: false,
        }),
        ["ngm-server: not running"]
    );
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLocalServerClient } = require("../lib/context/local-server-client.js");

const ENV_KEYS = ["NGM_MCP_SERVER_URL", "NGM_SERVER_URL", "NGM_DATA_DIR"];

async function withCleanEnv(fn) {
  const saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  const savedFetch = global.fetch;
  try {
    await fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    global.fetch = savedFetch;
  }
}

function withDataDir(lock, fn) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-mcp-local-server-"));
  process.env.NGM_DATA_DIR = dataDir;
  if (lock) {
    fs.writeFileSync(path.join(dataDir, "ngm.lock.json"), JSON.stringify(lock), "utf8");
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      fs.rmSync(dataDir, { recursive: true, force: true });
    });
}

test("local server client rejects remote env server URLs", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_SERVER_URL = "http://example.com:3000";
    const availability = await createLocalServerClient().availability();

    assert.equal(availability.available, false);
    assert.match(availability.reason, /localhost, 127\.0\.0\.1, or ::1/);
  });
});

test("local server client rejects invalid lock host and port", async () => {
  await withCleanEnv(async () => {
    await withDataDir({ pid: 123, host: "192.168.1.10", port: 4200 }, async () => {
      const availability = await createLocalServerClient().availability();
      assert.equal(availability.available, false);
      assert.match(availability.reason, /lock local server host/);
    });

    await withDataDir({ pid: 123, host: "127.0.0.1", port: 70000 }, async () => {
      const availability = await createLocalServerClient().availability();
      assert.equal(availability.available, false);
      assert.match(availability.reason, /port must be 1-65535/);
    });
  });
});

test("local server client converts fetch failures into stable unavailable errors", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_SERVER_URL = "http://127.0.0.1:33000";
    global.fetch = async () => {
      const error = new Error("connect failed");
      error.code = "ECONNREFUSED";
      throw error;
    };

    await assert.rejects(
      () => createLocalServerClient().listActiveTasks(),
      /ng-manager local server is unavailable: connect failed/
    );
  });
});

test("local server client unwrap keeps ok envelope when data is absent", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_SERVER_URL = "http://localhost:33000";
    global.fetch = async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const result = await createLocalServerClient().listActiveTasks();
    assert.deepEqual(result, { ok: true });
  });
});

test("local server client clamps task log tail", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_SERVER_URL = "http://[::1]:33000";
    let requestedUrl = "";
    global.fetch = async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    await createLocalServerClient().getTaskLogTail("run_1", 99999);
    assert.match(requestedUrl, /tail=500$/);
  });
});

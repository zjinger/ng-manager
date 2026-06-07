const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Fastify = require("fastify");

let loadedModules;
async function loadModules() {
  if (loadedModules) {
    return loadedModules;
  }
  const [errorHandlerPlugin, successHandlerPlugin, agentConnectionsRoutes] =
    await Promise.all([
      import("../src/plugins/error-handler.plugin.ts"),
      import("../src/plugins/success-handle.plugin.ts"),
      import("../src/routes/agent-connections.routes.ts"),
    ]);
  loadedModules = {
    errorHandlerPlugin: errorHandlerPlugin.default,
    successHandlerPlugin: successHandlerPlugin.default,
    agentConnectionsRoutes: agentConnectionsRoutes.default,
  };
  return loadedModules;
}

async function createApp(dataDir) {
  const modules = await loadModules();
  const app = Fastify({ logger: false });
  await app.register(modules.errorHandlerPlugin);
  await app.register(modules.successHandlerPlugin);
  await app.register(modules.agentConnectionsRoutes, {
    prefix: "/api/agent-connections",
    dataDir,
  });
  return app;
}

async function withTempDataDir(fn) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-server-agent-"));
  try {
    await fn(dataDir);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

function configPath(dataDir) {
  return path.join(dataDir, "agent-connections.json");
}

async function createDefaultConnection(app, payload = {}) {
  const res = await app.inject({
    method: "POST",
    url: "/api/agent-connections/hub-v2",
    payload: {
      name: "ng-manager",
      baseUrl: "http://127.0.0.1:7001",
      projectKey: "ng-manager",
      projectName: "ng-manager 协作平台",
      projectToken: "project-secret-value",
      personalToken: "personal-secret-value",
      isDefault: true,
      ...payload,
    },
  });
  assert.equal(res.statusCode, 200);
}

test("GET /hub-v2 returns empty list when config file does not exist", async () => {
  await withTempDataDir(async (dataDir) => {
    const app = await createApp(dataDir);
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/agent-connections/hub-v2",
      });
      const body = JSON.parse(res.body);

      assert.equal(res.statusCode, 200);
      assert.equal(body.ok, true);
      assert.deepEqual(body.data.items, []);
      assert.equal(body.data.defaultProject, undefined);
      assert.equal(body.data.configPath, configPath(dataDir));
    } finally {
      await app.close();
    }
  });
});

test("POST creates connection and GET never returns full token", async () => {
  await withTempDataDir(async (dataDir) => {
    const app = await createApp(dataDir);
    try {
      await createDefaultConnection(app);

      const getRes = await app.inject({
        method: "GET",
        url: "/api/agent-connections/hub-v2",
      });
      const body = JSON.parse(getRes.body);
      const item = body.data.items[0];
      const serialized = JSON.stringify(body);

      assert.equal(getRes.statusCode, 200);
      assert.equal(item.name, "ng-manager");
      assert.equal(item.hasProjectToken, true);
      assert.equal(item.hasPersonalToken, true);
      assert.equal(item.projectTokenPreview, "proj****alue");
      assert.equal(item.personalTokenPreview, "pers****alue");
      assert.equal(serialized.includes("project-secret-value"), false);
      assert.equal(serialized.includes("personal-secret-value"), false);
    } finally {
      await app.close();
    }
  });
});

test("PUT updates baseUrl without clearing existing tokens", async () => {
  await withTempDataDir(async (dataDir) => {
    const app = await createApp(dataDir);
    try {
      await createDefaultConnection(app);
      const updateRes = await app.inject({
        method: "PUT",
        url: "/api/agent-connections/hub-v2/ng-manager",
        payload: {
          baseUrl: "http://127.0.0.1:7002",
        },
      });
      const body = JSON.parse(updateRes.body);
      const item = body.data.items[0];

      assert.equal(updateRes.statusCode, 200);
      assert.equal(item.baseUrl, "http://127.0.0.1:7002");
      assert.equal(item.hasProjectToken, true);
      assert.equal(item.hasPersonalToken, true);
    } finally {
      await app.close();
    }
  });
});

test("PUT token update rules support null-clear and empty-string-keep", async () => {
  await withTempDataDir(async (dataDir) => {
    const app = await createApp(dataDir);
    try {
      await createDefaultConnection(app);
      let res = await app.inject({
        method: "PUT",
        url: "/api/agent-connections/hub-v2/ng-manager",
        payload: {
          projectToken: "",
        },
      });
      let body = JSON.parse(res.body);
      let item = body.data.items[0];
      assert.equal(item.hasProjectToken, true);

      res = await app.inject({
        method: "PUT",
        url: "/api/agent-connections/hub-v2/ng-manager",
        payload: {
          projectToken: null,
        },
      });
      body = JSON.parse(res.body);
      item = body.data.items[0];
      assert.equal(item.hasProjectToken, false);
      assert.equal(item.projectTokenPreview, undefined);
    } finally {
      await app.close();
    }
  });
});

test("DELETE default project promotes next project", async () => {
  await withTempDataDir(async (dataDir) => {
    const app = await createApp(dataDir);
    try {
      await createDefaultConnection(app, { name: "main", projectKey: "main" });
      await app.inject({
        method: "POST",
        url: "/api/agent-connections/hub-v2",
        payload: {
          name: "backup",
          baseUrl: "http://127.0.0.1:7001",
          projectKey: "backup",
        },
      });

      const delRes = await app.inject({
        method: "DELETE",
        url: "/api/agent-connections/hub-v2/main",
      });
      const body = JSON.parse(delRes.body);

      assert.equal(delRes.statusCode, 200);
      assert.equal(body.data.defaultProject, "backup");
      assert.equal(body.data.items.length, 1);
      assert.equal(body.data.items[0].name, "backup");
      assert.equal(body.data.items[0].isDefault, true);
    } finally {
      await app.close();
    }
  });
});

test("set-default switches default project", async () => {
  await withTempDataDir(async (dataDir) => {
    const app = await createApp(dataDir);
    try {
      await createDefaultConnection(app, { name: "main", projectKey: "main" });
      await app.inject({
        method: "POST",
        url: "/api/agent-connections/hub-v2",
        payload: {
          name: "secondary",
          baseUrl: "http://127.0.0.1:7001",
          projectKey: "secondary",
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/agent-connections/hub-v2/secondary/set-default",
      });
      const body = JSON.parse(res.body);

      assert.equal(res.statusCode, 200);
      assert.equal(body.data.defaultProject, "secondary");
      const secondary = body.data.items.find((item) => item.name === "secondary");
      assert.equal(secondary.isDefault, true);
    } finally {
      await app.close();
    }
  });
});

test("unknown top-level providers are preserved after write", async () => {
  await withTempDataDir(async (dataDir) => {
    const file = configPath(dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        github: { token: "ghp_xxx", owner: "example" },
        hubV2: { projects: {} },
      }),
      "utf8"
    );

    const app = await createApp(dataDir);
    try {
      await createDefaultConnection(app);
      const next = JSON.parse(fs.readFileSync(file, "utf8"));

      assert.equal(next.github.owner, "example");
      assert.equal(!!next.hubV2.projects["ng-manager"], true);
    } finally {
      await app.close();
    }
  });
});

test("invalid JSON returns error and never overwrites config file", async () => {
  await withTempDataDir(async (dataDir) => {
    const file = configPath(dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, "{ broken json", "utf8");

    const app = await createApp(dataDir);
    try {
      const getRes = await app.inject({
        method: "GET",
        url: "/api/agent-connections/hub-v2",
      });
      assert.equal(getRes.statusCode, 400);

      const postRes = await app.inject({
        method: "POST",
        url: "/api/agent-connections/hub-v2",
        payload: {
          name: "ng-manager",
          baseUrl: "http://127.0.0.1:7001",
          projectKey: "ng-manager",
        },
      });
      assert.equal(postRes.statusCode, 400);
      assert.equal(fs.readFileSync(file, "utf8"), "{ broken json");
    } finally {
      await app.close();
    }
  });
});

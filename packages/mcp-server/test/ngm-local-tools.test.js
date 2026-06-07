const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { allTools } = require("../lib/tools/index.js");
const { registerTools } = require("../lib/register-tools.js");

const NEW_READ_TOOLS = [
  "ngm.capabilities",
  "ngm.routeTask",
  "ngm.workspace.summary",
  "ngm.workspace.listPackages",
  "ngm.workspace.getPackage",
  "ngm.workspace.mcpTools",
  "ngm.workspace.capabilityMap",
  "ngm.project.find",
  "ngm.project.readPackageJson",
  "ngm.runtime.current",
  "ngm.runtime.detectRequirement",
  "ngm.nginx.status",
  "ngm.nginx.servers.list",
  "ngm.nginx.server.get",
  "ngm.nginx.upstreams.list",
  "ngm.nginx.config.validate",
  "ngm.nginx.config.getMain",
  "ngm.nginx.logs.tail",
  "ngm_project_list_tasks",
  "ngm_project_task_status",
  "ngm_project_task_logs",
  "ngm_project_port_check",
  "ngm_project_health_check",
];

function tool(name) {
  const found = allTools().find((item) => item.name === name);
  assert.ok(found, `tool ${name} should exist`);
  return found;
}

function registeredTool(name, context = {}) {
  const callbacks = new Map();
  registerTools({
    registerTool(toolName, _config, cb) {
      callbacks.set(toolName, cb);
    },
  }, context);
  const callback = callbacks.get(name);
  assert.ok(callback, `registered tool ${name} should exist`);
  return callback;
}

function parseMcpResult(result) {
  return JSON.parse(result.content[0].text);
}

test("registers new NGM local workspace tools as read-only tools", () => {
  for (const name of NEW_READ_TOOLS) {
    assert.equal(tool(name).riskLevel, "read", `${name} should be read-only`);
  }
});

test("registers project observation tools as read-only tools", () => {
  for (const name of [
    "ngm_project_list_tasks",
    "ngm_project_task_status",
    "ngm_project_task_logs",
    "ngm_project_port_check",
    "ngm_project_health_check",
  ]) {
    assert.equal(tool(name).riskLevel, "read");
  }
});

test("registers controlled NGM tools with write or execute risk", () => {
  assert.equal(tool("ngm_project_run_script").riskLevel, "execute");
  assert.equal(tool("ngm_project_stop").riskLevel, "execute");
  assert.equal(tool("ngm_runtime_set_for_project").riskLevel, "write");
  assert.equal(tool("ngm_nginx_reload").riskLevel, "execute");
  assert.equal(tool("ngm_nginx_proxy_save").riskLevel, "write");
});

test("confirmed controlled tools are blocked by policy by default", async () => {
  const runResult = parseMcpResult(await registeredTool("ngm_project_run_script")({
    projectId: "proj_1",
    script: "dev",
    confirm: true,
  }));
  assert.equal(runResult.ok, false);
  assert.match(runResult.error, /execute tools are disabled/);

  const runtimeResult = parseMcpResult(await registeredTool("ngm_runtime_set_for_project")({
    projectId: "proj_1",
    runtime: { type: "system" },
    confirm: true,
  }));
  assert.equal(runtimeResult.ok, false);
  assert.match(runtimeResult.error, /write tools are disabled/);
});

test("ngm_project_run_script previews package scripts without starting a task", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-run-preview-"));
  try {
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({
      scripts: {
        dev: "vite --host 127.0.0.1",
      },
    }));

    const context = {
      workspaceRoot: tempDir,
      dataDir: tempDir,
      services: {
        core: {
          project: {
            async get() {
              return {
                id: "proj_1",
                name: "demo",
                root: tempDir,
                createdAt: 1,
                updatedAt: 1,
                scripts: { dev: "vite --host 127.0.0.1" },
                packageManager: "npm",
              };
            },
          },
          nodeRuntime: {
            async resolveRuntime(config) {
              return { ...config, nodePath: "node", version: "v18.0.0" };
            },
          },
          task: {
            async start() {
              throw new Error("start should not run during preview");
            },
          },
        },
      },
    };

    const result = await tool("ngm_project_run_script").handler({
      projectId: "proj_1",
      script: "dev",
    }, context);

    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "preview");
    assert.equal(result.data.script.name, "dev");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("ngm_project_run_script refuses scripts not present in package.json", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-run-missing-"));
  try {
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ scripts: { dev: "vite" } }));
    const result = await tool("ngm_project_run_script").handler({
      projectId: "proj_1",
      script: "deploy",
    }, {
      workspaceRoot: tempDir,
      dataDir: tempDir,
      services: {
        core: {
          project: {
            async get() {
              return { id: "proj_1", name: "demo", root: tempDir, createdAt: 1, updatedAt: 1 };
            },
          },
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "blocked");
    assert.equal(result.data.reason, "script not found in package.json");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("ngm_project_run_script executes through local server and reports observed launch status", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-run-server-"));
  let startedTaskId = "";
  try {
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({
      scripts: {
        dev: "vite --host 127.0.0.1",
      },
    }));

    const result = await tool("ngm_project_run_script").handler({
      projectId: "proj_1",
      script: "dev",
      confirm: true,
      waitMs: 20,
    }, {
      workspaceRoot: tempDir,
      dataDir: tempDir,
      services: {
        localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async refreshProjectScripts() {
          return { id: "proj_1", scripts: { dev: "vite --host 127.0.0.1" } };
        },
        async refreshTaskProject() {
          return [{ spec: { id: "task_1", name: "dev", runnable: true } }];
        },
          async startTask(taskId) {
            startedTaskId = taskId;
            return { taskId, runId: "run_1", status: "running" };
          },
          async getTaskStatus(taskId) {
            return { taskId, runId: "run_1", status: "failed", lastError: "port already in use" };
          },
        },
        core: {
          project: {
            async get() {
              return {
                id: "proj_1",
                name: "demo",
                root: tempDir,
                createdAt: 1,
                updatedAt: 1,
                packageManager: "npm",
              };
            },
            async update() {
              return {
                id: "proj_1",
                name: "demo",
                root: tempDir,
                createdAt: 1,
                updatedAt: 2,
                scripts: { dev: "vite --host 127.0.0.1" },
                packageManager: "npm",
              };
            },
          },
          nodeRuntime: {
            async resolveRuntime(config) {
              return { ...config, nodePath: "node", version: "v18.0.0" };
            },
          },
          task: {
            async start() {
              throw new Error("local server should start task");
            },
          },
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(startedTaskId, "task_1");
    assert.equal(result.data.controlPlane, "local-server");
    assert.equal(result.data.launch.status, "failed");
    assert.match(result.data.launch.message, /failed/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("ngm_project_run_script blocks confirmed execution when local server is unavailable", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-run-no-server-"));
  try {
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ scripts: { dev: "vite" } }));
    const result = await tool("ngm_project_run_script").handler({
      projectId: "proj_1",
      script: "dev",
      confirm: true,
    }, {
      workspaceRoot: tempDir,
      dataDir: tempDir,
      services: {
        localServer: {
          async availability() {
            return { available: false, reason: "not running" };
          },
        },
        core: {
          project: {
            async get() {
              return { id: "proj_1", name: "demo", root: tempDir, createdAt: 1, updatedAt: 1 };
            },
          },
          nodeRuntime: {
            async resolveRuntime(config) {
              return { ...config, nodePath: "node", version: "v18.0.0" };
            },
          },
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "blocked");
    assert.match(result.data.reason, /local ng-manager server is unavailable/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("ngm_project_stop previews only managed active task targets", async () => {
  const result = await tool("ngm_project_stop").handler({
    taskId: "task_1",
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async getTaskStatus() {
          return { taskId: "task_1", runId: "run_1", status: "running" };
        },
        async stopTask() {
          throw new Error("stop should not run during preview");
        },
      },
      core: {},
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.operation.status, "preview");
  assert.equal(result.data.controlPlane, "local-server");
  assert.equal(result.data.target.taskId, "task_1");
});

test("ngm_project_task_status reads shared local server runtime state", async () => {
  const result = await tool("ngm_project_task_status").handler({
    taskId: "task_1",
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async getTaskStatus() {
          return {
            taskId: "task_1",
            projectId: "proj_1",
            runId: "run_1",
            status: "running",
            pid: process.pid,
            startedAt: 1,
            lastOutputAt: 2,
            urls: ["http://127.0.0.1:4200"],
          };
        },
      },
      core: {},
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.controlPlane, "local-server");
  assert.equal(result.data.running, true);
  assert.equal(result.data.pidExists, true);
  assert.equal(result.data.runtime.urls[0], "http://127.0.0.1:4200");
});

test("ngm_project_task_status returns unavailable when local server is not running", async () => {
  const result = await tool("ngm_project_task_status").handler({
    taskId: "task_1",
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: false, reason: "not running" };
        },
      },
      core: {},
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.controlPlane, "unavailable");
  assert.equal(result.data.status, "unavailable");
  assert.match(result.data.reason, /local server/);
});

test("ngm_project_task_logs limits and redacts sensitive output", async () => {
  const result = await tool("ngm_project_task_logs").handler({
    taskId: "task_1",
    tail: 10,
    maxChars: 2000,
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async getTaskStatus() {
          return { taskId: "task_1", runId: "run_1", status: "failed" };
        },
        async getTaskLogTail() {
          return [
            { text: "Authorization: Bearer secret-token" },
            { text: "password=my-password" },
            { text: "normal log line" },
          ];
        },
      },
      core: {},
    },
  });

  const serialized = JSON.stringify(result.data.lines);
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "ok");
  assert.equal(serialized.includes("secret-token"), false);
  assert.equal(serialized.includes("my-password"), false);
  assert.match(serialized, /REDACTED/);
});

test("ngm_project_task_logs caps a single oversized log entry", async () => {
  const result = await tool("ngm_project_task_logs").handler({
    runId: "run_1",
    tail: 1,
    maxChars: 250,
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async getTaskLogTail() {
          return [{ text: `token=secret ${"x".repeat(5000)}` }];
        },
      },
      core: {},
    },
  });

  const serialized = JSON.stringify(result.data.lines);
  assert.equal(result.ok, true);
  assert.ok(serialized.length <= 300);
  assert.equal(serialized.includes("secret"), false);
  assert.match(serialized, /truncated/);
});

test("ngm_project_port_check detects a listening local port", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const result = await tool("ngm_project_port_check").handler({
      host: "127.0.0.1",
      port: address.port,
      timeoutMs: 1000,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(result.data.status, "listening");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("ngm_project_port_check blocks non-local hosts", async () => {
  const result = await tool("ngm_project_port_check").handler({
    host: "example.com",
    port: 80,
  }, {});

  assert.equal(result.ok, true);
  assert.equal(result.data.status, "blocked");
  assert.match(result.data.reason, /localhost|loopback|wildcard/);
});

test("ngm_project_health_check checks local HTTP URL and redacts headers", async () => {
  const server = http.createServer((req, res) => {
    res.setHeader("Authorization", "Bearer response-secret");
    res.end("ok token=response-token");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const result = await tool("ngm_project_health_check").handler({
      url: `http://127.0.0.1:${address.port}/health?token=query-secret`,
      headers: { Authorization: "Bearer request-secret" },
      includeBodyPreview: true,
    }, {});

    const serialized = JSON.stringify(result.data);
    assert.equal(result.ok, true);
    assert.equal(result.data.reachable, true);
    assert.equal(result.data.statusCode, 200);
    assert.equal(serialized.includes("request-secret"), false);
    assert.equal(serialized.includes("response-secret"), false);
    assert.equal(serialized.includes("query-secret"), false);
    assert.equal(serialized.includes("response-token"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("ngm_project_health_check maps wildcard local host to loopback", async () => {
  const server = http.createServer((_req, res) => {
    res.end("ok");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const result = await tool("ngm_project_health_check").handler({
      url: `http://0.0.0.0:${address.port}/health`,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(result.data.reachable, true);
    assert.match(result.data.checkedUrl, /127\.0\.0\.1/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("ngm_project_health_check blocks non-local URLs", async () => {
  const result = await tool("ngm_project_health_check").handler({
    url: "https://example.com/health",
  }, {});

  assert.equal(result.ok, true);
  assert.equal(result.data.status, "blocked");
  assert.match(result.data.reason, /local/);
});

test("ngm_project_list_tasks lists project tasks from local server", async () => {
  const result = await tool("ngm_project_list_tasks").handler({
    projectId: "proj_1",
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async listTaskViews() {
          return [{
            spec: { id: "task_1", projectId: "proj_1", projectRoot: "D:/demo", name: "dev" },
            runtime: { taskId: "task_1", projectId: "proj_1", runId: "run_1", status: "running", urls: ["http://127.0.0.1:4200"] },
          }];
        },
      },
      core: {
        project: {
          async get() {
            return { id: "proj_1", name: "demo", root: "D:/demo", createdAt: 1, updatedAt: 1 };
          },
        },
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.taskGroups[0].tasks[0].taskId, "task_1");
  assert.equal(result.data.taskGroups[0].tasks[0].ports[0].port, 4200);
});

test("ngm_project_stop blocks when shared local server is unavailable", async () => {
  const result = await tool("ngm_project_stop").handler({
    taskId: "task_1",
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: false, reason: "not running" };
        },
      },
      core: {
        task: {
          async getSnapshotByTaskId() {
            return { taskId: "task_1", runId: "run_1", status: "running" };
          },
          async stop() {
            throw new Error("stop should not use mcp-core fallback");
          },
        },
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.operation.status, "blocked");
  assert.match(result.data.reason, /local server is unavailable/);
});

test("ngm_runtime_set_for_project previews old and new runtime binding", async () => {
  const result = await tool("ngm_runtime_set_for_project").handler({
    projectId: "proj_1",
    runtime: { type: "managed", version: "18.20.0", packageManager: "npm" },
  }, {
    services: {
      core: {
        project: {
          async get() {
            return {
              id: "proj_1",
              name: "demo",
              root: "D:/demo",
              createdAt: 1,
              updatedAt: 1,
              nodeVersion: "16.20.0",
              packageManager: "npm",
            };
          },
        },
        nodeRuntime: {
          async resolveRuntime(config) {
            return { ...config, nodePath: "node18", version: "18.20.0" };
          },
        },
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.operation.status, "preview");
  assert.equal(result.data.diff.oldRuntime.version, "16.20.0");
  assert.equal(result.data.diff.newRuntime.version, "18.20.0");
});

test("ngm_runtime_set_for_project writes through local server when confirmed", async () => {
  let updatedRuntime = null;
  const result = await tool("ngm_runtime_set_for_project").handler({
    projectId: "proj_1",
    runtime: { type: "managed", version: "18.20.0", packageManager: "npm" },
    confirm: true,
  }, {
    services: {
      localServer: {
        async availability() {
          return { available: true, url: "http://127.0.0.1:4360" };
        },
        async updateProjectRuntime(_projectId, runtime) {
          updatedRuntime = runtime;
          return {
            id: "proj_1",
            name: "demo",
            root: "D:/demo",
            runtime,
          };
        },
      },
      core: {
        project: {
          async get() {
            return {
              id: "proj_1",
              name: "demo",
              root: "D:/demo",
              createdAt: 1,
              updatedAt: 1,
              nodeVersion: "16.20.0",
              packageManager: "npm",
            };
          },
          async update() {
            throw new Error("runtime write should use local server");
          },
        },
        nodeRuntime: {
          async resolveRuntime(config) {
            return { ...config, nodePath: "node18", version: "18.20.0" };
          },
        },
      },
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(updatedRuntime, { type: "managed", version: "18.20.0", packageManager: "npm" });
  assert.equal(result.data.controlPlane, "local-server");
  assert.equal(result.data.project.runtime.version, "18.20.0");
});

test("ngm_nginx_reload validates config and previews without reloading", async () => {
  const result = await tool("ngm_nginx_reload").handler({}, {
    services: {
      core: {
        nginx: {
          service: {
            getInstance() {
              return { path: "nginx", configPath: "nginx.conf" };
            },
            async getStatus() {
              return { isRunning: true };
            },
            async reload() {
              throw new Error("reload should not run during preview");
            },
          },
          config: {
            async validateConfig() {
              return { valid: true, errors: [] };
            },
          },
        },
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.operation.status, "preview");
  assert.equal(result.data.validation.valid, true);
});

test("ngm_nginx_proxy_save previews managed proxy save without writing", async () => {
  const result = await tool("ngm_nginx_proxy_save").handler({
    name: "demo-proxy",
    listen: ["8080"],
    domains: ["demo.local"],
    target: "http://127.0.0.1:4200",
  }, {
    services: {
      core: {
        nginx: {
          server: {
            async createServer() {
              throw new Error("createServer should not run during preview");
            },
          },
        },
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.operation.status, "preview");
  assert.equal(result.data.afterRequest.locations[0].proxyPass, "http://127.0.0.1:4200/");
});

test("ngm.routeTask routes workspace and package capability requests to ngm-workspace", async () => {
  const result = await tool("ngm.routeTask").handler({
    query: "帮我看 packages/node-runtime 是否应该暴露给 MCP",
  }, {});

  assert.equal(result.ok, true);
  assert.ok(result.data.skills.includes("ngm-workspace"));
  assert.ok(result.data.skills.includes("ngm-runtime"));
  assert.equal(result.data.skills.includes("ngm-code"), false);
});

test("ngm.routeTask routes API debugging and MCP tool questions to ngm-workspace", async () => {
  const result = await tool("ngm.routeTask").handler({
    query: "检查 ng-manager API 调试能力和 MCP tools 是否覆盖",
  }, {});

  assert.equal(result.ok, true);
  assert.ok(result.data.skills.includes("ngm-workspace"));
  assert.ok(result.data.tools.includes("ngm.workspace.mcpTools"));
});

test("ngm.routeTask keeps Hub V2 document requests on Hub V2 skills", async () => {
  const result = await tool("ngm.routeTask").handler({
    query: "帮我查一下某个研发项的需求文档",
  }, {});

  assert.equal(result.ok, true);
  assert.ok(result.data.skills.includes("hub-v2-api"));
  assert.ok(result.data.skills.includes("hub-v2-docs"));
  assert.equal(result.data.skills.includes("ngm-workspace"), false);
});

test("skills use ngm-workspace instead of ngm-code", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const skillsRoot = path.join(repoRoot, "apps/site/docs/hub-v2/skills");
  const workspaceSkill = path.join(skillsRoot, "ngm-workspace/SKILL.md");
  const codeSkill = path.join(skillsRoot, "ngm-code/SKILL.md");

  assert.equal(fs.existsSync(workspaceSkill), true);
  assert.equal(fs.existsSync(codeSkill), false);

  const workspaceText = fs.readFileSync(workspaceSkill, "utf-8");
  assert.match(workspaceText, /^name: ngm-workspace/m);

  for (const relativePath of [
    "ngm-router/SKILL.md",
    "hub-v2-api/SKILL.md",
    "hub-v2-docs/SKILL.md",
  ]) {
    const text = fs.readFileSync(path.join(skillsRoot, relativePath), "utf-8");
    assert.equal(text.includes("ngm-code"), false, `${relativePath} should not mention ngm-code`);
  }
});

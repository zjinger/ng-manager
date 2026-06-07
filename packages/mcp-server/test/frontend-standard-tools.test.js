const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { allTools } = require("../lib/tools/index.js");
const { registerTools } = require("../lib/register-tools.js");

const FRONTEND_TOOLS = {
  "ngm.standard.get": "read",
  "ngm.standard.init": "write",
  "ngm.standard.validateProject": "read",
  "ngm.git.validateBranchName": "read",
  "ngm.git.validateCommitMessage": "read",
  "ngm.git.generateCommitMessage": "read",
  "ngm.git.generateReviewSummary": "read",
  "ngm.test.detectMissingSpecs": "read",
  "ngm.test.generateSpecPlan": "read",
  "ngm.test.validateNaming": "read",
  "ngm.angular.validateStructure": "read",
  "ngm.angular.validateComponentNaming": "read",
  "ngm.angular.validateComponentBoundary": "read",
  "ngm.review.scanChangedFiles": "read",
  "ngm.review.generateChecklist": "read",
  "ngm.review.detectRisks": "read",
  "ngm.review.generateReport": "write",
  "ngm.workflow.createFrontendTask": "write",
  "ngm.workflow.generateDevPlan": "write",
  "ngm.workflow.validateBeforeWrite": "write",
  "ngm.workflow.validateBeforeCommit": "write",
  "ngm.workflow.generateDeliveryReport": "write",
};

function tool(name) {
  const found = allTools().find((item) => item.name === name);
  assert.ok(found, `tool ${name} should exist`);
  return found;
}

function registeredTool(name, context) {
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

async function withEnv(values, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-fe-standard-"));
  fs.mkdirSync(path.join(root, "src/app/pages"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/app/components"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/app/services"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/app/models"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "ng test" } }));
  return root;
}

function context(projectRoot, extra = {}) {
  return {
    workspaceRoot: projectRoot,
    dataDir: projectRoot,
    services: {
      core: {},
      git: {
        async status() {
          return { changedFiles: ["src/app/services/demo.service.ts"] };
        },
        async diff() {
          return { diff: "" };
        },
        async changedFiles() {
          return ["src/app/services/demo.service.ts"];
        },
      },
      ...extra.services,
    },
  };
}

function auditText(projectRoot) {
  const auditDir = path.join(projectRoot, ".ng-manager/audit");
  const files = fs.readdirSync(auditDir);
  return files.map((file) => fs.readFileSync(path.join(auditDir, file), "utf-8")).join("\n");
}

test("registers frontend standard, review, test, angular, and workflow tools with expected risk levels", () => {
  for (const [name, riskLevel] of Object.entries(FRONTEND_TOOLS)) {
    assert.equal(tool(name).riskLevel, riskLevel, `${name} risk level`);
  }
});

test("validates frontend branch and commit conventions", async () => {
  const projectRoot = tempProject();
  try {
    const validBranch = await tool("ngm.git.validateBranchName").handler({
      projectPath: projectRoot,
      branchName: "feature/ABC123-login-form",
    }, context(projectRoot));
    assert.equal(validBranch.data.status, "passed");

    const invalidBranch = await tool("ngm.git.validateBranchName").handler({
      projectPath: projectRoot,
      branchName: "feature/login_form",
    }, context(projectRoot));
    assert.equal(invalidBranch.data.status, "failed");

    const validCommit = await tool("ngm.git.validateCommitMessage").handler({
      projectPath: projectRoot,
      message: "feat(auth): add login form",
    }, context(projectRoot));
    assert.equal(validCommit.data.status, "passed");
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("ngm.standard.init previews, blocks without write policy, writes with policy, and audits calls", async () => {
  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm.standard.init", context(projectRoot));
    const preview = parseMcpResult(await cb({ projectPath: projectRoot }));
    assert.equal(preview.ok, true);
    assert.equal(preview.data.operation.status, "preview");
    assert.equal(fs.existsSync(path.join(projectRoot, ".ng-manager/frontend-standard.json")), false);

    const blocked = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: undefined }, () => cb({
      projectPath: projectRoot,
      confirm: true,
    })));
    assert.equal(blocked.ok, true);
    assert.equal(blocked.data.operation.status, "blocked");

    const executed = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => cb({
      projectPath: projectRoot,
      confirm: true,
    })));
    assert.equal(executed.ok, true);
    assert.equal(executed.data.operation.status, "executed");
    assert.equal(fs.existsSync(path.join(projectRoot, ".ng-manager/frontend-standard.json")), true);

    const audit = auditText(projectRoot);
    assert.match(audit, /ngm.standard.init/);
    assert.match(audit, /blocked/);
    assert.match(audit, /executed/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("detects missing specs and Angular component boundary warnings", async () => {
  const projectRoot = tempProject();
  try {
    fs.writeFileSync(path.join(projectRoot, "src/app/services/demo.service.ts"), "export class DemoService {}\n");
    fs.writeFileSync(path.join(projectRoot, "src/app/components/demo.component.ts"), `const endpoint = "https://api.example.com";\nlet value: any;\n${"x\n".repeat(130)}`);

    const missing = await tool("ngm.test.detectMissingSpecs").handler({ projectPath: projectRoot }, context(projectRoot));
    assert.equal(missing.ok, true);
    assert.equal(missing.data.status, "warning");
    assert.ok(missing.data.findings.some((item) => item.ruleId === "test.missing-service-spec"));

    const boundary = await tool("ngm.angular.validateComponentBoundary").handler({ projectPath: projectRoot }, context(projectRoot));
    assert.equal(boundary.ok, true);
    assert.ok(boundary.data.findings.some((item) => item.ruleId === "typescript.no-obvious-any"));
    assert.ok(boundary.data.findings.some((item) => item.ruleId === "angular.no-hardcoded-api-url"));
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("review report and workflow tools write only project .ng-manager files and redact audit values", async () => {
  const projectRoot = tempProject();
  try {
    fs.writeFileSync(path.join(projectRoot, "src/app/services/demo.service.ts"), "const password = 'secret-value';\n");
    const taskCb = registeredTool("ngm.workflow.createFrontendTask", context(projectRoot));
    const task = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => taskCb({
      projectPath: projectRoot,
      taskId: "task-1",
      title: "token=secret-title",
      confirm: true,
    })));
    assert.equal(task.ok, true);
    const taskPath = path.join(projectRoot, ".ng-manager/frontend-tasks/task-1/task.json");
    assert.equal(fs.existsSync(taskPath), true);
    const taskJson = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
    assert.equal(taskJson.status, "draft");
    assert.equal(taskJson.projectRoot, projectRoot);
    assert.deepEqual(taskJson.checks, {
      standard: "pending",
      test: "pending",
      review: "pending",
      build: "pending",
    });

    const devPlanCb = registeredTool("ngm.workflow.generateDevPlan", context(projectRoot));
    const devPlan = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => devPlanCb({
      projectPath: projectRoot,
      taskId: "task-1",
      context: "Design context",
      confirm: true,
    })));
    assert.equal(devPlan.ok, true);
    assert.equal(fs.existsSync(path.join(projectRoot, ".ng-manager/frontend-tasks/task-1/dev-plan.md")), true);
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "plan-ready");

    const validateCb = registeredTool("ngm.workflow.validateBeforeCommit", context(projectRoot));
    const validation = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => validateCb({
      projectPath: projectRoot,
      taskId: "task-1",
      confirm: true,
    })));
    assert.equal(validation.ok, true);
    assert.equal(validation.data.operation.status, "executed");
    assert.deepEqual(validation.data.git.changedFiles, ["src/app/services/demo.service.ts"]);
    const validatedTask = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
    assert.equal(validatedTask.checks.test, "warning");
    assert.deepEqual(validatedTask.changedFiles, ["src/app/services/demo.service.ts"]);

    fs.writeFileSync(taskPath, JSON.stringify({ ...validatedTask, status: "verified" }, null, 2));
    const reviewCb = registeredTool("ngm.review.generateReport", context(projectRoot));
    const report = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => reviewCb({
      projectPath: projectRoot,
      taskId: "task-1",
      changedFiles: ["src/app/services/demo.service.ts"],
      confirm: true,
    })));
    assert.equal(report.ok, true);
    assert.equal(report.data.operation.status, "executed");
    assert.equal(fs.existsSync(path.join(projectRoot, ".ng-manager/frontend-tasks/task-1/review-report.md")), true);

    const audit = auditText(projectRoot);
    assert.equal(audit.includes("secret-title"), false);
    assert.equal(audit.includes("secret-value"), false);
    assert.equal(audit.includes("Design context"), false);
    assert.match(audit, /contextBytes/);
    assert.equal(audit.includes('"args"'), false);
    assert.match(audit, /projectRoot/);
    assert.match(audit, /REDACTED/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("workspace patch preview summarizes diffs without writing and rejects forbidden paths", async () => {
  const projectRoot = tempProject();
  try {
    const preview = await tool("ngm.workspace.applyPatchPreview").handler({
      projectPath: projectRoot,
      patch: [
        "diff --git a/src/app/a.ts b/src/app/a.ts",
        "--- a/src/app/a.ts",
        "+++ b/src/app/a.ts",
        "@@ -1 +1,2 @@",
        "-old",
        "+new",
        "+next",
      ].join("\n"),
    }, context(projectRoot));
    assert.equal(preview.ok, true);
    assert.equal(preview.data.operation.status, "preview");
    assert.deepEqual(preview.data.changedFiles, ["src/app/a.ts"]);
    assert.equal(preview.data.addedLines, 2);
    assert.equal(preview.data.removedLines, 1);
    assert.equal(fs.existsSync(path.join(projectRoot, "src/app/a.ts")), false);

    await assert.rejects(() => tool("ngm.workspace.applyPatchPreview").handler({
      projectPath: projectRoot,
      patch: "diff --git a/.env b/.env\n+++ b/.env\n+TOKEN=secret",
    }, context(projectRoot)), /forbidden/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("workspace diff hides full patch by default and returns redacted truncated patch preview when requested", async () => {
  const projectRoot = tempProject();
  const diffText = [
    "diff --git a/src/app/a.ts b/src/app/a.ts",
    "--- a/src/app/a.ts",
    "+++ b/src/app/a.ts",
    "@@ -1 +1,3 @@",
    "-old",
    "+TOKEN=secret-token",
    `+${"x".repeat(120)}`,
  ].join("\n");
  try {
    const ctx = context(projectRoot, {
      services: {
        git: {
          async status() {
            return {};
          },
          async diff() {
            return { diff: diffText };
          },
          async changedFiles() {
            return ["src/app/a.ts"];
          },
        },
      },
    });
    const summary = await tool("ngm.workspace.diff").handler({ projectPath: projectRoot }, ctx);
    assert.equal(summary.ok, true);
    assert.deepEqual(summary.data.changedFiles, ["src/app/a.ts"]);
    assert.equal(summary.data.diff, undefined);
    assert.equal(summary.data.patchPreview, undefined);

    const withPatch = await tool("ngm.workspace.diff").handler({
      projectPath: projectRoot,
      includePatch: true,
      maxBytes: 140,
    }, ctx);
    assert.equal(withPatch.ok, true);
    assert.equal(withPatch.data.maxBytes, 140);
    assert.equal(withPatch.data.truncated, true);
    assert.equal(withPatch.data.patchPreview.includes("secret-token"), false);
    assert.match(withPatch.data.patchPreview, /REDACTED/);
    assert.ok(Buffer.byteLength(withPatch.data.patchPreview, "utf-8") <= 140);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("dotted controlled aliases are registered and keep blocked default write behavior", async () => {
  for (const name of [
    "ngm.project.runScript",
    "ngm.project.stop",
    "ngm.runtime.setForProject",
    "ngm.nginx.reload",
    "ngm.nginx.proxy.save",
  ]) {
    assert.ok(tool(name), `${name} should be registered`);
  }

  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm.runtime.setForProject", {
      workspaceRoot: projectRoot,
      dataDir: projectRoot,
      services: {
        git: context(projectRoot).services.git,
        localServer: {
          async availability() {
            return { available: true, url: "http://127.0.0.1:4360" };
          },
          async updateProjectRuntime() {
            throw new Error("should not write without policy");
          },
        },
        core: {
          project: {
            async get() {
              return { id: "proj_1", name: "demo", root: projectRoot, createdAt: 1, updatedAt: 1 };
            },
          },
          nodeRuntime: {
            async resolveRuntime(config) {
              return config;
            },
          },
        },
      },
    });
    const result = parseMcpResult(await cb({
      projectId: "proj_1",
      runtime: { type: "system" },
      confirm: true,
    }));
    assert.equal(result.ok, false);
    assert.match(result.error, /write tools are disabled/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("audit warning is returned when audit storage fails but preview succeeds", async () => {
  const fileRoot = path.join(os.tmpdir(), `ngm-audit-file-${Date.now()}`);
  fs.writeFileSync(fileRoot, "not a directory");
  try {
    const cb = registeredTool("ngm.workflow.createFrontendTask", context(fileRoot));
    const result = parseMcpResult(await cb({
      projectPath: fileRoot,
      taskId: "task-1",
      title: "Preview only",
    }));
    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "preview");
    assert.equal(result.auditWarning.code, "AUDIT_LOG_WRITE_FAILED");
  } finally {
    fs.rmSync(fileRoot, { force: true });
  }
});

test("audit log refuses arbitrary projectPath outside workspaceRoot without blocking main tool", async () => {
  const workspaceRoot = tempProject();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-audit-outside-"));
  try {
    const cb = registeredTool("ngm.workflow.createFrontendTask", context(workspaceRoot));
    const result = parseMcpResult(await cb({
      projectPath: outsideRoot,
      taskId: "task-1",
      title: "Preview outside",
    }));
    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "preview");
    assert.equal(result.auditWarning.code, "AUDIT_LOG_WRITE_FAILED");
    assert.equal(fs.existsSync(path.join(outsideRoot, ".ng-manager/audit")), false);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("createFrontendTask blocks duplicate taskId without overwriting task.json", async () => {
  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm.workflow.createFrontendTask", context(projectRoot));
    const first = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => cb({
      projectPath: projectRoot,
      taskId: "task-1",
      title: "First title",
      confirm: true,
    })));
    assert.equal(first.data.operation.status, "executed");
    const taskPath = path.join(projectRoot, ".ng-manager/frontend-tasks/task-1/task.json");
    const before = fs.readFileSync(taskPath, "utf-8");
    const second = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => cb({
      projectPath: projectRoot,
      taskId: "task-1",
      title: "Second title",
      confirm: true,
    })));
    assert.equal(second.ok, true);
    assert.equal(second.data.operation.status, "blocked");
    assert.match(second.data.reason, /already exists/);
    assert.equal(fs.readFileSync(taskPath, "utf-8"), before);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("generateDeliveryReport blocks illegal draft to delivered transition", async () => {
  const projectRoot = tempProject();
  try {
    const taskCb = registeredTool("ngm.workflow.createFrontendTask", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => taskCb({
      projectPath: projectRoot,
      taskId: "task-1",
      title: "Delivery transition",
      confirm: true,
    }));
    const deliveryCb = registeredTool("ngm.workflow.generateDeliveryReport", context(projectRoot));
    const result = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => deliveryCb({
      projectPath: projectRoot,
      taskId: "task-1",
      summary: "done",
      confirm: true,
    })));
    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "blocked");
    assert.match(result.data.reason, /draft -> delivered/);
    assert.equal(fs.existsSync(path.join(projectRoot, ".ng-manager/frontend-tasks/task-1/delivery-report.md")), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("workflow tool rejects unsafe task ids through registered MCP result", async () => {
  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm.workflow.createFrontendTask", context(projectRoot));
    const result = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => cb({
      projectPath: projectRoot,
      taskId: "../bad",
      title: "Bad task",
      confirm: true,
    })));
    assert.equal(result.ok, false);
    assert.match(result.error, /taskId/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

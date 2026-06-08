const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { allTools } = require("../lib/tools/index.js");
const { registerTools } = require("../lib/register-tools.js");

const FRONTEND_TOOLS = {
  "ngm_standard_get": "read",
  "ngm_standard_init": "write",
  "ngm_standard_validate_project": "read",
  "ngm_git_validate_branch_name": "read",
  "ngm_git_validate_commit_message": "read",
  "ngm_git_generate_commit_message": "read",
  "ngm_git_generate_review_summary": "read",
  "ngm_test_detect_missing_specs": "read",
  "ngm_test_generate_spec_plan": "read",
  "ngm_test_validate_naming": "read",
  "ngm_angular_validate_structure": "read",
  "ngm_angular_validate_component_naming": "read",
  "ngm_angular_validate_component_boundary": "read",
  "ngm_review_scan_changed_files": "read",
  "ngm_review_generate_checklist": "read",
  "ngm_review_detect_risks": "read",
  "ngm_review_generate_report": "write",
  "ngm_workflow_create_frontend_task": "write",
  "ngm_workflow_generate_dev_plan": "write",
  "ngm_workflow_advance_status": "write",
  "ngm_workflow_validate_before_write": "write",
  "ngm_workflow_validate_before_commit": "write",
  "ngm_workflow_generate_delivery_report": "write",
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
      core: {
        project: {
          async get() {
            return { id: "proj_1", name: "demo", root: projectRoot, createdAt: 1, updatedAt: 1 };
          },
          async list() {
            return [{ id: "proj_1", name: "demo", root: projectRoot, createdAt: 1, updatedAt: 1 }];
          },
        },
      },
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
    const validBranch = await tool("ngm_git_validate_branch_name").handler({
      projectPath: projectRoot,
      branchName: "feature/ABC123-login-form",
    }, context(projectRoot));
    assert.equal(validBranch.data.status, "passed");

    const invalidBranch = await tool("ngm_git_validate_branch_name").handler({
      projectPath: projectRoot,
      branchName: "feature/login_form",
    }, context(projectRoot));
    assert.equal(invalidBranch.data.status, "failed");

    const validCommit = await tool("ngm_git_validate_commit_message").handler({
      projectPath: projectRoot,
      message: "feat(auth): add login form",
    }, context(projectRoot));
    assert.equal(validCommit.data.status, "passed");
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("ngm_standard_init previews, blocks without write policy, writes with policy, and audits calls", async () => {
  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm_standard_init", context(projectRoot));
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
    assert.match(audit, /ngm_standard_init/);
    assert.match(audit, /executed/);
    assert.doesNotMatch(audit, /blocked/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("detects missing specs and Angular component boundary warnings", async () => {
  const projectRoot = tempProject();
  try {
    fs.writeFileSync(path.join(projectRoot, "src/app/services/demo.service.ts"), "export class DemoService {}\n");
    fs.writeFileSync(path.join(projectRoot, "src/app/components/demo.component.ts"), `const endpoint = "https://api.example.com";\nlet value: any;\n${"x\n".repeat(130)}`);

    const missing = await tool("ngm_test_detect_missing_specs").handler({ projectPath: projectRoot }, context(projectRoot));
    assert.equal(missing.ok, true);
    assert.equal(missing.data.status, "warning");
    assert.ok(missing.data.findings.some((item) => item.ruleId === "test.missing-service-spec"));

    const boundary = await tool("ngm_angular_validate_component_boundary").handler({ projectPath: projectRoot }, context(projectRoot));
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
    const taskCb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
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

    const devPlanCb = registeredTool("ngm_workflow_generate_dev_plan", context(projectRoot));
    const devPlan = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => devPlanCb({
      projectPath: projectRoot,
      taskId: "task-1",
      context: "Design context",
      confirm: true,
    })));
    assert.equal(devPlan.ok, true);
    assert.equal(fs.existsSync(path.join(projectRoot, ".ng-manager/frontend-tasks/task-1/dev-plan.md")), true);
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "plan-ready");

    const validateCb = registeredTool("ngm_workflow_validate_before_commit", context(projectRoot));
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
    const reviewCb = registeredTool("ngm_review_generate_report", context(projectRoot));
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

test("advanceStatus previews, blocks without write policy, advances plan-ready to applied, and rejects delivered", async () => {
  const projectRoot = tempProject();
  try {
    const taskCb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => taskCb({
      projectPath: projectRoot,
      taskId: "task-advance",
      title: "Advance task",
      confirm: true,
    }));
    const devPlanCb = registeredTool("ngm_workflow_generate_dev_plan", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => devPlanCb({
      projectPath: projectRoot,
      taskId: "task-advance",
      confirm: true,
    }));

    const taskPath = path.join(projectRoot, ".ng-manager/frontend-tasks/task-advance/task.json");
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "plan-ready");

    const advanceCb = registeredTool("ngm_workflow_advance_status", context(projectRoot));
    const preview = parseMcpResult(await advanceCb({
      projectPath: projectRoot,
      taskId: "task-advance",
      nextStatus: "applied",
      note: "preview only",
    }));
    assert.equal(preview.ok, true);
    assert.equal(preview.data.operation.status, "preview");
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "plan-ready");

    const blocked = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: undefined }, () => advanceCb({
      projectPath: projectRoot,
      taskId: "task-advance",
      nextStatus: "applied",
      confirm: true,
    })));
    assert.equal(blocked.ok, true);
    assert.equal(blocked.data.operation.status, "blocked");

    const executed = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => advanceCb({
      projectPath: projectRoot,
      taskId: "task-advance",
      nextStatus: "applied",
      note: "source patch applied",
      confirm: true,
    })));
    assert.equal(executed.ok, true);
    assert.equal(executed.data.operation.status, "executed");
    assert.equal(executed.data.task.status, "applied");
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "applied");

    const delivered = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => advanceCb({
      projectPath: projectRoot,
      taskId: "task-advance",
      nextStatus: "delivered",
      confirm: true,
    })));
    assert.equal(delivered.ok, false);
    assert.match(delivered.error, /nextStatus/);

    const audit = auditText(projectRoot);
    assert.match(audit, /ngm_workflow_advance_status/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("validateBeforeCommit advances applied tasks to verified but leaves other passing statuses unchanged", async () => {
  const projectRoot = tempProject();
  try {
    const taskCb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => taskCb({
      projectPath: projectRoot,
      taskId: "task-verify",
      title: "Verify task",
      confirm: true,
    }));
    const devPlanCb = registeredTool("ngm_workflow_generate_dev_plan", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => devPlanCb({
      projectPath: projectRoot,
      taskId: "task-verify",
      confirm: true,
    }));
    const taskPath = path.join(projectRoot, ".ng-manager/frontend-tasks/task-verify/task.json");

    const validateCb = registeredTool("ngm_workflow_validate_before_commit", context(projectRoot));
    const planReady = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => validateCb({
      projectPath: projectRoot,
      taskId: "task-verify",
      confirm: true,
    })));
    assert.equal(planReady.ok, true);
    assert.equal(planReady.data.operation.status, "executed");
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "plan-ready");

    const advanceCb = registeredTool("ngm_workflow_advance_status", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => advanceCb({
      projectPath: projectRoot,
      taskId: "task-verify",
      nextStatus: "applied",
      confirm: true,
    }));
    const verified = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => validateCb({
      projectPath: projectRoot,
      taskId: "task-verify",
      confirm: true,
    })));
    assert.equal(verified.ok, true);
    assert.equal(verified.data.operation.status, "executed");
    assert.equal(JSON.parse(fs.readFileSync(taskPath, "utf-8")).status, "verified");
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("workspace patch preview summarizes diffs without writing and rejects forbidden paths", async () => {
  const projectRoot = tempProject();
  try {
    const preview = await tool("ngm_workspace_apply_patch_preview").handler({
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

    await assert.rejects(() => tool("ngm_workspace_apply_patch_preview").handler({
      projectPath: projectRoot,
      patch: "diff --git a/.env b/.env\n+++ b/.env\n+TOKEN=secret",
    }, context(projectRoot)), /forbidden/);

    await assert.rejects(() => tool("ngm_workspace_apply_patch_preview").handler({
      projectPath: projectRoot,
      patch: "diff --git a/src/app/logo.png b/src/app/logo.png\nGIT binary patch\nliteral 0",
    }, context(projectRoot)), /Binary patch is not supported by workspace preview/);
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
    const summary = await tool("ngm_workspace_diff").handler({ projectPath: projectRoot }, ctx);
    assert.equal(summary.ok, true);
    assert.deepEqual(summary.data.changedFiles, ["src/app/a.ts"]);
    assert.equal(summary.data.diff, undefined);
    assert.equal(summary.data.patchPreview, undefined);

    const withPatch = await tool("ngm_workspace_diff").handler({
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

test("workspace diff safely truncates UTF-8 patch previews and rejects binary patches", async () => {
  const projectRoot = tempProject();
  const patchPrefix = [
    "diff --git a/src/app/a.ts b/src/app/a.ts",
    "--- a/src/app/a.ts",
    "+++ b/src/app/a.ts",
    "@@ -1 +1 @@",
    "-old",
    "+",
  ].join("\n");
  const unicodeDiff = `${patchPrefix}${"中文".repeat(80)}`;
  try {
    const unicodeCtx = context(projectRoot, {
      services: {
        git: {
          async status() {
            return {};
          },
          async diff() {
            return { diff: unicodeDiff };
          },
          async changedFiles() {
            return ["src/app/a.ts"];
          },
        },
      },
    });
    const maxBytes = Buffer.byteLength(patchPrefix, "utf-8") + 1;
    const unicode = await tool("ngm_workspace_diff").handler({
      projectPath: projectRoot,
      includePatch: true,
      maxBytes,
    }, unicodeCtx);
    assert.equal(unicode.ok, true);
    assert.equal(unicode.data.truncated, true);
    assert.equal(unicode.data.patchPreview.includes("\uFFFD"), false);
    assert.ok(Buffer.byteLength(unicode.data.patchPreview, "utf-8") <= maxBytes);

    const binaryCtx = context(projectRoot, {
      services: {
        git: {
          async status() {
            return {};
          },
          async diff() {
            return { diff: "diff --git a/src/app/logo.png b/src/app/logo.png\nBinary files a/src/app/logo.png and b/src/app/logo.png differ" };
          },
          async changedFiles() {
            return ["src/app/logo.png"];
          },
        },
      },
    });
    await assert.rejects(() => tool("ngm_workspace_diff").handler({
      projectPath: projectRoot,
      includePatch: true,
    }, binaryCtx), /Binary patch is not supported by workspace preview/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("controlled snake_case tools are registered and keep blocked default write behavior", async () => {
  for (const name of [
    "ngm_project_run_script",
    "ngm_project_stop",
    "ngm_runtime_set_for_project",
    "ngm_nginx_reload",
    "ngm_nginx_proxy_save",
  ]) {
    assert.ok(tool(name), `${name} should be registered`);
  }

  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm_runtime_set_for_project", {
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
    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "blocked");
    assert.equal(result.data.errorCode, "WRITE_NOT_ALLOWED");
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("preview succeeds without audit writes when audit storage would fail", async () => {
  const fileRoot = path.join(os.tmpdir(), `ngm-audit-file-${Date.now()}`);
  fs.writeFileSync(fileRoot, "not a directory");
  try {
    const cb = registeredTool("ngm_workflow_create_frontend_task", context(fileRoot));
    const result = parseMcpResult(await cb({
      projectPath: fileRoot,
      taskId: "task-1",
      title: "Preview only",
    }));
    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "preview");
    assert.equal(result.auditWarning, undefined);
  } finally {
    fs.rmSync(fileRoot, { force: true });
  }
});

test("preview outside workspaceRoot does not write audit or block main tool", async () => {
  const workspaceRoot = tempProject();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-audit-outside-"));
  try {
    const cb = registeredTool("ngm_workflow_create_frontend_task", context(workspaceRoot));
    const result = parseMcpResult(await cb({
      projectPath: outsideRoot,
      taskId: "task-1",
      title: "Preview outside",
    }));
    assert.equal(result.ok, true);
    assert.equal(result.data.operation.status, "preview");
    assert.equal(result.auditWarning, undefined);
    assert.equal(fs.existsSync(path.join(outsideRoot, ".ng-manager/audit")), false);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("createFrontendTask blocks duplicate taskId without overwriting task.json", async () => {
  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
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
    const taskCb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => taskCb({
      projectPath: projectRoot,
      taskId: "task-1",
      title: "Delivery transition",
      confirm: true,
    }));
    const deliveryCb = registeredTool("ngm_workflow_generate_delivery_report", context(projectRoot));
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

test("workflow transition blocking does not wrap non-transition write errors", async () => {
  const projectRoot = tempProject();
  try {
    const taskCb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
    await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => taskCb({
      projectPath: projectRoot,
      taskId: "task-write-error",
      title: "Write error",
      confirm: true,
    }));
    fs.mkdirSync(path.join(projectRoot, ".ng-manager/frontend-tasks/task-write-error/dev-plan.md"));

    const devPlanCb = registeredTool("ngm_workflow_generate_dev_plan", context(projectRoot));
    const result = parseMcpResult(await withEnv({ NGM_MCP_ALLOW_WRITE: "true" }, () => devPlanCb({
      projectPath: projectRoot,
      taskId: "task-write-error",
      confirm: true,
    })));
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.error, /Illegal workflow status transition/);
    assert.doesNotMatch(result.error, /draft -> plan-ready/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("workflow tool rejects unsafe task ids through registered MCP result", async () => {
  const projectRoot = tempProject();
  try {
    const cb = registeredTool("ngm_workflow_create_frontend_task", context(projectRoot));
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

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { hubV2DocsTools } = require("../lib/tools/hub-v2/docs.tools.js");
const { hubV2IssuesTools } = require("../lib/tools/hub-v2/issues.tools.js");
const { hubV2ProjectsTools } = require("../lib/tools/hub-v2/projects.tools.js");
const { hubV2RdTools } = require("../lib/tools/hub-v2/rd.tools.js");
const { hubV2UploadTools } = require("../lib/tools/hub-v2/upload.tools.js");
const { allTools } = require("../lib/tools/index.js");
const { registerTools } = require("../lib/register-tools.js");
const { toMcpTextResult, ok } = require("../lib/utils/result.js");

const ENV_KEYS = [
  "HUB_V2_BASE_URL",
  "HUB_V2_PROJECT_KEY",
  "HUB_V2_PROJECT_TOKEN",
  "HUB_V2_PERSONAL_TOKEN",
  "HUB_V2_SOURCE",
  "HUB_V2_CONFIG",
  "NGM_MCP_UPLOAD_ROOT",
  "NGM_MCP_ALLOW_WRITE",
  "NGM_MCP_MAX_UPLOAD_BYTES",
  "NGM_MCP_MAX_RESULT_CHARS",
];

function withCleanEnv(fn) {
  const saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
  }
  const savedFetch = global.fetch;
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of ENV_KEYS) {
        if (saved[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = saved[key];
        }
      }
      global.fetch = savedFetch;
    });
}

function docsTool(name) {
  const tool = hubV2DocsTools().find((item) => item.name === name);
  assert.ok(tool, `tool ${name} should exist`);
  return tool;
}

function rdTool(name) {
  const tool = hubV2RdTools().find((item) => item.name === name);
  assert.ok(tool, `tool ${name} should exist`);
  return tool;
}

function issueTool(name) {
  const tool = hubV2IssuesTools().find((item) => item.name === name);
  assert.ok(tool, `tool ${name} should exist`);
  return tool;
}

function projectTool(name) {
  const tool = hubV2ProjectsTools().find((item) => item.name === name);
  assert.ok(tool, `tool ${name} should exist`);
  return tool;
}

function uploadTool(name) {
  const tool = hubV2UploadTools().find((item) => item.name === name);
  assert.ok(tool, `tool ${name} should exist`);
  return tool;
}

function registeredTool(name) {
  const callbacks = new Map();
  registerTools({
    registerTool(toolName, _config, cb) {
      callbacks.set(toolName, cb);
    },
  }, {});
  const callback = callbacks.get(name);
  assert.ok(callback, `registered tool ${name} should exist`);
  return callback;
}

async function callRegisteredTool(name, args) {
  const result = await registeredTool(name)(args);
  return JSON.parse(result.content[0].text);
}

test("registers Hub V2 tools with the unified names only", () => {
  const names = allTools().map((tool) => tool.name);
  const expected = [
    "hub_v2_projects_list",
    "hub_v2_projects_get",
    "hub_v2_project_members_list",
    "hub_v2_docs_list",
    "hub_v2_docs_get",
    "hub_v2_docs_get_by_slug",
    "hub_v2_docs_create",
    "hub_v2_docs_update",
    "hub_v2_issues_list",
    "hub_v2_issues_get",
    "hub_v2_issues_create",
    "hub_v2_issues_comment",
    "hub_v2_issues_assign",
    "hub_v2_issues_participant_add",
    "hub_v2_issues_branch_create",
    "hub_v2_issues_update",
    "hub_v2_upload_markdown_image",
    "hub_v2_file_upload",
    "hub_v2_rd_list",
    "hub_v2_rd_get",
    "hub_v2_rd_stage_tasks_list",
    "hub_v2_rd_create",
    "hub_v2_rd_advance_stage",
    "hub_v2_rd_stage_tasks_create",
    "hub_v2_rd_update_progress",
  ];

  for (const name of expected) {
    assert.ok(names.includes(name), `${name} should be registered through allTools()`);
    assert.ok(registeredTool(name), `${name} should be registered through registerTools()`);
  }
  assert.equal(names.some((name) => name.startsWith("sl_hub_v2.")), false);
  assert.equal(names.includes("hub_v2_image_upload"), false);
});

test("hub_v2_project_members_list uses Project Token", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    process.env.HUB_V2_SOURCE = "codex";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "OK",
          data: {
            items: [
              {
                id: "pm_1",
                userId: "usr_1",
                displayName: "王雯",
                roleCode: "qa",
                isOwner: false,
              },
            ],
          },
        }),
        { status: 200 }
      );
    };

    const result = await projectTool("hub_v2_project_members_list").handler({}, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/token/projects/demo/members");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.Authorization, "Bearer project-secret");
    assert.equal(JSON.stringify(calls[0]).includes("personal-secret"), false);
  });
});

test("hub_v2_issues_create previews and executes with Personal Token", async () => {
  const preview = await issueTool("hub_v2_issues_create").handler({
    title: "Login bug",
    description: "![shot](/api/admin/uploads/upl_1/raw)",
    type: "bug",
    priority: "high",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.requiredScope, "issue:create:write");
  assert.equal(preview.data.data.body.description, "![shot](/api/admin/uploads/upl_1/raw)");

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "iss_1" } }), { status: 201 });
    };

    const result = await issueTool("hub_v2_issues_create").handler({
      title: "Login bug",
      type: "bug",
      priority: "high",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.equal(JSON.stringify(calls[0].init.body).includes("project-secret"), false);
  });
});

test("hub_v2_issues_assign previews and executes with Personal Token", async () => {
  const preview = await issueTool("hub_v2_issues_assign").handler({
    issueId: "iss_1",
    assigneeId: "usr_1",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.requiredScope, "issue:assign:write");
  assert.deepEqual(preview.data.data.body, { assigneeId: "usr_1" });

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "iss_1", assigneeId: "usr_1" } }), { status: 200 });
    };

    const result = await issueTool("hub_v2_issues_assign").handler({
      issueId: "iss 1",
      assigneeId: "usr_1",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues/iss%201/assign");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), { assigneeId: "usr_1" });
  });
});

test("hub_v2_issues_participant_add previews and executes with Personal Token", async () => {
  const preview = await issueTool("hub_v2_issues_participant_add").handler({
    issueId: "iss_1",
    userId: "usr_lisi",
    taskTitle: "排查后端接口",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.path, "/issues/iss_1/participants");
  assert.equal(preview.data.data.requiredScope, "issue:participant:write");
  assert.deepEqual(preview.data.data.body, {
    userId: "usr_lisi",
    taskTitle: "排查后端接口",
  });

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "part_1" } }), { status: 201 });
    };

    const result = await issueTool("hub_v2_issues_participant_add").handler({
      issueId: "iss 1",
      userId: "usr_lisi",
      taskTitle: "排查后端接口",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues/iss%201/participants");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      userId: "usr_lisi",
      taskTitle: "排查后端接口",
    });
  });
});

test("hub_v2_issues_branch_create previews and executes with Personal Token", async () => {
  const preview = await issueTool("hub_v2_issues_branch_create").handler({
    issueId: "iss_1",
    ownerUserId: "usr_lisi",
    title: "排查后端接口",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.path, "/issues/iss_1/branches");
  assert.equal(preview.data.data.requiredScope, "issue:branch:write");
  assert.deepEqual(preview.data.data.body, {
    ownerUserId: "usr_lisi",
    title: "排查后端接口",
  });

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "br_1" } }), { status: 201 });
    };

    const result = await issueTool("hub_v2_issues_branch_create").handler({
      issueId: "iss 1",
      ownerUserId: "usr_lisi",
      title: "排查后端接口",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues/iss%201/branches");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      ownerUserId: "usr_lisi",
      title: "排查后端接口",
    });
  });
});

test("registered write tools preview when write policy is disabled and block confirmed writes", async () => {
  await withCleanEnv(async () => {
    delete process.env.NGM_MCP_ALLOW_WRITE;

    const preview = await callRegisteredTool("hub_v2_issues_create", {
      title: "Preview issue",
    });

    assert.equal(preview.ok, true);
    assert.equal(preview.data.code, "PREVIEW");

    const blocked = await callRegisteredTool("hub_v2_issues_create", {
      title: "Confirmed issue",
      confirm: true,
    });

    assert.equal(blocked.ok, false);
    assert.match(blocked.error, /blocked by policy/);
  });
});

test("hub_v2_issues_update previews instead of policy blocking by default", async () => {
  await withCleanEnv(async () => {
    delete process.env.NGM_MCP_ALLOW_WRITE;

    const result = await callRegisteredTool("hub_v2_issues_update", {
      issueId: "iss_1",
      title: "Updated title",
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.code, "PREVIEW");
    assert.equal(result.data.data.method, "PATCH");
    assert.equal(result.data.data.path, "/issues/iss_1");
    assert.equal(result.data.data.requiredScope, "issue:update:write");
  });
});

test("registered write tools execute confirmed writes only when write policy is enabled", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_ALLOW_WRITE = "true";
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "iss_1" } }), { status: 201 });
    };

    const result = await callRegisteredTool("hub_v2_issues_create", {
      title: "Confirmed issue",
      confirm: true,
    });

    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues");
  });
});

test("hub_v2_issues_comment previews and executes with Personal Token", async () => {
  const preview = await issueTool("hub_v2_issues_comment").handler({
    issueId: "iss_1",
    content: "补充截图\n![shot](/api/admin/uploads/upl_1/raw)",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.requiredScope, "issue:comment:write");

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "cmt_1" } }), { status: 201 });
    };

    const result = await issueTool("hub_v2_issues_comment").handler({
      issueId: "iss 1",
      content: "补充截图",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues/iss%201/comments");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
  });
});

test("hub_v2_issues_update executes with Personal Token when confirmed and allowed", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "iss_1", title: "Updated title" } }), { status: 200 });
    };

    const result = await issueTool("hub_v2_issues_update").handler({
      issueId: "iss 1",
      title: "Updated title",
      description: null,
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/issues/iss%201");
    assert.equal(calls[0].init.method, "PATCH");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      title: "Updated title",
      description: null,
    });
  });
});

test("hub_v2_upload_markdown_image uploads base64 with Personal Token", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "OK",
          data: {
            uploadId: "upl_1",
            markdown: "![shot](/api/admin/uploads/upl_1/raw)",
          },
        }),
        { status: 201 }
      );
    };

    const result = await uploadTool("hub_v2_upload_markdown_image").handler({
      contentBase64: `data:image/png;base64,${Buffer.from("png").toString("base64")}`,
      fileName: "shot.png",
      mimeType: "image/png",
      alt: "登录异常截图",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(result.data.data.markdown, "![shot](/api/admin/uploads/upl_1/raw)");
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/uploads/markdown");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.ok(calls[0].init.body instanceof FormData);
  });
});

test("hub_v2_file_upload previews and uploads base64 with Personal Token", async () => {
  const preview = await uploadTool("hub_v2_file_upload").handler({
    target: "issueAttachment",
    contentBase64: Buffer.from("video").toString("base64"),
    fileName: "clip.mp4",
    mimeType: "video/mp4",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.path, "/uploads/file");
  assert.equal(preview.data.data.requiredScope, "issue:update:write");
  assert.equal(preview.data.data.input.target, "issueAttachment");

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "OK",
          data: {
            uploadId: "upl_1",
            rawUrl: "/api/admin/uploads/upl_1/raw",
          },
        }),
        { status: 201 }
      );
    };

    const result = await uploadTool("hub_v2_file_upload").handler({
      target: "taskSheetAttachment",
      contentBase64: Buffer.from("docx").toString("base64"),
      fileName: "task-sheet.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(result.data.data.uploadId, "upl_1");
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/uploads/file");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.ok(calls[0].init.body instanceof FormData);
  });
});

test("hub_v2_upload_markdown_image previews by default without reading or uploading", async () => {
  await withCleanEnv(async () => {
    let fetchCalled = false;
    global.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ code: "OK" }), { status: 200 });
    };

    const result = await uploadTool("hub_v2_upload_markdown_image").handler({
      filePath: "Z:/does/not/exist.png",
      alt: "missing",
    }, {});

    assert.equal(result.ok, true);
    assert.equal(result.data.code, "PREVIEW");
    assert.equal(result.data.data.input.filePath, undefined);
    assert.equal(result.data.data.input.hasFilePath, true);
    assert.equal(fetchCalled, false);
  });
});

test("hub_v2_upload_markdown_image rejects invalid base64", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";

    await assert.rejects(
      () => uploadTool("hub_v2_upload_markdown_image").handler({
        contentBase64: "not base64!",
        fileName: "shot.png",
        confirm: true,
      }, {}),
      /not a valid base64 string/
    );

    await assert.rejects(
      () => uploadTool("hub_v2_upload_markdown_image").handler({
        contentBase64: "data:image/png;base64,   ",
        fileName: "shot.png",
        confirm: true,
      }, {}),
      /contentBase64 is empty/
    );
  });
});

test("hub_v2_upload_markdown_image rejects contentBase64 over the upload limit", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    process.env.NGM_MCP_MAX_UPLOAD_BYTES = "2";

    await assert.rejects(
      () => uploadTool("hub_v2_upload_markdown_image").handler({
        contentBase64: Buffer.from("png").toString("base64"),
        fileName: "shot.png",
        confirm: true,
      }, {}),
      /too large/
    );
  });
});

test("hub_v2_upload_markdown_image rejects filePath over the upload limit", async () => {
  await withCleanEnv(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-mcp-upload-limit-"));
    try {
      process.env.HUB_V2_BASE_URL = "http://hub.test";
      process.env.HUB_V2_PROJECT_KEY = "demo";
      process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
      process.env.NGM_MCP_UPLOAD_ROOT = tempDir;
      process.env.NGM_MCP_MAX_UPLOAD_BYTES = "2";
      const filePath = path.join(tempDir, "shot.png");
      fs.writeFileSync(filePath, "png");

      await assert.rejects(
        () => uploadTool("hub_v2_upload_markdown_image").handler({ filePath, confirm: true }, {}),
        /too large/
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

test("hub_v2_upload_markdown_image rejects filePath outside allowed roots", async () => {
  await withCleanEnv(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-mcp-upload-"));
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-mcp-upload-outside-"));
    try {
      process.env.HUB_V2_BASE_URL = "http://hub.test";
      process.env.HUB_V2_PROJECT_KEY = "demo";
      process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
      process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
      process.env.NGM_MCP_UPLOAD_ROOT = tempDir;
      const outsideFile = path.join(outsideDir, "shot.png");
      fs.writeFileSync(outsideFile, "png");

      await assert.rejects(
      () => uploadTool("hub_v2_upload_markdown_image").handler({ filePath: outsideFile, confirm: true }, {}),
      /filePath must be under/
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });
});

test("hub_v2_docs_list uses Project Token and expected URL", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo key";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { items: [] } }), { status: 200 });
    };

    const result = await docsTool("hub_v2_docs_list").handler({ keyword: "guide" }, {});

    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://hub.test/api/token/projects/demo%20key/docs?page=1&pageSize=20&statusGroup=active&keyword=guide");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.Authorization, "Bearer project-secret");
    assert.equal(JSON.stringify(calls[0]).includes("personal-secret"), false);
  });
});

test("hub_v2_docs_get and get_by_slug map ids and slugs", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    const urls = [];
    global.fetch = async (url) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ code: "OK", data: { contentMd: "# Doc" } }), { status: 200 });
    };

    await docsTool("hub_v2_docs_get").handler({ docId: "doc 1" }, {});
    const slugResult = await docsTool("hub_v2_docs_get_by_slug").handler({ slug: "api guide", contentOnly: true }, {});

    assert.deepEqual(urls, [
      "http://hub.test/api/token/projects/demo/docs/doc%201",
      "http://hub.test/api/token/projects/demo/docs/by-slug/api%20guide",
    ]);
    assert.equal(slugResult.ok, true);
    assert.equal(slugResult.data, "# Doc");
  });
});

test("hub_v2_docs_create previews and executes with Personal Token", async () => {
  const preview = await docsTool("hub_v2_docs_create").handler({
    title: "Agent guide",
    content: "# Guide",
    slug: "agent-guide",
    tags: ["mcp"],
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.method, "POST");
  assert.equal(preview.data.data.path, "/docs");
  assert.equal(preview.data.data.requiredScope, "doc:create:write");
  assert.deepEqual(preview.data.data.body, {
    title: "Agent guide",
    content: "# Guide",
    slug: "agent-guide",
    tags: ["mcp"],
    status: "draft",
  });

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    process.env.HUB_V2_SOURCE = "codex";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "doc_1" } }), { status: 201 });
    };

    const result = await docsTool("hub_v2_docs_create").handler({
      title: "Agent guide",
      content: "# Guide",
      categoryId: "cat_1",
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/docs");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      title: "Agent guide",
      content: "# Guide",
      categoryId: "cat_1",
      status: "draft",
      source: "codex",
    });
    assert.equal(JSON.stringify(calls[0].init.body).includes("project-secret"), false);
  });
});

test("hub_v2_docs_update previews and executes with Personal Token", async () => {
  const preview = await docsTool("hub_v2_docs_update").handler({
    docId: "doc_1",
    title: "Updated guide",
    contentMd: "# Updated",
  }, {});

  assert.equal(preview.ok, true);
  assert.equal(preview.data.code, "PREVIEW");
  assert.equal(preview.data.data.method, "PATCH");
  assert.equal(preview.data.data.path, "/docs/doc_1");
  assert.equal(preview.data.data.requiredScope, "doc:update:write");
  assert.deepEqual(preview.data.data.body, {
    title: "Updated guide",
    contentMd: "# Updated",
  });

  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "doc_1" } }), { status: 200 });
    };

    const result = await docsTool("hub_v2_docs_update").handler({
      docId: "doc 1",
      title: "Updated guide",
      summary: null,
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/docs/doc%201");
    assert.equal(calls[0].init.method, "PATCH");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      title: "Updated guide",
      summary: null,
      source: "codex",
    });
    assert.equal(JSON.stringify(calls[0].init.body).includes("project-secret"), false);
  });
});

test("hub_v2_docs_get_by_slug contentOnly supports nested item content and fails when content is absent", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    global.fetch = async () =>
      new Response(JSON.stringify({ code: "OK", data: { item: { contentMd: "# Nested" } } }), { status: 200 });

    const nestedResult = await docsTool("hub_v2_docs_get_by_slug").handler({ slug: "nested", contentOnly: true }, {});
    assert.equal(nestedResult.ok, true);
    assert.equal(nestedResult.data, "# Nested");

    global.fetch = async () =>
      new Response(JSON.stringify({ code: "OK", data: { title: "No content" } }), { status: 200 });
    const missingResult = await docsTool("hub_v2_docs_get_by_slug").handler({ slug: "missing", contentOnly: true }, {});
    assert.equal(missingResult.ok, false);
    assert.equal(missingResult.code, "DOCUMENT_CONTENT_NOT_FOUND");
  });
});

test("HTTP errors are converted without leaking tokens", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret-value";
    global.fetch = async () =>
      new Response(JSON.stringify({ code: "TOKEN_SCOPE_FORBIDDEN", message: "missing docs:read" }), { status: 403, statusText: "Forbidden" });

    await assert.rejects(
      () => docsTool("hub_v2_docs_list").handler({}, {}),
      (error) => {
        assert.match(error.message, /Hub V2 HTTP 403 TOKEN_SCOPE_FORBIDDEN/);
        assert.equal(error.message.includes("project-secret-value"), false);
        return true;
      }
    );
  });
});

test("registered Hub V2 HTTP errors keep status and code", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret-value";
    global.fetch = async () =>
      new Response(JSON.stringify({ code: "DOCUMENT_NOT_FOUND", message: "missing", detail: { docId: "doc_1" } }), { status: 404, statusText: "Not Found" });

    const result = await callRegisteredTool("hub_v2_docs_get", { docId: "doc_1" });

    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
    assert.equal(result.code, "DOCUMENT_NOT_FOUND");
    assert.deepEqual(result.detail, { docId: "doc_1" });
    assert.equal(JSON.stringify(result).includes("project-secret-value"), false);
  });
});

test("toMcpTextResult truncates oversized results", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_MAX_RESULT_CHARS = "240";

    const result = toMcpTextResult(ok("large_tool", { text: "x".repeat(5000) }));
    const parsed = JSON.parse(result.content[0].text);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.truncated, true);
    assert.equal(parsed.data.originalLength > 240, true);
    assert.equal(result.content[0].text.length <= 240, true);
  });
});

test("toMcpTextResult keeps minimal JSON under a tiny result limit", async () => {
  await withCleanEnv(async () => {
    process.env.NGM_MCP_MAX_RESULT_CHARS = "80";

    const result = toMcpTextResult(ok("large_tool", { text: "x".repeat(5000) }));
    const parsed = JSON.parse(result.content[0].text);

    assert.equal(parsed.ok, false);
    assert.equal(parsed.truncated, true);
    assert.equal(result.content[0].text.length <= 80, true);
  });
});

test("hub_v2_rd_stage_tasks_list uses Project Token", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: [] }), { status: 200 });
    };

    const result = await rdTool("hub_v2_rd_stage_tasks_list").handler({ itemId: "rdi 1" }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/token/projects/demo/rd-items/rdi%201/stage-tasks");
    assert.equal(calls[0].init.headers.Authorization, "Bearer project-secret");
  });
});

test("hub_v2_rd_create previews stage tasks before execution", async () => {
  const result = await rdTool("hub_v2_rd_create").handler({
    title: "Login feature",
    stageId: "stage_1",
    memberIds: ["usr_1", "usr_2"],
    stageTasks: [
      {
        title: "Backend API",
        ownerId: "usr_1",
      },
    ],
  }, {});

  assert.equal(result.ok, true);
  assert.equal(result.data.code, "PREVIEW");
  assert.equal(result.data.data.requiredScope, "rd:create:write");
  assert.deepEqual(result.data.data.body.stageTasks, [{ title: "Backend API", ownerId: "usr_1" }]);
});

test("hub_v2_rd_stage_tasks_create executes with Personal Token when confirmed", async () => {
  await withCleanEnv(async () => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret";
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ code: "OK", data: { id: "task_1" } }), { status: 201 });
    };

    const result = await rdTool("hub_v2_rd_stage_tasks_create").handler({
      itemId: "rdi_1",
      title: "Regression validation",
      ownerIds: ["usr_1"],
      confirm: true,
    }, {});

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://hub.test/api/personal/projects/demo/rd-items/rdi_1/stage-tasks");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer personal-secret");
    assert.equal(JSON.stringify(calls[0].init.body).includes("project-secret"), false);
  });
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  getConfiguredProject,
  listConfiguredProjects,
  normalizeConfig,
  resolveHubV2Context,
} = require("../lib/tools/hub-v2/config.js");

const ENV_KEYS = [
  "HUB_V2_BASE_URL",
  "HUB_V2_PROJECT",
  "HUB_V2_PROJECT_KEY",
  "HUB_V2_PROJECT_TOKEN",
  "HUB_V2_PERSONAL_TOKEN",
  "HUB_V2_CONFIG",
  "HUB_V2_SOURCE",
  "SL_HUB_V2_BASE_URL",
  "SL_HUB_V2_PROJECT",
  "SL_HUB_V2_PROJECT_KEY",
  "SL_HUB_V2_PROJECT_TOKEN",
  "SL_HUB_V2_PERSONAL_TOKEN",
  "SL_HUB_V2_CONFIG",
  "SL_HUB_V2_SOURCE",
  "NGM_HUB_V2_BASE_URL",
  "NGM_HUB_V2_PROJECT",
  "NGM_HUB_V2_PROJECT_KEY",
  "NGM_HUB_V2_PROJECT_TOKEN",
  "NGM_HUB_V2_TOKEN",
  "NGM_HUB_V2_PERSONAL_TOKEN",
  "NGM_HUB_V2_CONFIG",
  "NGM_HUB_V2_SOURCE",
  "OPENCODE_CONFIG",
  "OPENCODE_CONFIG_CONTENT",
];

function withCleanEnv(fn) {
  const saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
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
    });
}

function writeConfig(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-hub-v2-"));
  const file = path.join(dir, "hub-v2.jsonc");
  fs.writeFileSync(file, value, "utf8");
  return file;
}

test("normalizes dedicated Hub V2 project config", () => {
  const config = normalizeConfig({
    hubV2: {
      baseUrl: "http://hub.test",
      defaultProject: "demo",
      projects: {
        demo: {
          projectKey: "prj_demo",
          projectToken: "project-secret",
          personalToken: "personal-secret",
        },
      },
    },
  });

  assert.equal(config.base_url, "http://hub.test");
  assert.equal(config.default_project, "demo");
  assert.equal(config.projects.demo.project_key, "prj_demo");
  assert.equal(config.projects.demo.project_token, "project-secret");
  assert.equal(config.projects.demo.personal_token, "personal-secret");
});

test("prefers HUB_V2 environment values and supports old prefixes", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(`{
      "base_url": "http://config.test",
      "project_key": "config-project",
      "project_token": "config-project-token",
      "personal_token": "config-personal-token"
    }`);
    process.env.SL_HUB_V2_BASE_URL = "http://old-env.test";
    process.env.HUB_V2_BASE_URL = "http://new-env.test";
    process.env.SL_HUB_V2_PROJECT_KEY = "old-project";
    process.env.HUB_V2_PROJECT_KEY = "new-project";
    process.env.SL_HUB_V2_PROJECT_TOKEN = "old-project-token";
    process.env.HUB_V2_PROJECT_TOKEN = "new-project-token";

    const context = resolveHubV2Context({}, "project", configPath);

    assert.equal(context.baseUrl, "http://new-env.test");
    assert.equal(context.projectKey, "new-project");
    assert.equal(context.token, "new-project-token");
  });
});

test("project summaries do not expose token values", async () => {
  await withCleanEnv(() => {
    process.env.HUB_V2_BASE_URL = "http://hub.test";
    process.env.HUB_V2_PROJECT_KEY = "demo";
    process.env.HUB_V2_PROJECT_TOKEN = "project-secret-value";
    process.env.HUB_V2_PERSONAL_TOKEN = "personal-secret-value";

    const summary = getConfiguredProject({});
    const serialized = JSON.stringify(summary);

    assert.equal(summary.hasProjectToken, true);
    assert.equal(summary.hasPersonalToken, true);
    assert.equal(serialized.includes("project-secret-value"), false);
    assert.equal(serialized.includes("personal-secret-value"), false);
  });
});

test("lists a selected configured project alias", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(`{
      "base_url": "http://hub.test",
      "default_project": "demo",
      "projects": {
        "demo": {
          "project_key": "prj_demo",
          "project_token": "project-token"
        }
      }
    }`);

    const data = listConfiguredProjects("demo", configPath);

    assert.equal(data.total, 1);
    assert.equal(data.items[0].name, "demo");
    assert.equal(data.items[0].projectKey, "prj_demo");
    assert.equal(JSON.stringify(data).includes("project-token"), false);
  });
});

test("gets the default configured project when multiple projects exist", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(`{
      "base_url": "http://hub.test",
      "default_project": "demo",
      "projects": {
        "demo": {
          "project_key": "prj_demo",
          "project_token": "demo-token"
        },
        "other": {
          "project_key": "prj_other",
          "project_token": "other-token"
        }
      }
    }`);

    const data = getConfiguredProject({}, configPath);

    assert.equal(data.name, "demo");
    assert.equal(data.projectKey, "prj_demo");
    assert.equal(JSON.stringify(data).includes("demo-token"), false);
  });
});

test("reads OpenCode inline config when no explicit config is selected", async () => {
  await withCleanEnv(() => {
    process.env.OPENCODE_CONFIG_CONTENT = `{
      "hubV2": {
        "baseUrl": "http://opencode.test",
        "projectKey": "opencode-project",
        "projectToken": "opencode-token"
      }
    }`;

    const context = resolveHubV2Context({}, "project");

    assert.equal(context.baseUrl, "http://opencode.test");
    assert.equal(context.projectKey, "opencode-project");
    assert.equal(context.token, "opencode-token");
  });
});

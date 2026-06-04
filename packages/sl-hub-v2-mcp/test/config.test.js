const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeConfig } = require("../lib/config.js");
const { parseJsonObject } = require("../lib/jsonc.js");
const { previewWrite } = require("../lib/preview.js");

test("parses OpenCode JSONC slHubV2 config", () => {
  const raw = parseJsonObject(`{
    // OpenCode project config
    "slHubV2": {
      "baseUrl": "http://example.test",
      "defaultProject": "demo",
      "projects": {
        "demo": {
          "projectKey": "prj_demo",
          "projectToken": "ptk",
          "personalToken": "uptk"
        }
      }
    }
  }`);

  const config = normalizeConfig(raw);
  assert.equal(config.base_url, "http://example.test");
  assert.equal(config.default_project, "demo");
  assert.equal(config.projects.demo.project_key, "prj_demo");
  assert.equal(config.projects.demo.project_token, "ptk");
  assert.equal(config.projects.demo.personal_token, "uptk");
});

test("normalizes env object from Claude style settings", () => {
  const config = normalizeConfig({
    env: {
      SL_HUB_V2_BASE_URL: "http://example.test",
      SL_HUB_V2_PROJECT_KEY: "prj_env",
      SL_HUB_V2_PROJECT_TOKEN: "ptk_env",
      SL_HUB_V2_PERSONAL_TOKEN: "uptk_env",
      SL_HUB_V2_SOURCE: "test",
    },
  });

  assert.equal(config.base_url, "http://example.test");
  assert.equal(config.project_key, "prj_env");
  assert.equal(config.project_token, "ptk_env");
  assert.equal(config.personal_token, "uptk_env");
  assert.equal(config.source, "test");
});

test("preview write returns deterministic payload", () => {
  assert.deepEqual(previewWrite("rd:transition:write", "POST", "/rd-items/rdi_1/start"), {
    code: "PREVIEW",
    message: "set confirm=true to execute this write operation",
    data: {
      method: "POST",
      path: "/rd-items/rdi_1/start",
      requiredScope: "rd:transition:write",
      body: {},
    },
  });
});

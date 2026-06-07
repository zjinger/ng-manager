const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createDoctorReport, doctor } = require("../lib/doctor.js");

const ENV_KEYS = [
  "HUB_V2_BASE_URL",
  "HUB_V2_PROJECT",
  "HUB_V2_PROJECT_KEY",
  "HUB_V2_PROJECT_TOKEN",
  "HUB_V2_PERSONAL_TOKEN",
  "HUB_V2_CONFIG",
  "HUB_V2_SOURCE",
  "NGM_DATA_DIR",
  "NGM_MCP_ALLOW_WRITE",
  "NGM_MCP_ALLOW_EXECUTE",
  "NGM_MCP_ALLOW_DANGEROUS",
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

function withHome(files, fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-mcp-doctor-home-"));
  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(home, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }
  return Promise.resolve()
    .then(() => fn(home))
    .finally(() => {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
      if (previousUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = previousUserProfile;
      }
      fs.rmSync(home, { recursive: true, force: true });
    });
}

test("doctor reports WARN when agent connection config is missing", async () => {
  await withCleanEnv(() =>
    withHome({}, async () => {
      const lines = [];

      await doctor((text) => {
        lines.push(text);
      });

      const output = lines.join("");
      assert.match(output, /ng-manager MCP Doctor/);
      assert.match(output, /config: missing/);
      assert.match(output, /Status:\n  WARN/);
    })
  );
});

test("doctor reports OK when Hub V2 config is complete", async () => {
  await withCleanEnv(() =>
    withHome(
      {
        [path.join(".ng-manager", "agent-connections.json")]: JSON.stringify({
          version: 1,
          hubV2: {
            defaultProject: "ng-manager",
            projects: {
              "ng-manager": {
                baseUrl: "http://127.0.0.1:7001",
                projectKey: "ng-manager",
                projectToken: "project-secret-value",
                personalToken: "personal-secret-value",
              },
            },
          },
        }),
      },
      () => {
        const report = createDoctorReport();

        assert.equal(report.status, "OK");
        assert.match(report.text, /config: found/);
        assert.match(report.text, /projectToken: configured/);
        assert.match(report.text, /personalToken: configured/);
        assert.equal(report.text.includes("project-secret-value"), false);
        assert.equal(report.text.includes("personal-secret-value"), false);
      }
    )
  );
});

test("doctor reports tool counts without executing tool handlers", async () => {
  await withCleanEnv(() =>
    withHome({}, () => {
      const report = createDoctorReport();

      assert.match(report.text, /Tools:\n  total: \d+/);
      assert.match(report.text, /  read: \d+/);
      assert.match(report.text, /  write: \d+/);
      assert.match(report.text, /  execute: \d+/);
      assert.match(report.text, /  dangerous: \d+/);
      assert.equal(report.text.includes("Enterprise MVP:"), false);
      assert.equal(report.text.includes("frontendStandard:"), false);
      assert.equal(report.text.includes("workflow:"), false);
      assert.equal(report.text.includes("patchPreview:"), false);
      assert.equal(report.text.includes("dottedAliases:"), false);
    })
  );
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  getConfiguredProject,
  loadConfig,
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
  const file = path.join(dir, "agent-connections.json");
  fs.writeFileSync(file, value, "utf8");
  return file;
}

function withHomeConfig(files, fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ngm-hub-v2-home-"));
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

test("reads agent-connections.json", async () => {
  await withCleanEnv(() =>
    withHomeConfig(
      {
        [path.join(".ng-manager", "agent-connections.json")]: JSON.stringify({
          version: 1,
          hubV2: {
            defaultProject: "ng-manager",
            projects: {
              "ng-manager": {
                name: "ng-manager",
                baseUrl: "http://agent.test",
                projectKey: "agent-project",
                projectName: "Agent Project",
                projectToken: "agent-project-token",
                personalToken: "agent-personal-token",
                source: "ng-manager-ui",
              },
            },
          },
        }),
      },
      () => {
        const context = resolveHubV2Context({}, "project");
        const project = getConfiguredProject({});

        assert.equal(context.baseUrl, "http://agent.test");
        assert.equal(context.projectKey, "agent-project");
        assert.equal(context.token, "agent-project-token");
        assert.equal(context.source, "ng-manager-ui");
        assert.equal(project.name, "ng-manager");
        assert.equal(project.projectName, "Agent Project");
        assert.equal(JSON.stringify(project).includes("agent-project-token"), false);
      }
    )
  );
});

test("HUB_V2_CONFIG points to custom agent-connections.json", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(JSON.stringify({
      version: 1,
      hubV2: {
        defaultProject: "custom",
        projects: {
          custom: {
            baseUrl: "http://custom.test",
            projectKey: "custom-project",
            projectToken: "custom-project-token",
          },
        },
      },
    }));
    process.env.HUB_V2_CONFIG = configPath;

    const config = loadConfig();
    const context = resolveHubV2Context({}, "project");

    assert.equal(config.default_project, "custom");
    assert.equal(context.baseUrl, "http://custom.test");
    assert.equal(context.projectKey, "custom-project");
    assert.equal(context.token, "custom-project-token");
  });
});

test("agent-connections.json supports hubV2 defaultProject and multiple projects", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(JSON.stringify({
      version: 1,
      hubV2: {
        defaultProject: "main",
        projects: {
          main: {
            baseUrl: "http://main.test",
            projectKey: "main-project",
            projectToken: "main-project-token",
            personalToken: "main-personal-token",
          },
          secondary: {
            baseUrl: "http://secondary.test",
            projectKey: "secondary-project",
            projectToken: "secondary-project-token",
          },
        },
      },
    }));

    const defaultContext = resolveHubV2Context({}, "project", configPath);
    const secondaryContext = resolveHubV2Context({ project: "secondary" }, "project", configPath);
    const projects = listConfiguredProjects(undefined, configPath);

    assert.equal(defaultContext.baseUrl, "http://main.test");
    assert.equal(defaultContext.projectKey, "main-project");
    assert.equal(defaultContext.token, "main-project-token");
    assert.equal(secondaryContext.baseUrl, "http://secondary.test");
    assert.equal(secondaryContext.projectKey, "secondary-project");
    assert.equal(projects.total, 2);
    assert.equal(projects.items.find((item) => item.name === "main").isDefault, true);
  });
});

test("environment variables override agent-connections.json", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(JSON.stringify({
      version: 1,
      hubV2: {
        defaultProject: "main",
        projects: {
          main: {
            baseUrl: "http://agent.test",
            projectKey: "agent-project",
            projectToken: "agent-project-token",
          },
        },
      },
    }));
    process.env.HUB_V2_BASE_URL = "http://env.test";
    process.env.HUB_V2_PROJECT_KEY = "env-project";
    process.env.HUB_V2_PROJECT_TOKEN = "env-project-token";

    const context = resolveHubV2Context({}, "project", configPath);

    assert.equal(context.baseUrl, "http://env.test");
    assert.equal(context.projectKey, "env-project");
    assert.equal(context.token, "env-project-token");
  });
});

test("HUB_V2 environment variables override agent-connections.json", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(`{
      "base_url": "http://config.test",
      "project_key": "config-project",
      "project_token": "config-project-token",
      "personal_token": "config-personal-token"
    }`);
    process.env.HUB_V2_BASE_URL = "http://new-env.test";
    process.env.HUB_V2_PROJECT_KEY = "new-project";
    process.env.HUB_V2_PROJECT_TOKEN = "new-project-token";

    const context = resolveHubV2Context({}, "project", configPath);

    assert.equal(context.baseUrl, "http://new-env.test");
    assert.equal(context.projectKey, "new-project");
    assert.equal(context.token, "new-project-token");
  });
});

test("multiple projects without defaultProject throws", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(JSON.stringify({
      version: 1,
      hubV2: {
        projects: {
          alpha: {
            baseUrl: "http://alpha.test",
            projectKey: "alpha-project",
            projectToken: "alpha-token",
          },
          beta: {
            baseUrl: "http://beta.test",
            projectKey: "beta-project",
            projectToken: "beta-token",
          },
        },
      },
    }));

    assert.throws(
      () => resolveHubV2Context({}, "project", configPath),
      /multiple projects configured; pass project/
    );
  });
});

test("projectKey argument overrides selected projectKey", async () => {
  await withCleanEnv(() => {
    const configPath = writeConfig(JSON.stringify({
      version: 1,
      hubV2: {
        defaultProject: "demo",
        projects: {
          demo: {
            baseUrl: "http://demo.test",
            projectKey: "configured-project-key",
            projectToken: "configured-project-token",
          },
        },
      },
    }));

    const context = resolveHubV2Context({ projectKey: "manual-project-key" }, "project", configPath);

    assert.equal(context.baseUrl, "http://demo.test");
    assert.equal(context.projectKey, "manual-project-key");
    assert.equal(context.token, "configured-project-token");
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

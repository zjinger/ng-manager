const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { allTools } = require("../lib/tools/index.js");

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
];

function tool(name) {
  const found = allTools().find((item) => item.name === name);
  assert.ok(found, `tool ${name} should exist`);
  return found;
}

test("registers new NGM local workspace tools as read-only tools", () => {
  for (const name of NEW_READ_TOOLS) {
    assert.equal(tool(name).riskLevel, "read", `${name} should be read-only`);
  }
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

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createDefaultToolPolicy } from "./policy/tool-policy";
import { allTools } from "./tools";
import type { HubV2Config, HubV2ProjectConfig } from "./tools/hub-v2/config/index";
import { loadConfig, resolveAgentConnectionsPath } from "./tools/hub-v2/config/index";

type DoctorStatus = "OK" | "WARN" | "ERROR";

type DoctorReport = {
  status: DoctorStatus;
  text: string;
};

function envValue(name: string): string | undefined {
  const value = process.env[name];
  return value !== undefined && value !== null && String(value).trim()
    ? String(value).trim()
    : undefined;
}

function statusRank(status: DoctorStatus): number {
  return status === "ERROR" ? 2 : status === "WARN" ? 1 : 0;
}

function maxStatus(...statuses: DoctorStatus[]): DoctorStatus {
  return statuses.reduce<DoctorStatus>((current, next) => (
    statusRank(next) > statusRank(current) ? next : current
  ), "OK");
}

function defaultDataDir(): string {
  return envValue("NGM_DATA_DIR") ?? join(homedir(), ".ng-manager");
}

function defaultWorkspaceRoot(): string {
  return envValue("NGM_WORKSPACE_ROOT") ?? process.cwd();
}

function readPackageInfo(): { text: string; status: DoctorStatus } {
  try {
    const packagePath = join(__dirname, "..", "package.json");
    const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as {
      name?: string;
      version?: string;
    };
    const name = parsed.name ?? "@yinuo-ngm/mcp-server";
    const version = parsed.version ?? "unknown";
    return { text: `${name} ${version}`, status: version === "unknown" ? "WARN" : "OK" };
  } catch {
    return { text: "@yinuo-ngm/mcp-server unknown", status: "WARN" };
  }
}

function configured(value: string | undefined): string {
  return value ? "configured" : "missing";
}

function displayValue(value: string | undefined): string {
  return value || "missing";
}

function selectedProject(config: HubV2Config): {
  name: string | undefined;
  project: HubV2ProjectConfig;
  status: DoctorStatus;
} {
  const projects = config.projects ?? {};
  const entries = Object.entries(projects);
  const selected = envValue("HUB_V2_PROJECT") ?? config.default_project;
  if (selected) {
    return {
      name: selected,
      project: projects[selected] ?? {},
      status: projects[selected] || !entries.length ? "OK" : "WARN",
    };
  }
  if (entries.length === 1) {
    return { name: entries[0][0], project: entries[0][1], status: "OK" };
  }
  if (entries.length > 1) {
    return { name: undefined, project: {}, status: "WARN" };
  }
  return { name: undefined, project: {}, status: "WARN" };
}

function configValue(config: HubV2Config, project: HubV2ProjectConfig, key: keyof HubV2ProjectConfig): string | undefined {
  return project[key] ?? config[key];
}

function hubV2Section(): { lines: string[]; status: DoctorStatus } {
  const path = resolveAgentConnectionsPath();
  if (!existsSync(path)) {
    return {
      status: "WARN",
      lines: [
        "Hub V2:",
        "  config: missing",
        `  path: ${path}`,
      ],
    };
  }

  let config: HubV2Config;
  try {
    config = loadConfig(path);
  } catch (error) {
    return {
      status: "ERROR",
      lines: [
        "Hub V2:",
        "  config: invalid",
        `  path: ${path}`,
        `  error: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const selected = selectedProject(config);
  const project = selected.project;
  const baseUrl = envValue("HUB_V2_BASE_URL") ?? configValue(config, project, "base_url");
  const projectKey = envValue("HUB_V2_PROJECT_KEY") ?? configValue(config, project, "project_key");
  const projectToken = envValue("HUB_V2_PROJECT_TOKEN") ?? configValue(config, project, "project_token");
  const personalToken = envValue("HUB_V2_PERSONAL_TOKEN") ?? configValue(config, project, "personal_token");
  const fieldStatus: DoctorStatus = baseUrl && projectKey && projectToken && personalToken ? "OK" : "WARN";

  return {
    status: maxStatus(selected.status, fieldStatus),
    lines: [
      "Hub V2:",
      "  config: found",
      `  defaultProject: ${displayValue(config.default_project)}`,
      `  project: ${displayValue(selected.name)}`,
      `  baseUrl: ${displayValue(baseUrl)}`,
      `  projectKey: ${displayValue(projectKey)}`,
      `  projectToken: ${configured(projectToken)}`,
      `  personalToken: ${configured(personalToken)}`,
    ],
  };
}

function policySection(): string[] {
  const policy = createDefaultToolPolicy();
  return [
    "Policy:",
    "  read: enabled",
    `  write: ${policy.write ? "enabled" : "disabled"}`,
    `  execute: ${policy.execute ? "enabled" : "disabled"}`,
    `  dangerous: ${policy.dangerous ? "enabled" : "disabled"}`,
  ];
}

function toolsSection(): { lines: string[]; status: DoctorStatus } {
  try {
    const counts = {
      read: 0,
      write: 0,
      execute: 0,
      dangerous: 0,
    };
    const tools = allTools();
    for (const tool of tools) {
      counts[tool.riskLevel] += 1;
    }
    return {
      status: "OK",
      lines: [
        "Tools:",
        `  total: ${tools.length}`,
        `  read: ${counts.read}`,
        `  write: ${counts.write}`,
        `  execute: ${counts.execute}`,
        `  dangerous: ${counts.dangerous}`,
      ],
    };
  } catch (error) {
    return {
      status: "ERROR",
      lines: [
        "Tools:",
        "  status: failed",
        `  error: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

function enterpriseMvpSection(): { lines: string[]; status: DoctorStatus } {
  const names = new Set(allTools().map((tool) => tool.name));
  const required = {
    frontendStandard: ["ngm.standard.get", "ngm.standard.init", "ngm.standard.validateProject"],
    workflow: ["ngm.workflow.createFrontendTask", "ngm.workflow.generateDevPlan", "ngm.workflow.validateBeforeCommit", "ngm.workflow.generateDeliveryReport"],
    audit: ["ngm.standard.init", "ngm.workflow.createFrontendTask", "ngm.review.generateReport"],
    patchPreview: ["ngm.workspace.diff", "ngm.workspace.applyPatchPreview"],
    dottedAliases: ["ngm.project.runScript", "ngm.project.stop", "ngm.runtime.setForProject", "ngm.nginx.reload", "ngm.nginx.proxy.save"],
  };
  const missing = Object.entries(required)
    .flatMap(([group, tools]) => tools.filter((tool) => !names.has(tool)).map((tool) => `${group}:${tool}`));
  return {
    status: missing.length ? "WARN" : "OK",
    lines: [
      "Enterprise MVP:",
      `  frontendStandard: ${required.frontendStandard.every((tool) => names.has(tool)) ? "available" : "missing"}`,
      `  workflow: ${required.workflow.every((tool) => names.has(tool)) ? "available" : "missing"}`,
      "  audit: project-local .ng-manager/audit/mcp-YYYY-MM-DD.jsonl",
      `  patchPreview: ${required.patchPreview.every((tool) => names.has(tool)) ? "available" : "missing"}`,
      `  dottedAliases: ${required.dottedAliases.every((tool) => names.has(tool)) ? "available" : "missing"}`,
      ...(missing.length ? [`  missing: ${missing.join(", ")}`] : []),
    ],
  };
}

export function createDoctorReport(): DoctorReport {
  const packageInfo = readPackageInfo();
  const hubV2 = hubV2Section();
  const tools = toolsSection();
  const enterprise = enterpriseMvpSection();
  const status = maxStatus(packageInfo.status, hubV2.status, tools.status, enterprise.status);
  const lines = [
    "ng-manager MCP Doctor",
    "",
    "Runtime:",
    `  Node.js: ${process.version}`,
    `  Platform: ${process.platform} ${process.arch}`,
    `  CWD: ${process.cwd()}`,
    `  MCP Server: ${packageInfo.text}`,
    "",
    "Paths:",
    `  dataDir: ${defaultDataDir()}`,
    `  workspaceRoot: ${defaultWorkspaceRoot()}`,
    `  agentConnections: ${resolveAgentConnectionsPath()}`,
    "",
    ...hubV2.lines,
    "",
    ...policySection(),
    "",
    ...tools.lines,
    "",
    ...enterprise.lines,
    "",
    "Status:",
    `  ${status}`,
  ];

  return {
    status,
    text: lines.join("\n"),
  };
}

export async function doctor(write: (text: string) => void = (text) => process.stdout.write(text)): Promise<void> {
  const report = createDoctorReport();
  write(`${report.text}\n`);
}

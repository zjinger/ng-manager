import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import path from "node:path";
import { env } from "../../env";
import {
  readJsonObjectIfExists,
  writeJsonAtomic,
} from "./atomic-json-file";
import { maskToken } from "./token-mask";
import type {
  AgentConnectionsRootRecord,
  CreateHubV2ConnectionInput,
  HubV2ConnectionListItem,
  HubV2ProjectRecord,
  HubV2Record,
  ListHubV2ConnectionsResult,
  TestConnectionResult,
  TestEndpointResult,
  UpdateHubV2ConnectionInput,
} from "./agent-connections.types";
import { spawn } from "node:child_process";

type AgentConnectionsServiceOptions = {
  dataDir?: string;
};

type PreparedConfigState = {
  root: AgentConnectionsRootRecord;
  hubV2: HubV2Record;
  projects: Record<string, HubV2ProjectRecord>;
  defaultProject?: string;
};

type McpCheckResult = { ok: boolean; error?: string };
type McpDoctorResult = { status: string; text: string };

const CLI_PACKAGE = "@yinuo-ngm/cli";


function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readString(source: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw !== "string") {
      continue;
    }
    const text = raw.trim();
    if (text) {
      return text;
    }
  }
  return undefined;
}

function hasOwn(source: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function applyTokenPatch(
  target: Record<string, unknown>,
  key: "projectToken" | "personalToken",
  patchValue: string | null | undefined,
  hasField: boolean
): void {
  if (!hasField || patchValue === undefined || patchValue === "") {
    return;
  }
  if (patchValue === null) {
    delete target[key];
    return;
  }
  const token = patchValue.trim();
  if (!token) {
    return;
  }
  target[key] = token;
}

function normalizeProject(projectName: string, rawValue: unknown): HubV2ProjectRecord {
  const raw = asRecord(rawValue);
  const normalized: HubV2ProjectRecord = {
    ...raw,
  };
  normalized.name = readString(raw, "name") ?? projectName;
  normalized.baseUrl = readString(raw, "baseUrl", "base_url");
  normalized.projectKey = readString(raw, "projectKey", "project_key");
  normalized.projectName = readString(raw, "projectName", "project_name");
  normalized.projectToken = readString(raw, "projectToken", "project_token", "token");
  normalized.personalToken = readString(raw, "personalToken", "personal_token");
  normalized.source = readString(raw, "source");
  return normalized;
}

export class AgentConnectionsService {
  readonly dataDir: string;
  readonly configPath: string;

  constructor(options: AgentConnectionsServiceOptions = {}) {
    this.dataDir = options.dataDir ?? env.dataDir;
    this.configPath = path.join(this.dataDir, "agent-connections.json");
  }

  async listHubV2Connections(): Promise<ListHubV2ConnectionsResult> {
    const state = await this.readPreparedState();
    return this.toListResult(state);
  }

  async createHubV2Connection(
    input: CreateHubV2ConnectionInput
  ): Promise<ListHubV2ConnectionsResult> {
    const state = await this.readPreparedState();
    if (state.projects[input.name]) {
      throw new GlobalError(
        GlobalErrorCodes.FS_ALREADY_EXISTS,
        `hub-v2 connection already exists: ${input.name}`
      );
    }

    const nextProject: HubV2ProjectRecord = {
      name: input.name,
      baseUrl: input.baseUrl,
      projectKey: input.projectKey,
      source: "ng-manager-ui",
    };
    if (input.projectName) {
      nextProject.projectName = input.projectName;
    }
    if (input.projectToken && input.projectToken.trim()) {
      nextProject.projectToken = input.projectToken.trim();
    }
    if (input.personalToken && input.personalToken.trim()) {
      nextProject.personalToken = input.personalToken.trim();
    }

    state.projects[input.name] = nextProject;
    const projectNames = Object.keys(state.projects);
    if (input.isDefault === true || projectNames.length === 1 || !state.defaultProject) {
      state.defaultProject = input.name;
    }

    await this.writePreparedState(state);
    return this.toListResult(state);
  }

  async updateHubV2Connection(
    name: string,
    patch: UpdateHubV2ConnectionInput
  ): Promise<ListHubV2ConnectionsResult> {
    const state = await this.readPreparedState();
    const existed = state.projects[name];
    if (!existed) {
      throw new GlobalError(
        GlobalErrorCodes.NOT_FOUND,
        `hub-v2 connection not found: ${name}`
      );
    }

    const updated: HubV2ProjectRecord = { ...existed };
    if (hasOwn(patch, "baseUrl") && patch.baseUrl) {
      updated.baseUrl = patch.baseUrl;
    }
    if (hasOwn(patch, "projectKey") && patch.projectKey) {
      updated.projectKey = patch.projectKey;
    }
    if (hasOwn(patch, "projectName")) {
      updated.projectName = patch.projectName || undefined;
    }

    applyTokenPatch(
      updated,
      "projectToken",
      patch.projectToken,
      hasOwn(patch, "projectToken")
    );
    applyTokenPatch(
      updated,
      "personalToken",
      patch.personalToken,
      hasOwn(patch, "personalToken")
    );

    state.projects[name] = updated;
    if (patch.isDefault === true) {
      state.defaultProject = name;
    }

    await this.writePreparedState(state);
    return this.toListResult(state);
  }

  async deleteHubV2Connection(name: string): Promise<ListHubV2ConnectionsResult> {
    const state = await this.readPreparedState();
    if (!state.projects[name]) {
      throw new GlobalError(
        GlobalErrorCodes.NOT_FOUND,
        `hub-v2 connection not found: ${name}`
      );
    }

    delete state.projects[name];
    if (state.defaultProject === name) {
      const nextDefault = Object.keys(state.projects)[0];
      state.defaultProject = nextDefault;
    }

    await this.writePreparedState(state);
    return this.toListResult(state);
  }

  async setDefaultHubV2Connection(name: string): Promise<ListHubV2ConnectionsResult> {
    const state = await this.readPreparedState();
    if (!state.projects[name]) {
      throw new GlobalError(
        GlobalErrorCodes.NOT_FOUND,
        `hub-v2 connection not found: ${name}`
      );
    }

    state.defaultProject = name;
    await this.writePreparedState(state);
    return this.toListResult(state);
  }

  /**
   * 测试agent-connections.json配置项连接
   * @param name 配置项名称
   * @returns Promise<TestConnectionResult>
   */
  async testHubV2Connection(name: string): Promise<TestConnectionResult> {
    const state = await this.readPreparedState();
    const project = state.projects[name];
    if (!project) {
      throw new GlobalError(
        GlobalErrorCodes.NOT_FOUND,
        `hub-v2 connection not found: ${name}`
      );
    }

    const baseUrl = (project.baseUrl || "").replace(/\/+$/, "");
    const projectKey = project.projectKey || "";
    const projectToken = project.projectToken;
    const personalToken = project.personalToken;

    const [health, personal, projectCheck] = await Promise.all([
      this.checkEndpoint(`${baseUrl}/api/public/health`),
      personalToken
        ? this.checkEndpoint(`${baseUrl}/api/personal/me`, personalToken)
        : Promise.resolve<TestEndpointResult>({ ok: false, status: 0, error: "personalToken not configured" }),
      projectToken && projectKey
        ? this.checkEndpoint(`${baseUrl}/api/token/projects/${encodeURIComponent(projectKey)}/members`, projectToken)
        : Promise.resolve<TestEndpointResult>({ ok: false, status: 0, error: "projectToken not configured" }),
    ]);

    return { health, projectToken: projectCheck, personalToken: personal };
  }

  async checkMcpServer(): Promise<McpCheckResult> {
    return new Promise((resolve) => {
      const child = spawn("npx", [CLI_PACKAGE, "mcp"], {
        shell: true,
        stdio: ["pipe", "ignore", "ignore"],
      });
      let settled = false;
  
      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        resolve({ ok: false, error: `spawn error: ${err.message}` });
      });
  
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        resolve({ ok: false, error: `process exited with code ${code}` });
      });
  
      setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        resolve({ ok: true });
      }, 3000);
    });
  }
  
  async runMcpDoctor(): Promise<McpDoctorResult> {
    return new Promise((resolve) => {
      const child = spawn("npx", [CLI_PACKAGE, "mcp", "doctor"], { shell: true, timeout: 15000 });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => { stdout += d.toString(); });
      child.stderr.on("data", (d) => { stderr += d.toString(); });
      child.on("close", (code) => {
        resolve({
          status: code === 0 ? "OK" : "ERROR",
          text: stdout.trim() || stderr.trim() || "no output",
        });
      });
      child.on("error", (err) => {
        resolve({ status: "ERROR", text: `spawn error: ${err.message}` });
      });
    });
  }

  /**
   * 检查agent-connections.json配置项连接结果（包含基础URL和Token的有效性）
   * @param url 
   * @param token 
   * @returns 
   */
  private async checkEndpoint(url: string, token?: string): Promise<TestEndpointResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
      return { ok: response.ok, status: response.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, status: 0, error: message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readPreparedState(): Promise<PreparedConfigState> {
    const loaded = await readJsonObjectIfExists(this.configPath);
    const root: AgentConnectionsRootRecord = loaded.exists
      ? { ...(loaded.value as AgentConnectionsRootRecord) }
      : { version: 1 };

    const hubRaw = asRecord(root.hubV2);
    const hubV2: HubV2Record = { ...(hubRaw as HubV2Record) };
    const projectsRaw = asRecord(hubRaw.projects);
    const projects: Record<string, HubV2ProjectRecord> = {};
    for (const [projectName, projectValue] of Object.entries(projectsRaw)) {
      const normalized = normalizeProject(projectName, projectValue);
      projects[projectName] = normalized;
    }

    const defaultProject = readString(hubRaw, "defaultProject", "default_project");
    return {
      root,
      hubV2,
      projects,
      defaultProject,
    };
  }

  private async writePreparedState(state: PreparedConfigState): Promise<void> {
    const nextRoot: AgentConnectionsRootRecord = {
      ...state.root,
      version: 1,
    };

    const nextHub: HubV2Record = {
      ...state.hubV2,
      projects: state.projects,
    };
    if (state.defaultProject) {
      nextHub.defaultProject = state.defaultProject;
    } else {
      delete nextHub.defaultProject;
    }

    nextRoot.hubV2 = nextHub;
    await writeJsonAtomic(this.configPath, nextRoot);
  }

  private toListResult(state: PreparedConfigState): ListHubV2ConnectionsResult {
    const items: HubV2ConnectionListItem[] = Object.entries(state.projects).map(
      ([name, project]) => {
        const projectToken = project.projectToken;
        const personalToken = project.personalToken;
        return {
          name,
          baseUrl: project.baseUrl || "",
          projectKey: project.projectKey || "",
          projectName: project.projectName,
          hasProjectToken: !!projectToken,
          hasPersonalToken: !!personalToken,
          projectTokenPreview: maskToken(projectToken),
          personalTokenPreview: maskToken(personalToken),
          isDefault: state.defaultProject === name,
          source: project.source,
        };
      }
    );

    return {
      items,
      defaultProject: state.defaultProject,
      configPath: this.configPath,
    };
  }
}

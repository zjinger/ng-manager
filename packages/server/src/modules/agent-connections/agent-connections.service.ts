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
  UpdateHubV2ConnectionInput,
} from "./agent-connections.types";

type AgentConnectionsServiceOptions = {
  dataDir?: string;
};

type PreparedConfigState = {
  root: AgentConnectionsRootRecord;
  hubV2: HubV2Record;
  projects: Record<string, HubV2ProjectRecord>;
  defaultProject?: string;
};

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

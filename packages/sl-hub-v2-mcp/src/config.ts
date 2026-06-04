import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseJsonObject } from "./jsonc";

export const DEFAULT_BASE_URL = "http://192.168.1.31:7008";
const CONFIG_ENV = "SL_HUB_V2_CONFIG";
const OPENCODE_CONFIG_ENV = "OPENCODE_CONFIG";
const OPENCODE_CONFIG_CONTENT_ENV = "OPENCODE_CONFIG_CONTENT";
const OPENCODE_CONFIG_FILENAMES = ["opencode.json", "opencode.jsonc"] as const;
const CLAUDE_SETTINGS_FILENAMES = ["settings.local.json", "settings.json"] as const;

export type ProjectConfig = {
  name?: string;
  alias?: string;
  id?: string;
  base_url?: string;
  project_key?: string;
  project_name?: string;
  project_token?: string;
  personal_token?: string;
  source?: string;
};

export type SlHubV2Config = ProjectConfig & {
  default_project?: string;
  projects?: Record<string, ProjectConfig>;
};

export type ResolveContextOptions = {
  project?: string;
  projectKey?: string;
  baseUrl?: string;
  token?: string;
  source?: string;
};

export type ResolvedContext = {
  baseUrl: string;
  projectKey: string;
  token: string;
  source: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function putIfValue(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined && value !== null && String(value).trim()) {
    target[key] = String(value).trim();
  }
}

function getString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return undefined;
}

export function loadJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  return parseJsonObject(readFileSync(path, "utf8"));
}

export function normalizeConfig(rawValue: unknown): SlHubV2Config {
  const raw = asRecord(rawValue);
  const normalized: Record<string, unknown> = {};

  const mergeHubObject = (value: unknown): void => {
    const source = asRecord(value);
    putIfValue(normalized, "base_url", getString(source, "base_url", "baseUrl"));
    putIfValue(normalized, "project_key", getString(source, "project_key", "projectKey"));
    putIfValue(normalized, "project_name", getString(source, "project_name", "projectName"));
    putIfValue(normalized, "project_token", getString(source, "project_token", "projectToken"));
    putIfValue(normalized, "personal_token", getString(source, "personal_token", "personalToken"));
    putIfValue(normalized, "source", getString(source, "source"));
    putIfValue(normalized, "default_project", getString(source, "default_project", "defaultProject", "project"));
  };

  mergeHubObject(raw);
  mergeHubObject(raw.sl_hub_v2);
  mergeHubObject(raw.slHubV2);

  const env = asRecord(raw.env);
  putIfValue(normalized, "base_url", env.SL_HUB_V2_BASE_URL);
  putIfValue(normalized, "project_key", env.SL_HUB_V2_PROJECT_KEY);
  putIfValue(normalized, "project_name", env.SL_HUB_V2_PROJECT_NAME);
  putIfValue(normalized, "project_token", env.SL_HUB_V2_PROJECT_TOKEN);
  putIfValue(normalized, "personal_token", env.SL_HUB_V2_PERSONAL_TOKEN);
  putIfValue(normalized, "source", env.SL_HUB_V2_SOURCE);

  const projects = mergeProjects(
    normalizeProjects(raw),
    normalizeProjects(asRecord(raw.sl_hub_v2)),
    normalizeProjects(asRecord(raw.slHubV2)),
  );
  if (Object.keys(projects).length) {
    normalized.projects = projects;
  }

  return normalized as SlHubV2Config;
}

function normalizeProject(raw: unknown): ProjectConfig {
  const config = normalizeConfig(raw);
  const record = asRecord(raw);
  putIfValue(config as Record<string, unknown>, "name", record.name);
  putIfValue(config as Record<string, unknown>, "alias", record.alias);
  putIfValue(config as Record<string, unknown>, "id", record.id);
  delete config.projects;
  delete config.default_project;
  return config;
}

function normalizeProjects(raw: Record<string, unknown>): Record<string, ProjectConfig> {
  const projects: Record<string, ProjectConfig> = {};
  const value = raw.projects;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [name, projectValue] of Object.entries(value)) {
      const project = normalizeProject(projectValue);
      const projectName = project.name ?? project.alias ?? name.trim();
      if (projectName) {
        projects[projectName] = project;
      }
    }
  } else if (Array.isArray(value)) {
    for (const projectValue of value) {
      const project = normalizeProject(projectValue);
      const projectName = project.name ?? project.alias ?? project.id;
      if (projectName) {
        projects[projectName] = project;
      }
    }
  }
  return projects;
}

function mergeProjects(...maps: Record<string, ProjectConfig>[]): Record<string, ProjectConfig> {
  const merged: Record<string, ProjectConfig> = {};
  for (const map of maps) {
    for (const [name, project] of Object.entries(map)) {
      merged[name] = { ...(merged[name] ?? {}), ...project };
    }
  }
  return merged;
}

function mergeConfigs(...configs: SlHubV2Config[]): SlHubV2Config {
  const merged: SlHubV2Config = {};
  for (const config of configs) {
    if (!Object.keys(config).length) {
      continue;
    }
    const { projects, ...rest } = config;
    Object.assign(merged, rest);
    if (projects) {
      merged.projects = mergeProjects(merged.projects ?? {}, projects);
    }
  }
  return merged;
}

function parentPaths(): string[] {
  const paths: string[] = [];
  let current = resolve(process.cwd());
  while (true) {
    paths.push(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return paths;
}

function claudeProjectSettingsPaths(): string[] {
  const paths: string[] = [];
  for (const directory of parentPaths()) {
    for (const filename of CLAUDE_SETTINGS_FILENAMES) {
      paths.push(join(directory, ".claude", filename));
    }
  }
  return paths;
}

function opencodeProjectConfigPath(): string | undefined {
  for (const directory of parentPaths()) {
    for (const filename of OPENCODE_CONFIG_FILENAMES) {
      const path = join(directory, filename);
      if (existsSync(path)) {
        return path;
      }
    }
    if (existsSync(join(directory, ".git"))) {
      break;
    }
  }
  return undefined;
}

function opencodeUserConfigPaths(): string[] {
  const paths: string[] = [];
  if (process.env.APPDATA) {
    for (const filename of OPENCODE_CONFIG_FILENAMES) {
      paths.push(join(process.env.APPDATA, "opencode", filename));
    }
  }
  for (const filename of OPENCODE_CONFIG_FILENAMES) {
    paths.push(join(homedir(), ".config", "opencode", filename));
  }
  return paths;
}

function loadOpencodeConfig(): SlHubV2Config {
  const configs: SlHubV2Config[] = [];
  for (const path of opencodeUserConfigPaths()) {
    configs.push(normalizeConfig(loadJsonFile(path)));
  }
  if (process.env[OPENCODE_CONFIG_ENV]) {
    configs.push(normalizeConfig(loadJsonFile(resolve(process.env[OPENCODE_CONFIG_ENV]))));
  }
  const projectPath = opencodeProjectConfigPath();
  if (projectPath) {
    configs.push(normalizeConfig(loadJsonFile(projectPath)));
  }
  if (process.env[OPENCODE_CONFIG_CONTENT_ENV]) {
    configs.push(normalizeConfig(parseJsonObject(process.env[OPENCODE_CONFIG_CONTENT_ENV])));
  }
  return mergeConfigs(...configs);
}

function defaultConfigPaths(): string[] {
  const home = homedir();
  return [
    join(home, ".openclaw", "sl-hub-v2.json"),
    join(home, ".codex", "sl-hub-v2.json"),
    ...claudeProjectSettingsPaths(),
    join(home, ".claude", "settings.json"),
    join(home, ".sl-hub-v2.json"),
  ];
}

export function loadConfig(pathValue?: string): SlHubV2Config {
  if (pathValue) {
    return normalizeConfig(loadJsonFile(resolve(pathValue)));
  }
  if (process.env[CONFIG_ENV]) {
    return normalizeConfig(loadJsonFile(resolve(process.env[CONFIG_ENV])));
  }

  const paths = defaultConfigPaths();
  for (const path of paths.slice(0, 2)) {
    const config = normalizeConfig(loadJsonFile(path));
    if (Object.keys(config).length) {
      return config;
    }
  }

  const opencodeConfig = loadOpencodeConfig();
  if (Object.keys(opencodeConfig).length) {
    return opencodeConfig;
  }

  for (const path of paths.slice(2)) {
    const config = normalizeConfig(loadJsonFile(path));
    if (Object.keys(config).length) {
      return config;
    }
  }
  return {};
}

export function selectedProjectConfig(config: SlHubV2Config, project?: string): ProjectConfig {
  const projects = config.projects;
  if (!projects || !Object.keys(projects).length) {
    return {};
  }

  const selected = project ?? process.env.SL_HUB_V2_PROJECT ?? config.default_project;
  if (selected) {
    const projectConfig = projects[selected];
    if (!projectConfig) {
      throw new Error(`project config not found: ${selected}. Available projects: ${Object.keys(projects).sort().join(", ")}`);
    }
    return projectConfig;
  }

  const entries = Object.entries(projects);
  if (entries.length === 1) {
    return entries[0][1];
  }

  throw new Error(`multiple projects configured; pass project or set default_project. Available projects: ${entries.map(([name]) => name).sort().join(", ")}`);
}

function configValue(
  config: SlHubV2Config,
  projectConfig: ProjectConfig,
  key: keyof ProjectConfig,
): string | undefined {
  return projectConfig[key] ?? config[key];
}

export function resolveContext(options: ResolveContextOptions, tokenKind: "project" | "personal"): ResolvedContext {
  const config = loadConfig();
  const projectConfig = options.projectKey ? {} : selectedProjectConfig(config, options.project);
  const baseUrl = (
    options.baseUrl ??
    process.env.SL_HUB_V2_BASE_URL ??
    configValue(config, projectConfig, "base_url") ??
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  const projectKey = options.projectKey ?? process.env.SL_HUB_V2_PROJECT_KEY ?? configValue(config, projectConfig, "project_key");
  const token =
    options.token ??
    (tokenKind === "project" ? process.env.SL_HUB_V2_PROJECT_TOKEN : process.env.SL_HUB_V2_PERSONAL_TOKEN) ??
    configValue(config, projectConfig, tokenKind === "project" ? "project_token" : "personal_token");
  const source = options.source ?? process.env.SL_HUB_V2_SOURCE ?? configValue(config, projectConfig, "source") ?? "mcp";

  if (!projectKey) {
    throw new Error("project_key is required");
  }
  if (!token) {
    throw new Error(`${tokenKind}_token is required`);
  }

  return { baseUrl, projectKey, token, source };
}

export function listConfiguredProjects(project?: string): Record<string, unknown> {
  const config = loadConfig();
  const projects = config.projects ?? {};
  const items = Object.entries(projects).map(([name, item]) => ({
    name,
    projectName: item.project_name,
    projectKey: item.project_key,
    baseUrl: item.base_url ?? config.base_url ?? DEFAULT_BASE_URL,
    hasProjectToken: Boolean(item.project_token ?? config.project_token),
    hasPersonalToken: Boolean(item.personal_token ?? config.personal_token),
    isDefault: name === config.default_project,
  }));
  return {
    code: "OK",
    message: "configured projects",
    data: {
      items: project ? items.filter((item) => item.name === project || item.projectName === project) : items,
      total: project ? items.filter((item) => item.name === project || item.projectName === project).length : items.length,
    },
  };
}

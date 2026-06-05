import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";

export type HubV2ProjectConfig = {
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

export type HubV2Config = HubV2ProjectConfig & {
  default_project?: string;
  projects?: Record<string, HubV2ProjectConfig>;
};

export type HubV2ResolveOptions = {
  project?: string;
  projectKey?: string;
};

export type HubV2ResolvedContext = {
  baseUrl: string;
  projectKey: string;
  token: string;
  source: string;
};

type TokenKind = "project" | "personal";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

function putIfValue(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined && value !== null && String(value).trim()) {
    target[key] = String(value).trim();
  }
}

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return undefined;
}

function stripJsonComments(input: string): string {
  let output = "";
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) {
        index += 1;
      }
      index += 1;
      continue;
    }
    output += char;
  }
  return output;
}

export function parseJsonObject(content: string): Record<string, unknown> {
  const parsed = JSON.parse(stripJsonComments(content));
  return asRecord(parsed);
}

export function loadJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  return parseJsonObject(readFileSync(path, "utf8"));
}

function mergeHubObject(target: Record<string, unknown>, value: unknown): void {
  const source = asRecord(value);
  putIfValue(target, "base_url", getString(source, "base_url", "baseUrl"));
  putIfValue(target, "project_key", getString(source, "project_key", "projectKey"));
  putIfValue(target, "project_name", getString(source, "project_name", "projectName"));
  putIfValue(target, "project_token", getString(source, "project_token", "projectToken", "token"));
  putIfValue(target, "personal_token", getString(source, "personal_token", "personalToken"));
  putIfValue(target, "source", getString(source, "source"));
  putIfValue(target, "default_project", getString(source, "default_project", "defaultProject", "project"));
}

function mergeEnvObject(target: Record<string, unknown>, value: unknown): void {
  const env = asRecord(value);
  putIfValue(target, "base_url", getString(env, "HUB_V2_BASE_URL", "SL_HUB_V2_BASE_URL", "NGM_HUB_V2_BASE_URL"));
  putIfValue(target, "project_key", getString(env, "HUB_V2_PROJECT_KEY", "SL_HUB_V2_PROJECT_KEY", "NGM_HUB_V2_PROJECT_KEY"));
  putIfValue(target, "project_name", getString(env, "HUB_V2_PROJECT_NAME", "SL_HUB_V2_PROJECT_NAME", "NGM_HUB_V2_PROJECT_NAME"));
  putIfValue(target, "project_token", getString(env, "HUB_V2_PROJECT_TOKEN", "SL_HUB_V2_PROJECT_TOKEN", "NGM_HUB_V2_PROJECT_TOKEN", "NGM_HUB_V2_TOKEN"));
  putIfValue(target, "personal_token", getString(env, "HUB_V2_PERSONAL_TOKEN", "SL_HUB_V2_PERSONAL_TOKEN", "NGM_HUB_V2_PERSONAL_TOKEN"));
  putIfValue(target, "source", getString(env, "HUB_V2_SOURCE", "SL_HUB_V2_SOURCE", "NGM_HUB_V2_SOURCE"));
  putIfValue(target, "default_project", getString(env, "HUB_V2_PROJECT", "SL_HUB_V2_PROJECT", "NGM_HUB_V2_PROJECT"));
}

function normalizeProject(raw: unknown): HubV2ProjectConfig {
  const config = normalizeConfig(raw);
  const record = asRecord(raw);
  putIfValue(config as Record<string, unknown>, "name", record.name);
  putIfValue(config as Record<string, unknown>, "alias", record.alias);
  putIfValue(config as Record<string, unknown>, "id", record.id);
  delete config.projects;
  delete config.default_project;
  return config;
}

function normalizeProjects(raw: Record<string, unknown>): Record<string, HubV2ProjectConfig> {
  const value = raw.projects;
  const projects: Record<string, HubV2ProjectConfig> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [name, projectValue] of Object.entries(value)) {
      const project = normalizeProject(projectValue);
      const projectName = project.name ?? project.alias ?? name.trim();
      if (projectName) {
        projects[projectName] = project;
      }
    }
  }
  if (Array.isArray(value)) {
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

function mergeProjects(...maps: Array<Record<string, HubV2ProjectConfig>>): Record<string, HubV2ProjectConfig> {
  const merged: Record<string, HubV2ProjectConfig> = {};
  for (const map of maps) {
    for (const [name, project] of Object.entries(map)) {
      merged[name] = { ...(merged[name] ?? {}), ...project };
    }
  }
  return merged;
}

export function normalizeConfig(rawValue: unknown): HubV2Config {
  const raw = asRecord(rawValue);
  const normalized: Record<string, unknown> = {};
  mergeHubObject(normalized, raw);
  mergeHubObject(normalized, raw.hubV2);
  mergeHubObject(normalized, raw.slHubV2);
  mergeHubObject(normalized, raw.sl_hub_v2);
  mergeEnvObject(normalized, raw.env);

  const projects = mergeProjects(
    normalizeProjects(raw),
    normalizeProjects(asRecord(raw.hubV2)),
    normalizeProjects(asRecord(raw.slHubV2)),
    normalizeProjects(asRecord(raw.sl_hub_v2))
  );
  if (Object.keys(projects).length) {
    normalized.projects = projects;
  }
  return normalized as HubV2Config;
}

function configSearchPaths(): string[] {
  const home = homedir();
  const envConfig = envValue("HUB_V2_CONFIG", "SL_HUB_V2_CONFIG", "NGM_HUB_V2_CONFIG");
  if (envConfig) {
    return [resolve(envConfig)];
  }
  return [
    join(home, ".ng-manager", "hub-v2.json"),
    join(home, ".sl-hub-v2.json"),
    join(home, ".codex", "sl-hub-v2.json"),
    join(home, ".openclaw", "sl-hub-v2.json"),
    ...opencodeUserConfigPaths(),
    ...(process.env.OPENCODE_CONFIG ? [resolve(process.env.OPENCODE_CONFIG)] : []),
    ...opencodeProjectConfigPaths(),
    ...claudeProjectSettingsPaths(),
  ];
}

function parentPaths(): string[] {
  const paths: string[] = [];
  let current = resolve(process.cwd());
  while (true) {
    paths.push(current);
    const parent = dirname(current);
    if (parent === current) {
      return paths;
    }
    current = parent;
  }
}

function claudeProjectSettingsPaths(): string[] {
  const paths: string[] = [];
  for (const directory of parentPaths()) {
    paths.push(join(directory, ".claude", "settings.local.json"));
    paths.push(join(directory, ".claude", "settings.json"));
  }
  paths.push(join(homedir(), ".claude", "settings.json"));
  return paths;
}

export function loadConfig(pathValue?: string): HubV2Config {
  const explicitConfig = envValue("HUB_V2_CONFIG", "SL_HUB_V2_CONFIG", "NGM_HUB_V2_CONFIG");
  if (!pathValue && !explicitConfig && process.env.OPENCODE_CONFIG_CONTENT) {
    const config = normalizeConfig(parseJsonObject(process.env.OPENCODE_CONFIG_CONTENT));
    if (Object.keys(config).length) {
      return config;
    }
  }
  const paths = pathValue ? [resolve(pathValue)] : configSearchPaths();
  for (const path of paths) {
    const config = normalizeConfig(loadJsonFile(path));
    if (Object.keys(config).length) {
      return config;
    }
  }
  return {};
}

function opencodeUserConfigPaths(): string[] {
  const paths: string[] = [];
  const filenames = ["opencode.json", "opencode.jsonc"];
  if (process.env.APPDATA) {
    for (const filename of filenames) {
      paths.push(join(process.env.APPDATA, "opencode", filename));
    }
  }
  for (const filename of filenames) {
    paths.push(join(homedir(), ".config", "opencode", filename));
  }
  return paths;
}

function opencodeProjectConfigPaths(): string[] {
  const paths: string[] = [];
  for (const directory of parentPaths()) {
    paths.push(join(directory, "opencode.json"));
    paths.push(join(directory, "opencode.jsonc"));
    if (existsSync(join(directory, ".git"))) {
      break;
    }
  }
  return paths;
}

function selectedProjectConfig(config: HubV2Config, options: HubV2ResolveOptions): HubV2ProjectConfig {
  if (options.projectKey) {
    return {};
  }
  const projects = config.projects ?? {};
  const entries = Object.entries(projects);
  if (!entries.length) {
    return {};
  }

  const selected = options.project ?? envValue("HUB_V2_PROJECT", "SL_HUB_V2_PROJECT", "NGM_HUB_V2_PROJECT") ?? config.default_project;
  if (selected) {
    const project = projects[selected];
    if (!project) {
      throw new Error(`project config not found: ${selected}. Available projects: ${entries.map(([name]) => name).sort().join(", ")}`);
    }
    return project;
  }
  if (entries.length === 1) {
    return entries[0][1];
  }
  throw new Error(`multiple projects configured; pass project. Available projects: ${entries.map(([name]) => name).sort().join(", ")}`);
}

function configValue(config: HubV2Config, projectConfig: HubV2ProjectConfig, key: keyof HubV2ProjectConfig): string | undefined {
  return projectConfig[key] ?? config[key];
}

export function resolveHubV2Context(options: HubV2ResolveOptions, tokenKind: TokenKind, pathValue?: string): HubV2ResolvedContext {
  const config = loadConfig(pathValue);
  const projectConfig = selectedProjectConfig(config, options);
  const baseUrl = (
    envValue("HUB_V2_BASE_URL", "SL_HUB_V2_BASE_URL", "NGM_HUB_V2_BASE_URL") ??
    configValue(config, projectConfig, "base_url")
  )?.replace(/\/+$/, "");
  const projectKey =
    options.projectKey ??
    envValue("HUB_V2_PROJECT_KEY", "SL_HUB_V2_PROJECT_KEY", "NGM_HUB_V2_PROJECT_KEY") ??
    configValue(config, projectConfig, "project_key");
  const projectToken =
    envValue("HUB_V2_PROJECT_TOKEN", "SL_HUB_V2_PROJECT_TOKEN", "NGM_HUB_V2_PROJECT_TOKEN", "NGM_HUB_V2_TOKEN") ??
    configValue(config, projectConfig, "project_token");
  const personalToken =
    envValue("HUB_V2_PERSONAL_TOKEN", "SL_HUB_V2_PERSONAL_TOKEN", "NGM_HUB_V2_PERSONAL_TOKEN") ??
    configValue(config, projectConfig, "personal_token");
  const source =
    envValue("HUB_V2_SOURCE", "SL_HUB_V2_SOURCE", "NGM_HUB_V2_SOURCE") ??
    configValue(config, projectConfig, "source") ??
    "ngm-mcp";

  if (!baseUrl) {
    throw new Error("HUB_V2_BASE_URL is required");
  }
  if (!projectKey) {
    throw new Error("HUB_V2_PROJECT_KEY is required");
  }
  const token = tokenKind === "project" ? projectToken : personalToken;
  if (!token) {
    throw new Error(tokenKind === "project" ? "HUB_V2_PROJECT_TOKEN is required" : "HUB_V2_PERSONAL_TOKEN is required");
  }
  return { baseUrl, projectKey, token, source };
}

function projectSummary(name: string, config: HubV2Config, project: HubV2ProjectConfig): Record<string, unknown> {
  return {
    name,
    projectName: project.project_name,
    projectKey: project.project_key,
    baseUrl: project.base_url ?? config.base_url,
    hasProjectToken: Boolean(project.project_token ?? config.project_token),
    hasPersonalToken: Boolean(project.personal_token ?? config.personal_token),
    isDefault: name === config.default_project,
  };
}

export function listConfiguredProjects(project?: string, pathValue?: string): Record<string, unknown> {
  const config = loadConfig(pathValue);
  const envProjectKey = envValue("HUB_V2_PROJECT_KEY", "SL_HUB_V2_PROJECT_KEY", "NGM_HUB_V2_PROJECT_KEY") ?? config.project_key;
  let items: Array<Record<string, unknown>>;
  if (envProjectKey) {
    items = [
      {
        name: envValue("HUB_V2_PROJECT", "SL_HUB_V2_PROJECT", "NGM_HUB_V2_PROJECT") ?? config.default_project ?? "default",
        projectName: config.project_name,
        projectKey: envProjectKey,
        baseUrl: envValue("HUB_V2_BASE_URL", "SL_HUB_V2_BASE_URL", "NGM_HUB_V2_BASE_URL") ?? config.base_url,
        hasProjectToken: Boolean(envValue("HUB_V2_PROJECT_TOKEN", "SL_HUB_V2_PROJECT_TOKEN", "NGM_HUB_V2_PROJECT_TOKEN", "NGM_HUB_V2_TOKEN") ?? config.project_token),
        hasPersonalToken: Boolean(envValue("HUB_V2_PERSONAL_TOKEN", "SL_HUB_V2_PERSONAL_TOKEN", "NGM_HUB_V2_PERSONAL_TOKEN") ?? config.personal_token),
        isDefault: true,
      },
    ];
  } else {
    const projects = config.projects ?? {};
    items = Object.entries(projects).map(([name, item]) => projectSummary(name, config, item));
  }

  const filtered = project
    ? items.filter((item) => item.name === project || item.projectName === project || item.projectKey === project)
    : items;
  return {
    items: filtered,
    total: filtered.length,
  };
}

export function getConfiguredProject(options: HubV2ResolveOptions, pathValue?: string): Record<string, unknown> {
  const config = loadConfig(pathValue);
  const selected = options.project ?? options.projectKey ?? envValue("HUB_V2_PROJECT", "SL_HUB_V2_PROJECT", "NGM_HUB_V2_PROJECT") ?? config.default_project;
  if (selected) {
    const projects = listConfiguredProjects(selected, pathValue).items as Array<Record<string, unknown>>;
    if (projects.length === 1) {
      return projects[0];
    }
    if (!projects.length) {
      throw new Error("Hub V2 project config not found");
    }
    throw new Error("multiple Hub V2 project configs matched");
  }
  const projects = listConfiguredProjects(options.project ?? options.projectKey, pathValue).items as Array<Record<string, unknown>>;
  if (projects.length === 1) {
    return projects[0];
  }
  if (!projects.length) {
    throw new Error("Hub V2 project config not found");
  }
  throw new Error("multiple Hub V2 project configs matched");
}

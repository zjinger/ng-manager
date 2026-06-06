import { configSearchPaths } from "./config-paths";
import { envValue } from "./env";
import { asRecord, getString, loadJsonFile, putIfValue } from "./jsonc";

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
  putIfValue(target, "base_url", getString(env, "HUB_V2_BASE_URL"));
  putIfValue(target, "project_key", getString(env, "HUB_V2_PROJECT_KEY"));
  putIfValue(target, "project_token", getString(env, "HUB_V2_PROJECT_TOKEN"));
  putIfValue(target, "personal_token", getString(env, "HUB_V2_PERSONAL_TOKEN"));
  putIfValue(target, "source", getString(env, "HUB_V2_SOURCE"));
  putIfValue(target, "default_project", getString(env, "HUB_V2_PROJECT"));
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
  mergeEnvObject(normalized, raw.env);

  const projects = mergeProjects(
    normalizeProjects(raw),
    normalizeProjects(asRecord(raw.hubV2))
  );
  if (Object.keys(projects).length) {
    normalized.projects = projects;
  }
  return normalized as HubV2Config;
}

export function loadConfig(pathValue?: string): HubV2Config {
  for (const path of configSearchPaths(pathValue)) {
    const config = normalizeConfig(loadJsonFile(path));
    if (Object.keys(config).length) {
      return config;
    }
  }
  return {};
}

export function configEnvValue(name: string): string | undefined {
  return envValue(name);
}

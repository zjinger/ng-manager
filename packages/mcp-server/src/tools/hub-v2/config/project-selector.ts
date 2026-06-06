import { envValue } from "./env";
import type { HubV2Config, HubV2ProjectConfig, HubV2ResolveOptions } from "./resolve-context";
import { loadConfig } from "./load-config";

export function selectedProjectConfig(config: HubV2Config, options: HubV2ResolveOptions): HubV2ProjectConfig {
  const projects = config.projects ?? {};
  const entries = Object.entries(projects);
  if (!entries.length) {
    return {};
  }

  const selected = options.project ?? envValue("HUB_V2_PROJECT") ?? config.default_project;
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

export function configValue(config: HubV2Config, projectConfig: HubV2ProjectConfig, key: keyof HubV2ProjectConfig): string | undefined {
  return projectConfig[key] ?? config[key];
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
  const envProjectKey = envValue("HUB_V2_PROJECT_KEY") ?? config.project_key;
  let items: Array<Record<string, unknown>>;
  if (envProjectKey) {
    items = [
      {
        name: envValue("HUB_V2_PROJECT") ?? config.default_project ?? "default",
        projectName: config.project_name,
        projectKey: envProjectKey,
        baseUrl: envValue("HUB_V2_BASE_URL") ?? config.base_url,
        hasProjectToken: Boolean(envValue("HUB_V2_PROJECT_TOKEN") ?? config.project_token),
        hasPersonalToken: Boolean(envValue("HUB_V2_PERSONAL_TOKEN") ?? config.personal_token),
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
  const selected = options.project ?? options.projectKey ?? envValue("HUB_V2_PROJECT") ?? config.default_project;
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

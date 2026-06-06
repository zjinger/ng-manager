import { envValue } from "./env";
import type { HubV2Config, HubV2ProjectConfig } from "./load-config";
import { loadConfig } from "./load-config";
import { configValue, selectedProjectConfig } from "./project-selector";

export type { HubV2Config, HubV2ProjectConfig } from "./load-config";

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

export function resolveHubV2Context(options: HubV2ResolveOptions, tokenKind: TokenKind, pathValue?: string): HubV2ResolvedContext {
  const config = loadConfig(pathValue);
  const projectConfig = selectedProjectConfig(config, options);
  const baseUrl = (
    envValue("HUB_V2_BASE_URL") ??
    configValue(config, projectConfig, "base_url")
  )?.replace(/\/+$/, "");
  const projectKey =
    options.projectKey ??
    envValue("HUB_V2_PROJECT_KEY") ??
    configValue(config, projectConfig, "project_key");
  const projectToken =
    envValue("HUB_V2_PROJECT_TOKEN") ??
    configValue(config, projectConfig, "project_token");
  const personalToken =
    envValue("HUB_V2_PERSONAL_TOKEN") ??
    configValue(config, projectConfig, "personal_token");
  const source =
    envValue("HUB_V2_SOURCE") ??
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

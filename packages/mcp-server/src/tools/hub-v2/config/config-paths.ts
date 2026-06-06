import { homedir } from "os";
import { join, resolve } from "path";
import { envValue } from "./env";

export function resolveAgentConnectionsPath(): string {
  const envConfig = envValue("HUB_V2_CONFIG");
  if (envConfig) {
    return resolve(envConfig);
  }
  return join(homedir(), ".ng-manager", "agent-connections.json");
}

export function configSearchPaths(pathValue?: string): string[] {
  return pathValue ? [resolve(pathValue)] : [resolveAgentConnectionsPath()];
}

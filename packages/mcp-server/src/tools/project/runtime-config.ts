import type { ProjectNodeRuntimeConfig } from "@yinuo-ngm/project";
import type { RuntimeConfigArgs } from "../controlled/schemas";
import type { resolveProject } from "../project.tools";

export function normalizePackageManager(value: unknown): "npm" | "pnpm" | "yarn" {
  return value === "pnpm" || value === "yarn" ? value : "npm";
}

export function toRuntimeConfig(input: RuntimeConfigArgs): ProjectNodeRuntimeConfig {
  const config: ProjectNodeRuntimeConfig = {
    type: input.type,
  };
  if (input.name !== undefined) config.name = input.name;
  if (input.version !== undefined) config.version = input.version;
  if (input.nodePath !== undefined) config.nodePath = input.nodePath;
  if (input.packageManager !== undefined) config.packageManager = input.packageManager;
  return config;
}

export function runtimeConfigForProject(project: Awaited<ReturnType<typeof resolveProject>>): ProjectNodeRuntimeConfig {
  if (project.runtime) {
    return {
      ...project.runtime,
      packageManager: normalizePackageManager(project.runtime.packageManager ?? project.packageManager),
    };
  }

  if (project.nodeVersion) {
    return {
      type: "managed",
      version: project.nodeVersion,
      packageManager: normalizePackageManager(project.packageManager),
    };
  }

  return {
    type: "system",
    packageManager: normalizePackageManager(project.packageManager),
  };
}

export function validateTargetRuntime(runtime: ProjectNodeRuntimeConfig): void {
  if (runtime.type === "managed" && !runtime.name && !runtime.version) {
    throw new Error("managed runtime requires name or version");
  }
  if (runtime.type === "custom" && !runtime.nodePath) {
    throw new Error("custom runtime requires nodePath");
  }
}

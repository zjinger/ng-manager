import * as fs from "fs/promises";
import * as path from "path";
import type { ToolContext } from "../context/tool-context";

export type ProjectLocator = {
  projectId?: string;
  projectPath?: string;
};

export type ResolvedProjectRoot = {
  projectId?: string;
  projectName?: string;
  projectRoot: string;
};

function normalizePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.replace(/\\/g, "/").toLowerCase() : resolved;
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function resolveProjectRoot(context: ToolContext, locator: ProjectLocator = {}): Promise<ResolvedProjectRoot> {
  if (locator.projectId) {
    const project = await context.services.core.project.get(locator.projectId);
    return {
      projectId: project.id,
      projectName: project.name,
      projectRoot: path.resolve(project.root),
    };
  }

  if (locator.projectPath) {
    return {
      projectRoot: path.resolve(locator.projectPath),
    };
  }

  return {
    projectRoot: path.resolve(context.workspaceRoot),
  };
}

export function projectRelativePath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/") || ".";
}

export function assertPathInsideProject(projectRoot: string, targetPath: string): void {
  const root = normalizePath(projectRoot);
  const target = normalizePath(targetPath);
  if (!isInside(root, target)) {
    throw new Error(`Path escapes project root: ${targetPath}`);
  }
}

export function resolveNgManagerPath(projectRoot: string, ...segments: string[]): string {
  const base = path.resolve(projectRoot, ".ng-manager");
  const target = path.resolve(base, ...segments);
  assertPathInsideProject(projectRoot, target);
  if (!isInside(normalizePath(base), normalizePath(target))) {
    throw new Error(`Path escapes .ng-manager directory: ${target}`);
  }
  return target;
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export async function writeTextFile(filePath: string, value: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf-8");
}

export function validateSafeId(kind: string, value: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)) {
    throw new Error(`${kind} must be 1-80 chars and contain only letters, numbers, dot, underscore, or dash`);
  }
}

import * as fs from "fs/promises";
import * as path from "path";

export type PackageJsonSummary = {
  name?: string;
  version?: string;
  private?: boolean;
  description?: string;
  path: string;
  packageJsonPath: string;
  scripts: Record<string, string>;
  engines: Record<string, unknown>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  workspaces?: unknown;
  bin?: unknown;
  main?: string;
  types?: string;
  exports?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      out[key] = item;
    }
  }
  return out;
}

function readUnknownMap(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function toRelativeWorkspacePath(workspaceRoot: string, filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/") || ".";
}

export async function readPackageJsonSummary(workspaceRoot: string, packageDir: string): Promise<PackageJsonSummary> {
  const resolvedDir = path.resolve(packageDir);
  const packageJsonPath = path.join(resolvedDir, "package.json");
  const raw = await fs.readFile(packageJsonPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`package.json must be an object: ${packageJsonPath}`);
  }

  return {
    name: typeof parsed.name === "string" ? parsed.name : undefined,
    version: typeof parsed.version === "string" ? parsed.version : undefined,
    private: typeof parsed.private === "boolean" ? parsed.private : undefined,
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    path: toRelativeWorkspacePath(workspaceRoot, resolvedDir),
    packageJsonPath: toRelativeWorkspacePath(workspaceRoot, packageJsonPath),
    scripts: readStringMap(parsed.scripts),
    engines: readUnknownMap(parsed.engines),
    dependencies: readStringMap(parsed.dependencies),
    devDependencies: readStringMap(parsed.devDependencies),
    peerDependencies: readStringMap(parsed.peerDependencies),
    workspaces: parsed.workspaces,
    bin: parsed.bin,
    main: typeof parsed.main === "string" ? parsed.main : undefined,
    types: typeof parsed.types === "string" ? parsed.types : undefined,
    exports: parsed.exports,
  };
}

export async function readOptionalPackageJsonSummary(
  workspaceRoot: string,
  packageDir: string
): Promise<PackageJsonSummary | null> {
  try {
    return await readPackageJsonSummary(workspaceRoot, packageDir);
  } catch {
    return null;
  }
}

export async function listKnownWorkspacePackages(workspaceRoot: string): Promise<PackageJsonSummary[]> {
  const roots = new Set<string>([
    workspaceRoot,
    path.join(workspaceRoot, "webapp"),
    path.join(workspaceRoot, "desktop"),
    path.join(workspaceRoot, "apps", "hub"),
    path.join(workspaceRoot, "apps", "hub-v2"),
    path.join(workspaceRoot, "apps", "site"),
  ]);

  const packagesDir = path.join(workspaceRoot, "packages");
  try {
    const entries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        roots.add(path.join(packagesDir, entry.name));
      }
    }
  } catch {
    // packages/ may not exist in alternate workspaces.
  }

  const appsDir = path.join(workspaceRoot, "apps");
  try {
    const entries = await fs.readdir(appsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        roots.add(path.join(appsDir, entry.name));
      }
    }
  } catch {
    // apps/ may not exist in alternate workspaces.
  }

  const packages = await Promise.all(
    [...roots].map((root) => readOptionalPackageJsonSummary(workspaceRoot, root))
  );
  return packages.filter((item): item is PackageJsonSummary => item !== null).sort((a, b) => a.path.localeCompare(b.path));
}

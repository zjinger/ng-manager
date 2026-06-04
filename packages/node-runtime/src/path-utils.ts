import * as fs from "node:fs";
import * as path from "node:path";

const VERSION_RE = /^v?(\d+\.\d+\.\d+)$/i;

export function normalizeRuntimeVersion(version: string): string {
  return String(version || "").trim().replace(/^v/i, "");
}

export function isRuntimeVersionDir(name: string): boolean {
  return VERSION_RE.test(name.trim());
}

export function getVersionFromDirName(name: string): string | null {
  const match = VERSION_RE.exec(name.trim());
  return match ? match[1] : null;
}

export function fileExists(filePath?: string): filePath is string {
  if (!filePath) return false;
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function dirExists(dirPath?: string): dirPath is string {
  if (!dirPath) return false;
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

export function getPathEnvKey(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): string {
  if (process.platform !== "win32") return "PATH";
  const key = Object.keys(env).find((k) => k.toLowerCase() === "path");
  return key || "Path";
}

export function getPathValue(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): string {
  return env[getPathEnvKey(env)] || "";
}

export function toStringEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) out[key] = String(value);
  }
  return out;
}

export function prependPathSegments(
  env: Record<string, string>,
  segments: Array<string | undefined>
): Record<string, string> {
  const key = getPathEnvKey(env);
  const existing = env[key] || "";
  const valid = segments.filter((segment): segment is string => !!segment && dirExists(segment));
  return {
    ...env,
    [key]: [...valid, existing].filter(Boolean).join(path.delimiter),
  };
}

export function findOnPath(
  command: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): string | undefined {
  const pathValue = getPathValue(env);
  if (!pathValue) return undefined;

  const hasExt = !!path.extname(command);
  const exts = process.platform === "win32"
    ? (env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""];
  const names = hasExt ? [command] : exts.map((ext) => `${command}${ext.toLowerCase()}`);

  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fileExists(candidate)) return candidate;
    }
    if (process.platform === "win32" && !hasExt) {
      for (const ext of exts) {
        const candidate = path.join(dir, `${command}${ext}`);
        if (fileExists(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

export function getRuntimeBinDir(rootDir: string, nodePath: string): string {
  if (process.platform === "win32") return path.dirname(nodePath);
  const binDir = path.join(rootDir, "bin");
  return dirExists(binDir) ? binDir : path.dirname(nodePath);
}

export function resolveNodePathFromRoot(rootDir: string): string | undefined {
  const candidates = process.platform === "win32"
    ? [path.join(rootDir, "node.exe")]
    : [path.join(rootDir, "bin", "node"), path.join(rootDir, "node")];
  return candidates.find(fileExists);
}

export function resolveToolPathFromRoot(rootDir: string, tool: "npm" | "npx" | "pnpm" | "yarn"): string | undefined {
  const candidates = process.platform === "win32"
    ? [
      path.join(rootDir, `${tool}.cmd`),
      path.join(rootDir, `${tool}.exe`),
      path.join(rootDir, tool),
    ]
    : [
      path.join(rootDir, "bin", tool),
      path.join(rootDir, tool),
    ];
  return candidates.find(fileExists);
}

export function resolveNpmCliPath(rootDir: string): string | undefined {
  const candidates = [
    path.join(rootDir, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(rootDir, "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  return candidates.find(fileExists);
}

export function resolveNpxCliPath(rootDir: string): string | undefined {
  const candidates = [
    path.join(rootDir, "node_modules", "npm", "bin", "npx-cli.js"),
    path.join(rootDir, "lib", "node_modules", "npm", "bin", "npx-cli.js"),
  ];
  return candidates.find(fileExists);
}

export function inferRootDirFromNodePath(nodePath: string): string {
  const dir = path.dirname(nodePath);
  if (path.basename(dir).toLowerCase() === "bin") {
    return path.dirname(dir);
  }
  return dir;
}

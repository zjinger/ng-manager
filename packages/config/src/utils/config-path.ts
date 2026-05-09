import path from "node:path";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export function normalizeConfigFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized === ".") {
    throw new CoreError(
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
      `Invalid config file path: ${filePath}`,
      { filePath }
    );
  }
  if (path.isAbsolute(normalized)) {
    throw new CoreError(
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
      `Config file path must be relative: ${filePath}`,
      { filePath }
    );
  }
  return normalized;
}

export function resolveProjectFile(projectRoot: string, filePath: string): string {
  const normalized = normalizeConfigFilePath(filePath);
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, normalized);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new CoreError(
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
      `Config file path is out of project: ${filePath}`,
      { projectRoot, filePath }
    );
  }

  return resolved;
}

export function toRelativeConfigPath(projectRoot: string, absPath: string): string {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(absPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new CoreError(
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
      `Config file path is out of project: ${absPath}`,
      { projectRoot, absPath }
    );
  }
  return relative.replace(/\\/g, "/");
}

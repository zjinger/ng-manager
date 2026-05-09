import path from "node:path";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export function normalizeConfigFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized === ".") {
    throw new CoreError(
      `Invalid config file path: ${filePath}`,
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
      { filePath }
    );
  }
  if (path.isAbsolute(normalized)) {
    throw new CoreError(
      `Config file path must be relative: ${filePath}`,
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
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
      `Config file path is out of project: ${filePath}`,
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
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
      `Config file path is out of project: ${absPath}`,
      CoreErrorCodes.CONFIG_FILE_OUT_OF_PROJECT,
      { projectRoot, absPath }
    );
  }
  return relative.replace(/\\/g, "/");
}

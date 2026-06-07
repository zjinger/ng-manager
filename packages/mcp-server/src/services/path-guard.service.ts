import * as path from "path";
import { McpErrorCodes } from "../errors/error-codes";
import { McpToolError } from "../errors/mcp-tool-error";

function isAbsolutePath(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value) || path.posix.isAbsolute(value);
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export class PathGuardService {
  assertSafeRelativePath(relativePath: string): void {
    const normalized = relativePath.trim().replace(/\\/g, "/");
    if (!normalized || normalized.includes("\0")) {
      throw new McpToolError(McpErrorCodes.TOOL_INPUT_INVALID, "relativePath is required");
    }
    if (isAbsolutePath(normalized)) {
      throw new McpToolError(McpErrorCodes.ABSOLUTE_PATH_DENIED, "relativePath must not be absolute", { relativePath });
    }
    const parts = normalized.split("/").filter(Boolean);
    if (!parts.length || parts.includes("..")) {
      throw new McpToolError(McpErrorCodes.PATH_ESCAPE_DENIED, "relativePath must stay inside the project directory", {
        relativePath,
      });
    }
  }

  resolveInsideProject(projectRoot: string, relativePath: string): string {
    this.assertSafeRelativePath(relativePath);
    const target = path.resolve(projectRoot, ...relativePath.replace(/\\/g, "/").split("/").filter(Boolean));
    if (!isInside(path.resolve(projectRoot), target)) {
      throw new McpToolError(McpErrorCodes.PATH_ESCAPE_DENIED, "resolved path escapes project root", {
        projectRoot,
        relativePath,
      });
    }
    return target;
  }
}

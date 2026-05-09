import { detectExistingFiles } from "../../utils/config-detect";
import type { ConfigDetectResult } from "../../types/config-detect";

const ANGULAR_FILE = "angular.json";

export async function detectAngularWorkspace(projectRoot: string): Promise<ConfigDetectResult> {
  const files = await detectExistingFiles(projectRoot, [ANGULAR_FILE]);
  const available = files.length > 0;

  return {
    type: "angular-workspace",
    title: "Angular",
    available,
    filePaths: files,
    reason: available ? undefined : "未发现 angular.json"
  };
}

export function resolveAngularWorkspaceFile(filePath?: string): string {
  return filePath ?? ANGULAR_FILE;
}

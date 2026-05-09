import { detectExistingFiles } from "../../utils/config-detect";
import type { ConfigDetectResult } from "../../types/config-detect";

const PACKAGE_JSON_FILE = "package.json";

export async function detectPackageJson(projectRoot: string): Promise<ConfigDetectResult> {
  const files = await detectExistingFiles(projectRoot, [PACKAGE_JSON_FILE]);
  const available = files.length > 0;

  return {
    type: "package-json",
    title: "Package",
    available,
    filePaths: files,
    reason: available ? undefined : "未发现 package.json"
  };
}

export function resolvePackageJsonFile(filePath?: string): string {
  return filePath ?? PACKAGE_JSON_FILE;
}

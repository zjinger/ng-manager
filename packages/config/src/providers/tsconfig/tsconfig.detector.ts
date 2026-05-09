import { detectExistingFiles } from "../../utils/config-detect";
import type { ConfigDetectResult } from "../../types/config-detect";

export const DEFAULT_TSCONFIG_FILES = [
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.spec.json"
];

export async function detectTsConfig(projectRoot: string): Promise<ConfigDetectResult> {
  const files = await detectExistingFiles(projectRoot, DEFAULT_TSCONFIG_FILES);
  const available = files.length > 0;

  return {
    type: "tsconfig",
    title: "TypeScript",
    available,
    filePaths: files,
    reason: available ? undefined : "未发现 tsconfig 配置文件"
  };
}

export async function resolveTsConfigFilePath(
  projectRoot: string,
  inputFilePath?: string
): Promise<string> {
  if (inputFilePath) {
    return inputFilePath;
  }

  const files = await detectExistingFiles(projectRoot, DEFAULT_TSCONFIG_FILES);
  if (files.length === 0) {
    return DEFAULT_TSCONFIG_FILES[0];
  }
  return files[0];
}

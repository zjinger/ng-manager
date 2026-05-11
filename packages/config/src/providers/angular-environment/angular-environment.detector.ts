import { fileExists } from "@yinuo-ngm/shared";
import type { ConfigDetectResult } from "../../types/config-detect";
import { detectExistingFiles } from "../../utils/config-detect";
import { resolveProjectFile } from "../../utils/config-path";

const ANGULAR_ENV_CANDIDATES = [
  "src/environments/environment.ts",
  "src/environments/environment.dev.ts",
  "src/environments/environment.prod.ts",
  "src/environments/environment.production.ts",
  "src/environments/environment.test.ts",
  "src/environments/environment.local.ts"
];

export async function detectAngularEnvironmentFiles(projectRoot: string): Promise<ConfigDetectResult> {
  const angularJsonExists = await fileExists(resolveProjectFile(projectRoot, "angular.json"));
  const files = await detectExistingFiles(projectRoot, ANGULAR_ENV_CANDIDATES);
  const available = angularJsonExists && files.length > 0;

  return {
    type: "angular-environment",
    title: "Angular 环境文件",
    available,
    filePaths: files,
    reason: available
      ? undefined
      : angularJsonExists
        ? "未发现 src/environments/environment*.ts 文件"
        : "未检测到 angular.json"
  };
}

export async function resolveAngularEnvironmentFilePath(
  projectRoot: string,
  inputFilePath?: string
): Promise<string> {
  if (inputFilePath) {
    return inputFilePath;
  }
  const detected = await detectExistingFiles(projectRoot, ANGULAR_ENV_CANDIDATES);
  return detected[0] ?? ANGULAR_ENV_CANDIDATES[0];
}


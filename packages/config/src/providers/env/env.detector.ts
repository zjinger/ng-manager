import { detectExistingFiles } from "../../utils/config-detect";
import type { ConfigDetectResult } from "../../types/config-detect";

const ENV_FILE_NAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.development.local",
  ".env.production.local"
];

const ENV_DIR_CANDIDATES = [".", "env"];

const ENV_CANDIDATES = ENV_DIR_CANDIDATES.flatMap((dir) =>
  ENV_FILE_NAMES.map((name) => (dir === "." ? name : `${dir}/${name}`))
);

export async function detectEnvFiles(projectRoot: string): Promise<ConfigDetectResult> {
  const files = await detectExistingFiles(projectRoot, ENV_CANDIDATES);
  const available = files.length > 0;

  return {
    type: "env",
    title: "Env 文件",
    available,
    filePaths: files,
    reason: available ? undefined : "未发现 .env 配置文件"
  };
}

export async function resolveEnvFilePath(
  projectRoot: string,
  inputFilePath?: string
): Promise<string> {
  if (inputFilePath) {
    return inputFilePath;
  }
  const detected = await detectExistingFiles(projectRoot, ENV_CANDIDATES);
  return detected[0] ?? ENV_CANDIDATES[0];
}

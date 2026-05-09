import { detectExistingFiles } from "../../utils/config-detect";
import type { ConfigDetectResult } from "../../types/config-detect";

const VITE_CANDIDATES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "vite.config.mjs"
];

export async function detectViteConfig(projectRoot: string): Promise<ConfigDetectResult> {
  const files = await detectExistingFiles(projectRoot, VITE_CANDIDATES);
  const available = files.length > 0;

  return {
    type: "vite-config",
    title: "Vite",
    available,
    filePaths: files,
    reason: available ? undefined : "未发现 vite.config.*"
  };
}

export async function resolveViteFilePath(
  projectRoot: string,
  inputFilePath?: string
): Promise<string> {
  if (inputFilePath) {
    return inputFilePath;
  }
  const detected = await detectExistingFiles(projectRoot, VITE_CANDIDATES);
  return detected[0] ?? VITE_CANDIDATES[0];
}

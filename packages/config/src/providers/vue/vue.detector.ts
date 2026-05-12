import { fileExists, readJsonFile } from "@yinuo-ngm/shared";
import type { ConfigDetectResult } from "../../types/config-detect";
import { resolveProjectFile } from "../../utils/config-path";

function hasKey(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string";
}

export const VUE_PROJECT_OVERVIEW_FILE_PATH = "vue-project:overview";

const RELATED_FILE_CANDIDATES = [
  "src/App.vue",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "vite.config.mjs"
];

export async function detectVueRelatedFiles(projectRoot: string): Promise<string[]> {
  const fileChecks = await Promise.all(
    RELATED_FILE_CANDIDATES.map(async (item) => {
      const exists = await fileExists(resolveProjectFile(projectRoot, item));
      return exists ? item : undefined;
    })
  );

  return fileChecks.filter((item): item is string => typeof item === "string");
}

export async function detectVueProject(projectRoot: string): Promise<ConfigDetectResult> {
  const packageFile = resolveProjectFile(projectRoot, "package.json");
  const packageExists = await fileExists(packageFile);
  let hasVueDependency = false;
  if (packageExists) {
    const pkg = await readJsonFile<Record<string, unknown>>(packageFile);
    const dependencies =
      typeof pkg.dependencies === "object" && pkg.dependencies !== null
        ? (pkg.dependencies as Record<string, unknown>)
        : {};
    const devDependencies =
      typeof pkg.devDependencies === "object" && pkg.devDependencies !== null
        ? (pkg.devDependencies as Record<string, unknown>)
        : {};
    hasVueDependency =
      hasKey(dependencies, "vue") ||
      hasKey(devDependencies, "vue") ||
      hasKey(devDependencies, "@vitejs/plugin-vue");
  }

  const files = await detectVueRelatedFiles(projectRoot);
  const hasVueSfc = files.includes("src/App.vue");
  const available = hasVueDependency || hasVueSfc;

  return {
    type: "vue-project",
    title: "Vue",
    available,
    filePaths: available ? [VUE_PROJECT_OVERVIEW_FILE_PATH] : [],
    reason: available ? undefined : "未检测到 Vue 依赖或 src/App.vue"
  };
}

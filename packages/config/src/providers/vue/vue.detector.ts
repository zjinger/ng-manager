import { fileExists, readJsonFile } from "@yinuo-ngm/shared";
import path from "node:path";
import type { ConfigDetectResult } from "../../types/config-detect";
import { resolveProjectFile } from "../../utils/config-path";

function hasKey(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string";
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

  const candidates = ["vite.config.ts", "src/main.ts", "src/App.vue"];
  const fileChecks = await Promise.all(
    candidates.map(async (item) => {
      const exists = await fileExists(path.join(projectRoot, item));
      return exists ? item : undefined;
    })
  );

  const files = fileChecks.filter((item): item is string => typeof item === "string");
  const available = hasVueDependency || files.length > 0;

  return {
    type: "vue-project",
    title: "Vue",
    available,
    filePaths: files,
    reason: available ? undefined : "未检测到 Vue 项目特征"
  };
}

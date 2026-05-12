import { ConfigDetectResult } from "../models";
import { ConfigNavNodeVM } from "../models/config-ui.model";

const providerIconMap: Record<string, string> = {
  "angular-workspace": "proj:angular",
  "angular-environment": "deployment-unit",
  "tsconfig": "proj:ts",
  "package-json": "codepen-circle",
  "vue-project": "proj:vue",
  "vite-config": "thunderbolt",
  "env": "deployment-unit"
};

const providerOrder: Record<string, number> = {
  "vue-project": 10,
  "angular-workspace": 20,
  "package-json": 30,
  "vite-config": 40,
  "angular-environment": 50,
  "tsconfig": 60,
  "env": 70
};

function formatFileLabel(filePath: string): string {
  if (filePath === "vue-project:overview") {
    return "项目概览";
  }
  return filePath;
}

function sortDetects(catalog: ConfigDetectResult[]): ConfigDetectResult[] {
  return [...catalog].sort((a, b) => {
    const orderA = providerOrder[a.type] ?? 1000;
    const orderB = providerOrder[b.type] ?? 1000;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.title ?? a.type).localeCompare(b.title ?? b.type);
  });
}

function mapResolvedToNav(catalog: ConfigDetectResult[]): ConfigNavNodeVM[] {
  return sortDetects(catalog)
    .filter((item) => item.available)
    .map((item) => ({
      id: item.type,
      type: "provider",
      label: item.title,
      icon: providerIconMap[item.type] ?? "setting",
      description: item.reason,
      available: item.available,
      readonly: item.metadata?.["readonly"] === true,
      files: item.filePaths.map((filePath) => ({ filePath, title: formatFileLabel(filePath) })),
      fileCount: item.filePaths.length
    }));
}

function pickFirstDocId(catalog: ConfigDetectResult[]): string | null {
  const firstAvailable = sortDetects(catalog).find((item) => item.available);
  return firstAvailable?.type ?? null;
}


export { mapResolvedToNav, pickFirstDocId };

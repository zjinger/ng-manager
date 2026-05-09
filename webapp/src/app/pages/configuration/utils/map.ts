import { ConfigDetectResult } from "../models";
import { ConfigNavNodeVM } from "../models/config-ui.model";

const providerIconMap: Record<string, string> = {
  "angular-workspace": "proj:angular",
  "tsconfig": "proj:ts",
  "package-json": "codepen-circle",
  "vue-project": "proj:vue",
  "vite-config": "thunderbolt",
  "env": "database"
};

function mapResolvedToNav(catalog: ConfigDetectResult[]): ConfigNavNodeVM[] {
  return catalog
    .filter((item) => item.available)
    .map((item) => ({
      id: item.type,
      type: "provider",
      label: item.title,
      icon: providerIconMap[item.type] ?? "setting",
      description: item.reason,
      available: item.available,
      files: item.filePaths
    }));
}

function pickFirstDocId(catalog: ConfigDetectResult[]): string | null {
  const firstAvailable = catalog.find((item) => item.available);
  return firstAvailable?.type ?? null;
}


export { mapResolvedToNav, pickFirstDocId };

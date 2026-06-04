import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { HandoffMeta, HandoffValidationResult } from "../schema";
import { validateHandoffPackage } from "../validators";

export interface HandoffPackageSummary {
  packageDir: string;
  documentName: string | null;
  pageName: string | null;
  artboardName: string | null;
  textCount: number | null;
  componentCount: number | null;
  hasScreenshot: boolean;
  validation: HandoffValidationResult;
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function findMetaDirs(rootDir: string): string[] {
  const dirs: string[] = [];

  function visit(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === "meta.json")) {
      dirs.push(dir);
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "__MACOSX") {
        continue;
      }
      visit(join(dir, entry.name));
    }
  }

  visit(rootDir);
  return dirs.sort((a, b) => a.localeCompare(b));
}

export function scanHandoffPackages(rootDir: string): HandoffPackageSummary[] {
  if (!existsSync(rootDir)) {
    throw new Error(`Handoff root directory does not exist: ${rootDir}`);
  }

  return findMetaDirs(rootDir).map((packageDir) => {
    const validation = validateHandoffPackage(packageDir);
    const meta = readJson<HandoffMeta>(join(packageDir, "meta.json"));
    const texts = readJson<unknown[]>(join(packageDir, "texts.json"));
    const components = readJson<unknown[]>(join(packageDir, "components.json"));
    const assetsMap = readJson<{ screenshot?: unknown }>(join(packageDir, "assets-map.json"));
    const screenshot =
      typeof assetsMap?.screenshot === "string" ? join(packageDir, assetsMap.screenshot) : null;

    return {
      packageDir,
      documentName: meta?.documentName ?? null,
      pageName: meta?.pageName ?? null,
      artboardName: meta?.artboardName ?? null,
      textCount: Array.isArray(texts) ? texts.length : null,
      componentCount: Array.isArray(components) ? components.length : null,
      hasScreenshot: screenshot ? existsSync(screenshot) : false,
      validation,
    };
  });
}

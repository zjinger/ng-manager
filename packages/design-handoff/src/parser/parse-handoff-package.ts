import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  HandoffAssetMap,
  HandoffComponent,
  HandoffDomMap,
  HandoffLayerNode,
  HandoffMeta,
  HandoffPackage,
  HandoffPackageManifest,
  HandoffStyleMap,
  HandoffTextNode,
  HandoffTokenMap,
} from "../schema";
import { validateHandoffPackage } from "../validators";

function readJsonFile<T>(packageDir: string, fileName: string): T {
  const filePath = join(packageDir, fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function readOptionalJson<T>(packageDir: string, fileName: string): T | null {
  const filePath = join(packageDir, fileName);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readOptionalText(packageDir: string, fileName: string): string | null {
  const filePath = join(packageDir, fileName);
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf8");
}

export function parseHandoffPackage(packageDir: string): HandoffPackage {
  const validation = validateHandoffPackage(packageDir);
  if (!validation.ok) {
    const details = validation.errors
      .map((issue) => `${issue.file ? `${issue.file}: ` : ""}${issue.message}`)
      .join("; ");
    throw new Error(`Invalid handoff package: ${details}`);
  }

  const assetsMap = readJsonFile<HandoffAssetMap>(packageDir, "assets-map.json");
  const screenshotPath = assetsMap.screenshot
    ? join(packageDir, assetsMap.screenshot)
    : null;

  return {
    packageDir,
    meta: readJsonFile<HandoffMeta>(packageDir, "meta.json"),
    manifest: readOptionalJson<HandoffPackageManifest>(packageDir, "handoff.json"),
    layerTree: readJsonFile<HandoffLayerNode>(packageDir, "layer-tree.json"),
    texts: readJsonFile<HandoffTextNode[]>(packageDir, "texts.json"),
    styles: readJsonFile<HandoffStyleMap>(packageDir, "styles.json"),
    tokens: readJsonFile<HandoffTokenMap>(packageDir, "tokens.json"),
    components: readJsonFile<HandoffComponent[]>(packageDir, "components.json"),
    assetsMap,
    handoffMap: readOptionalJson<HandoffDomMap>(packageDir, "handoff-map.json"),
    designContext: readOptionalText(packageDir, "design-context.md"),
    previewHtmlPath: existsSync(join(packageDir, "preview.html"))
      ? join(packageDir, "preview.html")
      : null,
    interactionBridgePath: existsSync(join(packageDir, "interaction-bridge.js"))
      ? join(packageDir, "interaction-bridge.js")
      : null,
    agentPrompt: readFileSync(join(packageDir, "agent-prompt.md"), "utf8"),
    screenshotPath: screenshotPath && existsSync(screenshotPath) ? screenshotPath : null,
  };
}

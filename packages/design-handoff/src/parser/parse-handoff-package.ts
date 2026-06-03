import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  HandoffAssetMap,
  HandoffComponent,
  HandoffLayerNode,
  HandoffMeta,
  HandoffPackage,
  HandoffStyleMap,
  HandoffTextNode,
  HandoffTokenMap,
} from "../schema";
import { validateHandoffPackage } from "../validators";

function readJsonFile<T>(packageDir: string, fileName: string): T {
  const filePath = join(packageDir, fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
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
    layerTree: readJsonFile<HandoffLayerNode>(packageDir, "layer-tree.json"),
    texts: readJsonFile<HandoffTextNode[]>(packageDir, "texts.json"),
    styles: readJsonFile<HandoffStyleMap>(packageDir, "styles.json"),
    tokens: readJsonFile<HandoffTokenMap>(packageDir, "tokens.json"),
    components: readJsonFile<HandoffComponent[]>(packageDir, "components.json"),
    assetsMap,
    agentPrompt: readFileSync(join(packageDir, "agent-prompt.md"), "utf8"),
    screenshotPath: screenshotPath && existsSync(screenshotPath) ? screenshotPath : null,
  };
}

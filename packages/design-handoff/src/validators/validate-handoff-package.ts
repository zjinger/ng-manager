import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { HandoffValidationIssue, HandoffValidationResult } from "../schema";

const REQUIRED_JSON_FILES = [
  "meta.json",
  "layer-tree.json",
  "texts.json",
  "styles.json",
  "tokens.json",
  "components.json",
  "assets-map.json",
] as const;

const REQUIRED_TEXT_FILES = ["agent-prompt.md"] as const;

const RECOMMENDED_FILES = [
  "handoff.json",
  "handoff-map.json",
  "design-context.md",
  "preview.html",
  "interaction-bridge.js",
] as const;

function pushMissing(errors: HandoffValidationIssue[], file: string): void {
  errors.push({ file, message: "Required handoff file is missing." });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateHandoffPackage(packageDir: string): HandoffValidationResult {
  const errors: HandoffValidationIssue[] = [];
  const warnings: HandoffValidationIssue[] = [];

  if (!existsSync(packageDir)) {
    return {
      ok: false,
      packageDir,
      errors: [{ message: "Package directory does not exist." }],
      warnings,
    };
  }

  for (const file of REQUIRED_JSON_FILES) {
    const filePath = join(packageDir, file);
    if (!existsSync(filePath)) {
      pushMissing(errors, file);
      continue;
    }

    try {
      JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    } catch (error) {
      errors.push({
        file,
        message: error instanceof Error ? error.message : "Invalid JSON.",
      });
    }
  }

  for (const file of REQUIRED_TEXT_FILES) {
    if (!existsSync(join(packageDir, file))) {
      pushMissing(errors, file);
    }
  }

  for (const file of RECOMMENDED_FILES) {
    if (!existsSync(join(packageDir, file))) {
      warnings.push({
        file,
        message:
          "Recommended handoff file is missing; interactive preview / AI context may be limited.",
      });
    }
  }

  if (errors.length === 0) {
    const meta = JSON.parse(readFileSync(join(packageDir, "meta.json"), "utf8")) as unknown;
    if (!isObject(meta) || meta.platform !== "sketch") {
      errors.push({ file: "meta.json", message: "platform must be sketch." });
    }

    const layerTree = JSON.parse(readFileSync(join(packageDir, "layer-tree.json"), "utf8")) as unknown;
    if (!isObject(layerTree) || typeof layerTree.id !== "string") {
      errors.push({ file: "layer-tree.json", message: "Root layer node is invalid." });
    }

    const texts = JSON.parse(readFileSync(join(packageDir, "texts.json"), "utf8")) as unknown;
    if (!Array.isArray(texts)) {
      errors.push({ file: "texts.json", message: "Expected an array." });
    }

    const components = JSON.parse(readFileSync(join(packageDir, "components.json"), "utf8")) as unknown;
    if (!Array.isArray(components)) {
      errors.push({ file: "components.json", message: "Expected an array." });
    }

    const assetsMap = JSON.parse(readFileSync(join(packageDir, "assets-map.json"), "utf8")) as unknown;
    if (isObject(assetsMap) && typeof assetsMap.screenshot === "string") {
      const screenshotPath = join(packageDir, assetsMap.screenshot);
      if (!existsSync(screenshotPath)) {
        warnings.push({
          file: assetsMap.screenshot,
          message: "Screenshot file referenced by assets-map.json does not exist.",
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    packageDir,
    errors,
    warnings,
  };
}

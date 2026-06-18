import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  HandoffLayerNode,
  HandoffValidationIssue,
  HandoffValidationResult,
} from "../schema";
import { validateHandoffPackage } from "./validate-handoff-package";

export type DetailedCheckStatus = "pass" | "error" | "warning" | "skip";

export interface DetailedCheck {
  rule: string;
  status: DetailedCheckStatus;
  file?: string;
  message?: string;
}

export interface HandoffDetailedValidationResult extends HandoffValidationResult {
  summary: {
    totalChecks: number;
    passed: number;
    errors: number;
    warnings: number;
    skipped: number;
  };
  checks: DetailedCheck[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function collectLayerHandoffIds(node: HandoffLayerNode, ids: Set<string>): void {
  if (node.handoffId) {
    ids.add(node.handoffId);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectLayerHandoffIds(child, ids);
    }
  }
}

function isMissingHandoffIdInTree(node: HandoffLayerNode): boolean {
  if (!node.handoffId) {
    return true;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (isMissingHandoffIdInTree(child)) {
        return true;
      }
    }
  }
  return false;
}

const RECOMMENDED_FILES = [
  "handoff.json",
  "handoff-map.json",
  "design-context.md",
  "preview.html",
  "interaction-bridge.js",
  "screenshot.png",
] as const;

const RECOMMENDED_JSON_FILES = ["handoff.json", "handoff-map.json"] as const;

export function validateHandoffPackageDetailed(
  packageDir: string,
): HandoffDetailedValidationResult {
  const base = validateHandoffPackage(packageDir);
  const checks: DetailedCheck[] = [];
  const pushCheck = (
    rule: string,
    status: DetailedCheckStatus,
    file?: string,
    message?: string,
  ): void => {
    checks.push({ rule, status, file, message });
  };

  if (!base.ok) {
    for (const issue of base.errors) {
      pushCheck("base", "error", issue.file, issue.message);
    }
    return finalize(base, checks);
  }

  const exists = (file: string): boolean => existsSync(join(packageDir, file));
  for (const file of REQUIRED_JSON_FILES) {
    pushCheck("required-file", exists(file) ? "pass" : "error", file);
  }
  pushCheck("required-file", exists("agent-prompt.md") ? "pass" : "error", "agent-prompt.md");
  for (const file of RECOMMENDED_FILES) {
    pushCheck("recommended-file", exists(file) ? "pass" : "warning", file, exists(file) ? undefined : "Recommended file is missing.");
  }

  for (const file of RECOMMENDED_JSON_FILES) {
    const filePath = join(packageDir, file);
    if (!existsSync(filePath)) {
      continue;
    }
    try {
      readJson(filePath);
      pushCheck("json-parse", "pass", file);
    } catch (error) {
      pushCheck("json-parse", "warning", file, error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  const layerTree = readJson(join(packageDir, "layer-tree.json")) as unknown;
  const components = readJson(join(packageDir, "components.json")) as unknown;
  // §7.3 结构校验
  pushCheck("structure:layer-tree-root", isObject(layerTree) ? "pass" : "error", "layer-tree.json");
  const layerIds = new Set<string>();
  if (isObject(layerTree)) {
    collectLayerHandoffIds(layerTree as unknown as HandoffLayerNode, layerIds);
    const missing = isMissingHandoffIdInTree(layerTree as unknown as HandoffLayerNode);
    pushCheck("structure:layer-tree-handoffId", missing ? "warning" : "pass", "layer-tree.json", missing ? "Some layer nodes are missing handoffId." : undefined);
  }

  pushCheck("structure:components-array", Array.isArray(components) ? "pass" : "error", "components.json");
  const componentHandoffIds = new Set<string>();
  if (Array.isArray(components)) {
    let layerIdMissing = false;
    let handoffIdMissing = false;
    for (const cmp of components) {
      if (isObject(cmp)) {
        if (typeof cmp.handoffId === "string") {
          componentHandoffIds.add(cmp.handoffId);
        } else {
          handoffIdMissing = true;
        }
        if (typeof cmp.layerId !== "string") {
          layerIdMissing = true;
        }
      }
    }
    pushCheck("structure:component-layerId", layerIdMissing ? "warning" : "pass", "components.json", layerIdMissing ? "Some components are missing layerId." : undefined);
    pushCheck("structure:component-handoffId", handoffIdMissing ? "warning" : "pass", "components.json", handoffIdMissing ? "Some components are missing handoffId." : undefined);
  }

  const handoffMapPath = join(packageDir, "handoff-map.json");
  const mapHandoffIds = new Set<string>();
  let mapHasNodes = false;
  if (existsSync(handoffMapPath)) {
    try {
      const map = readJson(handoffMapPath) as unknown;
      mapHasNodes = isObject(map) && Array.isArray(map.nodes);
      pushCheck("structure:handoff-map-nodes", mapHasNodes ? "pass" : "warning", "handoff-map.json", mapHasNodes ? undefined : "handoff-map.json nodes is not an array.");
      if (mapHasNodes) {
        let nodeHandoffIdMissing = false;
        let domSelectorMissing = false;
        const nodes = (map as { nodes: unknown[] }).nodes;
        for (const node of nodes) {
          if (isObject(node)) {
            if (typeof node.handoffId === "string") {
              mapHandoffIds.add(node.handoffId);
            } else {
              nodeHandoffIdMissing = true;
            }
            if (typeof node.domSelector !== "string" || node.domSelector.length === 0) {
              domSelectorMissing = true;
            }
          }
        }
        pushCheck("structure:handoff-map-node-handoffId", nodeHandoffIdMissing ? "warning" : "pass", "handoff-map.json", nodeHandoffIdMissing ? "Some handoff-map nodes are missing handoffId." : undefined);
        pushCheck("structure:handoff-map-domSelector", domSelectorMissing ? "warning" : "pass", "handoff-map.json", domSelectorMissing ? "Some handoff-map nodes have empty domSelector." : undefined);
      }
    } catch {
      pushCheck("structure:handoff-map-nodes", "warning", "handoff-map.json", "Failed to parse handoff-map.json.");
    }
  } else {
    pushCheck("structure:handoff-map-nodes", "skip", "handoff-map.json", "handoff-map.json missing; skipped.");
  }

  const previewPath = join(packageDir, "preview.html");
  if (existsSync(previewPath)) {
    const content = readFileSync(previewPath, "utf8");
    pushCheck("structure:preview-nonempty", content.trim().length > 0 ? "pass" : "warning", "preview.html", content.trim().length > 0 ? undefined : "preview.html is empty.");
  } else {
    pushCheck("structure:preview-nonempty", "skip", "preview.html", "preview.html missing; skipped.");
  }

  const designContextPath = join(packageDir, "design-context.md");
  if (existsSync(designContextPath)) {
    const content = readFileSync(designContextPath, "utf8");
    pushCheck("structure:design-context-nonempty", content.trim().length > 0 ? "pass" : "warning", "design-context.md", content.trim().length > 0 ? undefined : "design-context.md is empty.");
  } else {
    pushCheck("structure:design-context-nonempty", "skip", "design-context.md", "design-context.md missing; skipped.");
  }

  const assetsMap = readJson(join(packageDir, "assets-map.json")) as unknown;
  if (isObject(assetsMap) && typeof assetsMap.screenshot === "string" && assetsMap.screenshot.length > 0) {
    const screenshotPath = join(packageDir, assetsMap.screenshot);
    pushCheck("structure:screenshot-exists", existsSync(screenshotPath) ? "pass" : "warning", assetsMap.screenshot as string, existsSync(screenshotPath) ? undefined : "screenshot referenced in assets-map.json does not exist.");
  } else {
    pushCheck("structure:screenshot-exists", "warning", "assets-map.json", "screenshot not referenced or empty in assets-map.json.");
  }

  // §7.4 handoffId 贯通校验
  if (mapHandoffIds.size === 0 && !mapHasNodes) {
    pushCheck("consistency:handoff-map-linkage", "skip", undefined, "handoff-map.json missing; cross-reference skipped.");
  } else {
    const layerNotInMap = [...layerIds].filter((id) => !mapHandoffIds.has(id));
    pushCheck("consistency:layer-to-map", layerNotInMap.length === 0 ? "pass" : "warning", "layer-tree.json", layerNotInMap.length === 0 ? undefined : `${layerNotInMap.length} layer handoffId(s) not found in handoff-map.json.`);
    const cmpNotInMap = [...componentHandoffIds].filter((id) => !mapHandoffIds.has(id));
    pushCheck("consistency:component-to-map", cmpNotInMap.length === 0 ? "pass" : "warning", "components.json", cmpNotInMap.length === 0 ? undefined : `${cmpNotInMap.length} component handoffId(s) not found in handoff-map.json.`);
  }

  if (existsSync(previewPath)) {
    const content = readFileSync(previewPath, "utf8");
    pushCheck("consistency:preview-data-handoff-id", content.includes("data-handoff-id") ? "pass" : "warning", "preview.html", content.includes("data-handoff-id") ? undefined : "preview.html has no data-handoff-id attributes.");
  } else {
    pushCheck("consistency:preview-data-handoff-id", "skip", "preview.html", "preview.html missing; skipped.");
  }

  const warnings: HandoffValidationIssue[] = [...base.warnings];
  for (const check of checks) {
    if (check.status === "warning" && check.message) {
      warnings.push({ file: check.file, message: `[${check.rule}] ${check.message}` });
    }
  }

  return finalize({ ...base, warnings }, checks);
}

const REQUIRED_JSON_FILES = [
  "meta.json",
  "layer-tree.json",
  "texts.json",
  "styles.json",
  "tokens.json",
  "components.json",
  "assets-map.json",
] as const;

function finalize(
  base: HandoffValidationResult,
  checks: DetailedCheck[],
): HandoffDetailedValidationResult {
  return {
    ...base,
    summary: {
      totalChecks: checks.length,
      passed: checks.filter((c) => c.status === "pass").length,
      errors: checks.filter((c) => c.status === "error").length,
      warnings: checks.filter((c) => c.status === "warning").length,
      skipped: checks.filter((c) => c.status === "skip").length,
    },
    checks,
  };
}


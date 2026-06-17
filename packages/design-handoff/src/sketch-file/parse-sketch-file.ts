import { basename, dirname, join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { unzipSketchFile, checkVersionCompatibility } from "./unzip";
import { SketchLayer } from "./types";
import { convertLayer, collectTexts } from "./convert-layer";
import { createStyleRegistry, convertColor } from "./convert-style";
import { generateAgentPrompt } from "../prompt";
import {
  HandoffPackage,
  HandoffMeta,
  HandoffStyleMap,
  HandoffTokenMap,
  HandoffTextNode,
  HandoffComponent,
  HandoffLayerNode,
} from "../schema";

export interface ParseSketchFileOptions {
  sketchFilePath: string;
  outputDir?: string;
  artboardName?: string;
  pageIndex?: number;
}

export interface ParseSketchFileResult {
  handoff: HandoffPackage;
  outputDir: string | null;
  warnings: string[];
}

export interface ParseSketchFileAllArtboardsOptions {
  sketchFilePath: string;
  outputRoot: string;
  pageIndex?: number;
}

export interface ParseSketchFileAllArtboardsResult {
  results: ParseSketchFileResult[];
  outputRoot: string;
  pageName: string;
  totalArtboards: number;
  warnings: string[];
}

/**
 * 清理文件名，移除非法字符
 */
function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/[（）()]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unnamed"
  );
}

/**
 * 解析 .sketch 文件并转换为 HandoffPackage 格式
 */
export async function parseSketchFile(options: ParseSketchFileOptions): Promise<ParseSketchFileResult> {
  const { sketchFilePath, outputDir, artboardName, pageIndex = 0 } = options;

  // 1. 解压 .sketch 文件
  const unzipped = await unzipSketchFile(sketchFilePath);

  // 2. 检查版本兼容性
  const versionCheck = checkVersionCompatibility(unzipped.meta);
  const warnings: string[] = [...versionCheck.warnings];

  // 3. 获取页面列表
  const pageEntries = Array.from(unzipped.pages.entries());
  if (pageEntries.length === 0) {
    throw new Error("No pages found in .sketch file");
  }

  // 4. 选择要解析的页面
  const targetPageIndex = Math.min(pageIndex, pageEntries.length - 1);
  const [pageId, page] = pageEntries[targetPageIndex];

  // 5. 选择要解析的画板
  let targetArtboard: SketchLayer | null = null;
  const artboards = (page.layers || []).filter(layer => layer._class === "artboard");

  if (artboardName) {
    targetArtboard = artboards.find(layer => layer.name === artboardName) || null;
    if (!targetArtboard) {
      throw new Error(`Artboard "${artboardName}" not found in page "${page.name}"`);
    }
  } else {
    targetArtboard = artboards[0] || null;
    if (!targetArtboard) {
      throw new Error(`No artboards found in page "${page.name}"`);
    }
  }

  // 6. 创建样式注册表
  const styleRegistry = createStyleRegistry();

  // 7. 转换图层树
  const layerTree = convertLayer(targetArtboard, styleRegistry);
  if (!layerTree) {
    throw new Error("Artboard has no exportable layers");
  }

  // 8. 收集文本
  const texts = collectTexts(targetArtboard);

  // 9. 提取样式和 Token
  const styles = styleRegistry.styles;
  const tokens = extractTokens(styles, texts);

  // 10. 推断组件
  const components = inferComponents(layerTree);

  // 11. 构建 HandoffPackage
  const documentName = basename(sketchFilePath, ".sketch");
  const handoff: HandoffPackage = {
    packageDir: outputDir || dirname(sketchFilePath),
    meta: {
      pluginVersion: "0.0.0",
      documentName,
      documentPath: sketchFilePath,
      pageName: page.name || "",
      artboardName: targetArtboard.name || "",
      exportedAt: new Date().toISOString(),
      platform: "sketch",
    },
    layerTree,
    texts,
    styles,
    tokens,
    components,
    assetsMap: {
      screenshot: null,
      assets: [],
      warnings,
    },
    agentPrompt: "",
    screenshotPath: null,
  };

  // 12. 生成 Agent 提示词（使用共享函数）
  handoff.agentPrompt = generateAgentPrompt(handoff);

  // 12. 写入文件（如果指定了输出目录）
  if (outputDir) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "meta.json"), JSON.stringify(handoff.meta, null, 2));
    writeFileSync(join(outputDir, "layer-tree.json"), JSON.stringify(handoff.layerTree, null, 2));
    writeFileSync(join(outputDir, "texts.json"), JSON.stringify(handoff.texts, null, 2));
    writeFileSync(join(outputDir, "styles.json"), JSON.stringify(handoff.styles, null, 2));
    writeFileSync(join(outputDir, "tokens.json"), JSON.stringify(handoff.tokens, null, 2));
    writeFileSync(join(outputDir, "components.json"), JSON.stringify(handoff.components, null, 2));
    writeFileSync(join(outputDir, "assets-map.json"), JSON.stringify(handoff.assetsMap, null, 2));
    writeFileSync(join(outputDir, "agent-prompt.md"), handoff.agentPrompt);
  }

  return {
    handoff,
    outputDir: outputDir || null,
    warnings,
  };
}

/**
 * 提取 Token
 */
function extractTokens(
  styles: HandoffStyleMap,
  texts: Array<{ color: string | null; fontSize: number | null }>
): HandoffTokenMap {
  const colors: string[] = [];
  const fontSizes: number[] = [];
  const radii: number[] = [];

  function pushUnique<T>(values: T[], value: T | null | undefined): void {
    if (value !== null && value !== undefined && !values.includes(value)) {
      values.push(value);
    }
  }

  for (const style of Object.values(styles)) {
    for (const color of style.fills) {
      pushUnique(colors, color);
    }
    for (const color of style.borders) {
      pushUnique(colors, color);
    }
    if (style.radius !== null) {
      pushUnique(radii, style.radius);
    }
    if (style.fontSize !== null) {
      pushUnique(fontSizes, style.fontSize);
    }
  }

  for (const text of texts) {
    pushUnique(colors, text.color);
    pushUnique(fontSizes, text.fontSize);
  }

  return {
    colors: colors.reduce((result, color, index) => {
      result[`color_${String(index + 1).padStart(3, "0")}`] = color;
      return result;
    }, {} as Record<string, string>),
    fontSize: fontSizes.reduce((result, size, index) => {
      result[`font_size_${String(index + 1).padStart(3, "0")}`] = size;
      return result;
    }, {} as Record<string, number>),
    radius: radii.reduce((result, radius, index) => {
      result[`radius_${String(index + 1).padStart(3, "0")}`] = radius;
      return result;
    }, {} as Record<string, number>),
  };
}

/**
 * 推断组件
 */
function inferComponents(layerTree: HandoffLayerNode): HandoffComponent[] {
  const components: HandoffComponent[] = [];
  let count = 0;

  const RULES = [
    { type: "button" as const, confidence: 0.88, patterns: [/button/i, /\bbtn\b/i, /按钮/] },
    { type: "input" as const, confidence: 0.84, patterns: [/input/i, /search/i, /输入框/] },
    { type: "table" as const, confidence: 0.86, patterns: [/table/i, /表格/] },
    { type: "card" as const, confidence: 0.82, patterns: [/card/i, /卡片/] },
    { type: "modal" as const, confidence: 0.84, patterns: [/dialog/i, /modal/i, /弹窗/] },
    { type: "drawer" as const, confidence: 0.84, patterns: [/drawer/i, /抽屉/] },
  ];

  function collectNodeText(node: HandoffLayerNode): string | null {
    if (node.text) return node.text;
    for (const child of node.children) {
      const text = collectNodeText(child);
      if (text) return text;
    }
    return null;
  }

  function visit(node: HandoffLayerNode): void {
    const target = [node.name || "", node.text || ""].join(" ");

    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(target)) {
          count++;
          components.push({
            id: `cmp_${String(count).padStart(3, "0")}`,
            name: node.name,
            inferredType: rule.type,
            confidence: rule.confidence,
            frame: node.frame,
            text: collectNodeText(node),
          });
          break;
        }
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(layerTree);
  return components;
}

/**
 * 解析 .sketch 文件中指定页面的所有画板
 */
export async function parseSketchFileAllArtboards(
  options: ParseSketchFileAllArtboardsOptions
): Promise<ParseSketchFileAllArtboardsResult> {
  const { sketchFilePath, outputRoot, pageIndex = 0 } = options;

  // 1. 解压 .sketch 文件
  const unzipped = await unzipSketchFile(sketchFilePath);

  // 2. 检查版本兼容性
  const versionCheck = checkVersionCompatibility(unzipped.meta);
  const allWarnings: string[] = [...versionCheck.warnings];

  // 3. 获取页面列表
  const pageEntries = Array.from(unzipped.pages.entries());
  if (pageEntries.length === 0) {
    throw new Error("No pages found in .sketch file");
  }

  // 4. 选择要解析的页面
  const targetPageIndex = Math.min(pageIndex, pageEntries.length - 1);
  const [pageId, page] = pageEntries[targetPageIndex];

  // 5. 获取所有画板
  const artboards = (page.layers || []).filter((layer) => layer._class === "artboard");
  if (artboards.length === 0) {
    throw new Error(`No artboards found in page "${page.name}"`);
  }

  // 6. 解析每个画板
  const results: ParseSketchFileResult[] = [];

  for (const artboard of artboards) {
    const artboardOutputDir = join(outputRoot, sanitizeFilename(artboard.name));

    try {
      const result = await parseSketchFile({
        sketchFilePath,
        outputDir: artboardOutputDir,
        artboardName: artboard.name,
        pageIndex,
      });
      results.push(result);
      allWarnings.push(...result.warnings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      allWarnings.push(`Failed to parse artboard "${artboard.name}": ${errorMessage}`);
    }
  }

  return {
    results,
    outputRoot,
    pageName: page.name || "",
    totalArtboards: artboards.length,
    warnings: [...new Set(allWarnings)], // 去重
  };
}

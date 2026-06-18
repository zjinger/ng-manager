// 纯函数资源分类模块：不依赖 Sketch / CocoaScript 运行时，可在 Node 中直接 require 测试。
// 设计目标见 docs/design-handoff/plan/phase1_refactor.md 任务 1。
// 该模块不 require 任何本地模块，保证 Node 测试与 Sketch 运行时行为一致。

import type { AssetType, RectDto } from "../types/runtime";

// 图标 / 小矢量尺寸阈值（px）。小于等于该值视为“小尺寸矢量图标”，
// 用于把装饰性大形状排除在 icon/vector 之外。
export const SMALL_VECTOR_MAX: number = 128;

let ICON_RE: RegExp = /\bicon\b|图标|\bic[-_/]|svg/i;
let LOGO_RE: RegExp = /\blogo\b|品牌标|商标/i;

export function getFrame(layer: SketchLayerLike | undefined): RectDto {
  let frame = layer && layer.frame ? layer.frame : {};
  return {
    x: Number(frame.x) || 0,
    y: Number(frame.y) || 0,
    width: Number(frame.width) || 0,
    height: Number(frame.height) || 0,
  };
}

function lowerName(layer: SketchLayerLike | undefined): string {
  return String((layer && layer.name) || "").toLowerCase();
}

export function hasExportFormats(layer: SketchLayerLike | undefined): boolean {
  return !!(layer && layer.exportFormats && layer.exportFormats.length > 0);
}

export function isSmallSize(frame: RectDto): boolean {
  return (
    frame.width > 0 &&
    frame.height > 0 &&
    frame.width <= SMALL_VECTOR_MAX &&
    frame.height <= SMALL_VECTOR_MAX
  );
}

// 判断 Group 内部是否主要由矢量形状组成（ShapePath / Shape / Vector 占多数）。
export function isMostlyShapePath(layer: SketchLayerLike | undefined): boolean {
  if (!layer || !layer.layers || layer.layers.length === 0) {
    return false;
  }
  let total: number = 0;
  let shape: number = 0;
  (layer.layers || []).forEach(function (child) {
    total += 1;
    if (child.type === "ShapePath" || child.type === "Shape" || child.type === "Vector") {
      shape += 1;
    }
  });
  return total > 0 && shape / total >= 0.5;
}

export interface AssetClassificationDto {
  type: AssetType;
  sourceLayerType: string;
  exportable: boolean;
}

// 资源分类主入口。
// 入参 layer 为 Sketch 原始图层对象（含 type / name / frame / layers / exportFormats）。
// 返回 { type, sourceLayerType, exportable } 或 null（不作为资源导出）。
//
// 分类优先级（与计划文档规则 1-7 对齐）：
//   1. Slice -> slice
//   2. Image / Bitmap -> bitmap
//   3. 命名命中 logo -> logo（优先于 icon，便于品牌标专项处理）
//   4. 命名命中 icon / 图标 / svg -> icon
//   5. SymbolInstance / SymbolMaster -> symbol（命中 icon/logo 命名则细化为 icon/logo）
//   6. Group 小尺寸 + 内部主要 ShapePath -> icon
//   7. ShapePath / Shape / Vector 小尺寸 -> vector
//   8. 有 exportFormats 但未命中上述 -> misc（仅显式可导出层才当资源，避免噪声）
export function classifyAsset(layer: SketchLayerLike | undefined): AssetClassificationDto | null {
  if (!layer) {
    return null;
  }
  let type = layer.type || "Unknown";
  let sourceLayerType: string = type;
  let name = lowerName(layer);
  let frame = getFrame(layer);
  let exportable = hasExportFormats(layer);

  // 规则 1
  if (type === "Slice") {
    return { type: "slice", sourceLayerType, exportable };
  }
  // 规则 2
  if (type === "Image" || type === "Bitmap") {
    return { type: "bitmap", sourceLayerType, exportable };
  }

  // 命名优先（规则 3/4）：logo 优先于 icon，便于 preview 优先用图。
  if (LOGO_RE.test(name)) {
    return { type: "logo", sourceLayerType, exportable };
  }
  if (ICON_RE.test(name)) {
    return { type: "icon", sourceLayerType, exportable };
  }

  // 规则 5：SymbolInstance / SymbolMaster
  if (type === "SymbolInstance" || type === "SymbolMaster") {
    return { type: "symbol", sourceLayerType, exportable };
  }

  // 规则 6：Group 小尺寸 + 内部主要 ShapePath → icon
  if (type === "Group" && isSmallSize(frame) && isMostlyShapePath(layer)) {
    return { type: "icon", sourceLayerType, exportable };
  }

  // 规则 7：ShapePath / Shape / Vector 小尺寸 → vector
  if (
    (type === "ShapePath" || type === "Shape" || type === "Vector") &&
    isSmallSize(frame)
  ) {
    return { type: "vector", sourceLayerType, exportable };
  }

  // 规则 8：显式可导出层返回 exportable（目录仍落到 misc）。
  if (exportable) {
    return { type: "exportable", sourceLayerType, exportable: true };
  }

  return null;
}

// 导出格式策略（任务 2）：
// - icon / vector / logo 优先 svg，svg 失败再 fallback png
// - bitmap / image / slice / symbol / misc 默认 png
export function preferSvg(type: AssetType): boolean {
  return type === "icon" || type === "vector" || type === "logo";
}

// 根据 Asset 类型决定 Handoff Package 中的子目录（architecture-plan-v2 第 7.3 节）。
// bitmap / image -> images, slice -> slices, icon / logo -> icons,
// symbol -> symbols, vector -> vectors, misc / exportable -> misc。
export function assetTypeDirectory(type: AssetType): string {
  let map: Record<string, string> = {
    bitmap: "images",
    image: "images",
    slice: "slices",
    icon: "icons",
    logo: "icons",
    symbol: "symbols",
    vector: "vectors",
    exportable: "misc",
    misc: "misc",
  };
  return map[type] || "misc";
}

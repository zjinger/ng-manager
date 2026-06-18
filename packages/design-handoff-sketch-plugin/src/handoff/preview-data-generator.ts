// 生成 preview-data.json，提供 Preview Render Model（architecture-plan-v2 第 8.3 节）。
// 该模型不直接复用 layer-tree，而是提取 preview 需要的可见节点、组件、资源引用，
// 便于 preview.js 独立渲染图层树、Inspect 面板与资源面板。

import type { AssetRecordDto, AssetsMapDto, HandoffLayerNodeDto, RectDto } from "../types/runtime";

type StyleMap = Record<string, any>;

interface PreviewAssetRefDto {
  id: string;
  name: string;
  layerId: string;
  handoffId: string | null;
  type: string;
  format: string | null;
  path: string | null;
  width: number;
  height: number;
  exportStatus: string;
  warnings: string[];
}

interface ComponentLike {
  id: string;
  handoffId: string;
  layerId: string;
  name: string;
  inferredType: string;
  confidence: number;
  frame: RectDto;
  absoluteFrame?: RectDto;
  text?: string | null;
  textList?: string[];
  layerIds?: string[];
  implementationHint?: unknown;
}

interface MetaLike {
  documentName?: string;
  pageName?: string;
  artboardName?: string;
  pluginVersion?: string;
  exportedAt?: string;
}

interface PreviewNodeDto {
  id: string;
  handoffId: string;
  layerId: string;
  parentId: string | null;
  artboardId: string | null;
  name: string;
  type: string;
  role: string | null;
  frame: RectDto;
  absoluteFrame: RectDto;
  zIndex: number;
  visible: boolean;
  text: string | null;
  style: any;
  assetRef: { id: string; type: string; format: string | null; path: string } | null;
  children: PreviewNodeDto[];
  renderStrategy: string;
  inspect: Record<string, unknown>;
}

function getFrame(node: HandoffLayerNodeDto): RectDto {
  return node && (node.absoluteFrame || node.frame) ? node.absoluteFrame || node.frame : { x: 0, y: 0, width: 0, height: 0 };
}

function getStyleRef(node: HandoffLayerNodeDto, styleMap: StyleMap): any {
  if (!node || !node.styleRef || !styleMap) {
    return null;
  }
  return styleMap[node.styleRef] || null;
}

function inferRenderStrategy(node: HandoffLayerNodeDto | null | undefined, asset: AssetRecordDto | null): string {
  if (!node) {
    return "ignore";
  }
  if (node.hidden) {
    return "ignore";
  }
  if (asset && asset.path) {
    return "image";
  }
  if (node.type === "Text") {
    return "text";
  }
  if (node.type === "Artboard") {
    return "artboard";
  }
  if (node.type === "Shape" || node.type === "ShapePath") {
    return "shape";
  }
  if (node.type === "Group" || node.type === "SymbolInstance") {
    return "group";
  }
  return "dom";
}

function buildCssSnippet(node: HandoffLayerNodeDto, style: any): string[] {
  const frame = getFrame(node);
  const lines: string[] = [];
  lines.push("width: " + (frame.width || 0) + "px;");
  lines.push("height: " + (frame.height || 0) + "px;");
  if (style && style.textColor) lines.push("color: " + style.textColor + ";");
  if (style && style.fontSize) lines.push("font-size: " + style.fontSize + "px;");
  if (style && style.fontFamily) lines.push("font-family: " + JSON.stringify(style.fontFamily) + ";");
  if (style && style.textAlign) lines.push("text-align: " + style.textAlign + ";");
  if (style && style.letterSpacing != null) lines.push("letter-spacing: " + style.letterSpacing + "px;");
  if (style && style.lineHeight != null && typeof style.lineHeight === "number") lines.push("line-height: " + style.lineHeight + "px;");
  if (style && style.radius != null) lines.push("border-radius: " + style.radius + "px;");
  const fill = style && style.fills && style.fills.length ? style.fills[style.fills.length - 1] : null;
  if (fill && fill.color) lines.push("background: " + fill.color + ";");
  const border = style && style.borders && style.borders.length ? style.borders[style.borders.length - 1] : null;
  if (border && border.color) lines.push("border: " + (border.thickness || 1) + "px solid " + border.color + ";");
  if (style && style.opacity != null && style.opacity !== 1) lines.push("opacity: " + style.opacity + ";");
  if (style && style.rotation != null) lines.push("transform: rotate(" + style.rotation + "deg);");
  return lines;
}

function buildInspect(node: HandoffLayerNodeDto, styleMap: StyleMap, asset: AssetRecordDto | null): Record<string, unknown> {
  const style = getStyleRef(node, styleMap);
  const inspect = {
    layerType: node.type,
    role: node.role || null,
    styleRef: node.styleRef || null,
    text: node.text || null,
    opacity: style && style.opacity != null ? style.opacity : null,
    fills: style && style.fills ? style.fills : [],
    borders: style && style.borders ? style.borders : [],
    shadows: style && style.shadows ? style.shadows : [],
    radius: style && style.radius != null ? style.radius : null,
    rotation: style && style.rotation != null ? style.rotation : null,
    fontFamily: style && style.fontFamily ? style.fontFamily : null,
    fontSize: style && style.fontSize ? style.fontSize : null,
    fontWeight: style && style.fontWeight ? style.fontWeight : null,
    textColor: style && style.textColor ? style.textColor : null,
    textAlign: style && style.textAlign ? style.textAlign : null,
    letterSpacing: style && style.letterSpacing != null ? style.letterSpacing : null,
    lineHeight: style && style.lineHeight != null ? style.lineHeight : null,
    css: style && style.css ? style.css : [],
    cssSnippet: buildCssSnippet(node, style),
    assetType: asset ? asset.type : null,
    assetFormat: asset ? asset.format : null,
    assetPath: asset && asset.path ? asset.path : null,
  };
  return inspect;
}

function buildPreviewNode(
  node: HandoffLayerNodeDto,
  styleMap: StyleMap,
  assetsByLayerId: Record<string, AssetRecordDto>,
  parentId: string | null,
  artboardId: string | null,
): PreviewNodeDto | null {
  if (!node || node.hidden) {
    return null;
  }
  const asset = node.layerId || node.id ? assetsByLayerId[String(node.layerId || node.id || "")] || null : null;
  const strategy = inferRenderStrategy(node, asset);
  if (strategy === "ignore") {
    return null;
  }

  const children: PreviewNodeDto[] = [];
  if (node.children && node.children.length > 0) {
    node.children.forEach(function (child: HandoffLayerNodeDto) {
      const childNode = buildPreviewNode(child, styleMap, assetsByLayerId, node.handoffId || node.id, artboardId);
      if (childNode) {
        children.push(childNode);
      }
    });
  }

  return {
    id: node.id,
    handoffId: node.handoffId || node.id,
    layerId: node.id,
    parentId: parentId || null,
    artboardId: artboardId || node.artboardId || null,
    name: node.name || "",
    type: node.type,
    role: node.role || (node.type === "Artboard" ? "artboard" : null),
    frame: getFrame(node),
    absoluteFrame: node.absoluteFrame || getFrame(node),
    zIndex: node.zIndex || 0,
    visible: !node.hidden,
    text: node.text || null,
    style: getStyleRef(node, styleMap),
    assetRef: asset && asset.path ? { id: asset.id, type: asset.type, format: asset.format, path: asset.path } : null,
    children: children,
    renderStrategy: strategy,
    inspect: buildInspect(node, styleMap, asset),
  };
}

function buildAssetRefs(assetsMap: AssetsMapDto): PreviewAssetRefDto[] {
  const refs: PreviewAssetRefDto[] = [];
  (assetsMap && assetsMap.assets || []).forEach(function (asset: AssetRecordDto) {
    refs.push({
      id: asset.id,
      name: asset.name,
      layerId: asset.layerId,
      handoffId: asset.handoffId || null,
      type: asset.type,
      format: asset.format,
      path: asset.path,
      width: asset.width || 0,
      height: asset.height || 0,
      exportStatus: asset.exportStatus || "skipped",
      warnings: asset.warnings || [],
    });
  });
  return refs;
}

function buildComponentPreviews(components: ComponentLike[]) {
  return (components || []).map(function (cmp: ComponentLike) {
    return {
      id: cmp.id,
      handoffId: cmp.handoffId,
      layerId: cmp.layerId,
      name: cmp.name,
      type: cmp.inferredType,
      confidence: cmp.confidence,
      frame: cmp.absoluteFrame || cmp.frame,
      text: cmp.text,
      textList: cmp.textList || [],
      layerIds: cmp.layerIds || [],
      implementationHint: cmp.implementationHint || {},
    };
  });
}

export function generatePreviewData(
  meta: MetaLike,
  layerTree: HandoffLayerNodeDto,
  components: ComponentLike[],
  screenshot: string | null,
  styleMap: StyleMap,
  assetsMap: AssetsMapDto,
) {
  const frame = getFrame(layerTree);
  const assetsByLayerId: Record<string, AssetRecordDto> = {};
  (assetsMap && assetsMap.assets || []).forEach(function (asset: AssetRecordDto) {
    if (asset && asset.layerId) {
      assetsByLayerId[String(asset.layerId)] = asset;
    }
  });

  const root = buildPreviewNode({
    id: layerTree.id,
    handoffId: layerTree.handoffId,
    name: layerTree.name || meta.artboardName || "",
    type: "Artboard",
    role: "artboard",
    frame: layerTree.frame,
    absoluteFrame: layerTree.absoluteFrame || layerTree.frame,
    children: layerTree.children,
    artboardId: layerTree.artboardId,
    parentId: null,
    zIndex: 0,
    visible: true,
    hidden: false,
    locked: false,
  }, styleMap || {}, assetsByLayerId, null, layerTree.artboardId);

  return {
    version: "1.0",
    source: "ngm-ai-handoff",
    exportedAt: meta && meta.exportedAt ? meta.exportedAt : new Date().toISOString(),
    meta: {
      documentName: meta && meta.documentName,
      pageName: meta && meta.pageName,
      artboardName: meta && meta.artboardName,
      pluginVersion: meta && meta.pluginVersion,
    },
    artboard: {
      id: layerTree.id,
      handoffId: layerTree.handoffId,
      name: layerTree.name || meta.artboardName,
      width: frame.width,
      height: frame.height,
      backgroundColor: null,
    },
    screenshot: screenshot || null,
    nodes: root ? root.children : [],
    assets: buildAssetRefs(assetsMap),
    components: buildComponentPreviews(components),
  };
}

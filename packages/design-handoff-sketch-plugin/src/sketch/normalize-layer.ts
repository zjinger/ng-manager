import type { HandoffLayerNodeDto, HandoffTextDto, RectDto } from "../types/runtime";

interface NormalizeLayerContext {
  artboardId?: string | null;
  parentId?: string | null;
  path?: string[];
  parentOrigin?: { x: number; y: number };
}

interface StyleRegistryLike {
  register(layer: SketchLayerLike): string | null;
}

export function getFrame(layer: SketchLayerLike | undefined | null): RectDto {
  let frame = layer && layer.frame ? layer.frame : {};

  return {
    x: Number(frame.x) || 0,
    y: Number(frame.y) || 0,
    width: Number(frame.width) || 0,
    height: Number(frame.height) || 0,
  };
}

export function shouldIgnoreLayer(layer: SketchLayerLike | undefined | null): boolean {
  if (!layer || layer.hidden) {
    return true;
  }

  let name = layer.name || "";
  return name.indexOf("_ignore") === 0 || name.indexOf(".ignore") === 0;
}

function isContainer(layer: SketchLayerLike | undefined | null): boolean | null | undefined {
  return layer && (layer.type === "Group" || layer.type === "Artboard" || layer.type === "SymbolInstance");
}

function getText(layer: SketchLayerLike | undefined | null): string | null {
  if (!layer || layer.type !== "Text") {
    return null;
  }

  return typeof layer.text === "string" ? layer.text : "";
}

export function shortHash(value: unknown): string {
  let str = String(value || "");
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  let hex = hash.toString(16);
  while (hex.length < 8) {
    hex = "0" + hex;
  }
  return hex;
}

export function inferRole(layer: SketchLayerLike): string {
  let type = layer.type;
  let name = String(layer.name || "").toLowerCase();
  if (type === "Artboard") {
    return "artboard";
  }
  if (type === "Text") {
    return "text";
  }
  if (/nav|导航|header|topbar|top-bar|顶栏|页头/.test(name)) {
    return "navigation";
  }
  if (/sidebar|侧边|sidenav|aside/.test(name)) {
    return "sidebar";
  }
  if (/toolbar|工具栏/.test(name)) {
    return "toolbar";
  }
  if (/menu|菜单/.test(name)) {
    return "menu";
  }
  if (/button|\bbtn\b|按钮/.test(name)) {
    return "button";
  }
  if (/input|search|输入框|搜索框/.test(name)) {
    return "input";
  }
  if (/select|下拉|picker/.test(name)) {
    return "select";
  }
  if (/form|表单/.test(name)) {
    return "form";
  }
  if (/table|表格/.test(name)) {
    return "table";
  }
  if (/list|列表/.test(name)) {
    return "list";
  }
  if (/card|卡片/.test(name)) {
    return "card";
  }
  if (/modal|dialog|弹窗/.test(name)) {
    return "modal";
  }
  if (/drawer|抽屉/.test(name)) {
    return "drawer";
  }
  if (/tab|标签页/.test(name)) {
    return "tabs";
  }
  if (/breadcrumb|面包屑/.test(name)) {
    return "breadcrumb";
  }
  if (/chart|图表|graph/.test(name)) {
    return "chart";
  }
  if (type === "Image") {
    return "image";
  }
  return "container";
}

export function normalizeLayer(
  layer: SketchLayerLike,
  styleRegistry?: StyleRegistryLike | null,
  ctx?: NormalizeLayerContext,
): HandoffLayerNodeDto | null {
  if (shouldIgnoreLayer(layer)) {
    return null;
  }

  ctx = ctx || {};
  let isArtboard = layer.type === "Artboard";
  let artboardId: string | null = ctx.artboardId
    ? ctx.artboardId
    : isArtboard
      ? "artboard_" + shortHash(layer.id)
      : null;
  let parentId = ctx.parentId || null;
  let path = ctx.path ? ctx.path.slice() : [];
  let parentOrigin = ctx.parentOrigin || { x: 0, y: 0 };

  let frame = getFrame(layer);
  let isArtboardRoot = isArtboard;
  let childOrigin = isArtboardRoot
    ? { x: 0, y: 0 }
    : { x: parentOrigin.x + frame.x, y: parentOrigin.y + frame.y };
  let absoluteFrame = isArtboardRoot
    ? { x: 0, y: 0, width: frame.width, height: frame.height }
    : { x: parentOrigin.x + frame.x, y: parentOrigin.y + frame.y, width: frame.width, height: frame.height };

  let handoffId = isArtboardRoot
    ? artboardId
    : "layer_" + shortHash(String(layer.id) + ":" + (artboardId || ""));
  handoffId = handoffId || "layer_" + shortHash(String(layer.id || ""));

  let selfPath = path.concat([layer.name || ""]);

  let children: HandoffLayerNodeDto[] = [];
  if (layer.layers && layer.layers.length > 0) {
    let childCtx = {
      artboardId: artboardId,
      parentId: handoffId,
      path: selfPath,
      parentOrigin: childOrigin,
    };
    layer.layers.forEach(function (child: SketchLayerLike) {
      let normalized = normalizeLayer(child, styleRegistry, childCtx);
      if (normalized) {
        children.push(normalized);
      }
    });
  }

  if (isContainer(layer) && layer.type !== "Artboard" && children.length === 0 && !getText(layer)) {
    return null;
  }

  return {
    id: String(layer.id || ""),
    handoffId: handoffId,
    name: layer.name || "",
    type: (layer.type || "Unknown") as HandoffLayerNodeDto["type"],
    frame: frame,
    absoluteFrame: absoluteFrame,
    artboardId: artboardId,
    parentId: parentId,
    path: selfPath,
    hidden: Boolean(layer.hidden),
    visible: !Boolean(layer.hidden),
    locked: Boolean(layer.locked),
    zIndex: 0,
    text: getText(layer),
    styleRef: styleRegistry ? styleRegistry.register(layer) : null,
    role: inferRole(layer),
    domSelector: "[data-handoff-id=\"" + handoffId + "\"]",
    children: children,
  };
}

export function collectTexts(layer: SketchLayerLike): HandoffTextDto[] {
  let texts: HandoffTextDto[] = [];

  function visit(current: SketchLayerLike) {
    if (shouldIgnoreLayer(current)) {
      return;
    }

    if (current.type === "Text") {
      let style = current.style || {};
      let textStyle = style.textStyle || {};
      texts.push({
        id: String(current.id || ""),
        name: current.name || "",
        text: getText(current) || "",
        fontFamily: textStyle.fontFamily || null,
        fontSize: typeof textStyle.fontSize === "number" ? textStyle.fontSize : null,
        fontWeight: textStyle.fontWeight ? String(textStyle.fontWeight) : null,
        color: normalizeColor(textStyle.color || null),
        frame: getFrame(current),
      });
    }

    if (current.layers && current.layers.length > 0) {
      current.layers.forEach(visit);
    }
  }

  visit(layer);
  return texts;
}

export function normalizeColor(color: unknown): string | null {
  if (!color || typeof color !== "string") {
    return null;
  }

  if (color.indexOf("#") !== 0) {
    return color;
  }

  return color.slice(0, 7).toUpperCase();
}

import { SketchLayer, SketchRect } from "./types";
import { HandoffLayerNode, HandoffFrame } from "../schema";

// 类型映射：.sketch 类型 → Handoff 类型
const TYPE_MAP: Record<string, string> = {
  artboard: "Artboard",
  group: "Group",
  text: "Text",
  rectangle: "Rectangle",
  oval: "Oval",
  triangle: "Triangle",
  star: "Star",
  polygon: "Polygon",
  shapePath: "ShapePath",
  shapeGroup: "ShapeGroup",
  symbolInstance: "SymbolInstance",
  symbolMaster: "SymbolMaster",
  bitmap: "Bitmap",
  slice: "Slice",
  hotspot: "Hotspot",
};

/**
 * 转换矩形为 HandoffFrame
 */
export function convertRect(rect: SketchRect): HandoffFrame {
  return {
    x: rect.x || 0,
    y: rect.y || 0,
    width: rect.width || 0,
    height: rect.height || 0,
  };
}

/**
 * 转换图层为 HandoffLayerNode
 */
export function convertLayer(
  layer: SketchLayer,
  styleRegistry: { register: (layer: SketchLayer) => string | null }
): HandoffLayerNode | null {
  // 忽略隐藏图层
  if (!layer.isVisible) {
    return null;
  }

  // 忽略以 _ignore 或 .ignore 开头的图层
  const name = layer.name || "";
  if (name.startsWith("_ignore") || name.startsWith(".ignore")) {
    return null;
  }

  // 转换子图层
  const children: HandoffLayerNode[] = [];
  if (layer.layers) {
    for (const child of layer.layers) {
      const converted = convertLayer(child, styleRegistry);
      if (converted) {
        children.push(converted);
      }
    }
  }

  // 获取文本内容
  const text = layer._class === "text"
    ? layer.attributedString?.string ?? null
    : null;

  // 忽略空的容器（非 Artboard）
  const isContainer = ["group", "symbolInstance", "symbolMaster"].includes(layer._class);
  if (isContainer && layer._class !== "artboard" && children.length === 0 && !text) {
    return null;
  }

  return {
    id: layer.do_objectID || "",
    name: name,
    type: TYPE_MAP[layer._class] || layer._class,
    frame: convertRect(layer.frame),
    hidden: !layer.isVisible,
    locked: layer.isLocked || false,
    text,
    styleRef: styleRegistry.register(layer),
    children,
  };
}

/**
 * 收集文本节点
 */
export function collectTexts(layer: SketchLayer): Array<{
  id: string;
  name: string;
  text: string;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: string | null;
  color: string | null;
  frame: HandoffFrame;
}> {
  const texts: Array<{
    id: string;
    name: string;
    text: string;
    fontFamily: string | null;
    fontSize: number | null;
    fontWeight: string | null;
    color: string | null;
    frame: HandoffFrame;
  }> = [];

  function visit(current: SketchLayer): void {
    if (current._class === "text" && current.attributedString) {
      const style = current.style?.textStyle?.encodedAttributes || {};
      const fontDescriptor = style.MSAttributedStringFontAttribute;
      const color = style.MSAttributedStringColorAttribute;

      texts.push({
        id: current.do_objectID || "",
        name: current.name || "",
        text: current.attributedString.string || "",
        fontFamily: fontDescriptor?.attributes?.name || null,
        fontSize: fontDescriptor?.attributes?.size || null,
        fontWeight: null,
        color: color ? convertColorFromSketch(color) : null,
        frame: convertRect(current.frame),
      });
    }

    if (current.layers) {
      for (const child of current.layers) {
        visit(child);
      }
    }
  }

  visit(layer);
  return texts;
}

/**
 * 从 Sketch 颜色对象转换为 HEX 字符串
 */
function convertColorFromSketch(color: { red: number; green: number; blue: number; alpha: number }): string {
  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);

  if (color.alpha === 1) {
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  return `rgba(${r}, ${g}, ${b}, ${color.alpha.toFixed(2)})`;
}

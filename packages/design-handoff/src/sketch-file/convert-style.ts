import {
  SketchColor,
  SketchStyle,
  SketchLayer,
  SketchShadow,
  SketchFill,
  SketchBorder,
} from "./types";
import { HandoffStyle, HandoffShadow } from "../schema";

/**
 * 将 Sketch 颜色转换为 HEX 格式
 */
export function convertColor(color: SketchColor): string {
  if (!color) {
    return "#000000";
  }

  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);
  const a = color.alpha;

  // 返回 HEX 格式（不含 alpha）
  if (a === 1) {
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  // 返回 RGBA 格式（含 alpha）
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

/**
 * 提取圆角半径
 */
export function extractRadius(layer: SketchLayer): number | null {
  // 检查 cornerRadius 属性
  if (typeof layer.cornerRadius === "number") {
    return layer.cornerRadius;
  }

  // 检查 fixedRadius 属性
  if (typeof layer.fixedRadius === "number") {
    return layer.fixedRadius;
  }

  // 检查 points 属性（形状图层）
  if (layer.points && layer.points.length > 0) {
    const firstPoint = layer.points[0];
    if (typeof firstPoint.cornerRadius === "number") {
      return firstPoint.cornerRadius;
    }
  }

  return null;
}

/**
 * 提取透明度
 */
export function extractOpacity(style: SketchStyle): number {
  if (style.contextSettings && typeof style.contextSettings.opacity === "number") {
    return style.contextSettings.opacity;
  }
  return 1;
}

/**
 * 转换阴影
 */
function convertShadow(shadow: SketchShadow): HandoffShadow | null {
  if (!shadow.isEnabled) {
    return null;
  }

  return {
    type: "shadow",
    color: shadow.color ? convertColor(shadow.color) : "#000000",
    x: shadow.offsetX || 0,
    y: shadow.offsetY || 0,
    blur: shadow.blurRadius || 0,
    spread: shadow.spread || 0,
  };
}

/**
 * 转换填充颜色
 */
function convertFill(fill: SketchFill): string | null {
  if (!fill.isEnabled) {
    return null;
  }
  return fill.color ? convertColor(fill.color) : null;
}

/**
 * 转换边框颜色
 */
function convertBorder(border: SketchBorder): string | null {
  if (!border.isEnabled) {
    return null;
  }
  return border.color ? convertColor(border.color) : null;
}

/**
 * 转换图层样式为 HandoffStyle
 */
export function convertStyle(layer: SketchLayer): HandoffStyle {
  const style = layer.style || {};
  const textStyle = style.textStyle?.encodedAttributes || {};

  // 提取填充颜色
  const fills = (style.fills || [])
    .map(convertFill)
    .filter((color): color is string => color !== null);

  // 提取边框颜色
  const borders = (style.borders || [])
    .map(convertBorder)
    .filter((color): color is string => color !== null);

  // 提取阴影
  const shadows: HandoffShadow[] = (style.shadows || [])
    .map(convertShadow)
    .filter((shadow): shadow is HandoffShadow => shadow !== null);

  // 提取文本样式
  const fontDescriptor = textStyle.MSAttributedStringFontAttribute;
  const fontFamily = fontDescriptor?.attributes?.name || null;
  const fontSize = fontDescriptor?.attributes?.size || null;
  const fontWeight = null; // .sketch 中 fontWeight 需要从 fontName 推断

  return {
    fills,
    borders,
    radius: extractRadius(layer),
    opacity: extractOpacity(style),
    shadows,
    fontFamily,
    fontSize,
    fontWeight,
  };
}

/**
 * 检查样式是否有意义
 */
export function hasMeaningfulStyle(style: HandoffStyle): boolean {
  return (
    style.fills.length > 0 ||
    style.borders.length > 0 ||
    style.radius !== null ||
    style.opacity !== 1 ||
    style.shadows.length > 0 ||
    style.fontFamily !== null ||
    style.fontSize !== null ||
    style.fontWeight !== null
  );
}

/**
 * 创建样式注册表
 */
export function createStyleRegistry() {
  const styles: Record<string, HandoffStyle> = {};
  const keyToId = new Map<string, string>();
  let count = 0;

  return {
    styles,
    register(layer: SketchLayer): string | null {
      const style = convertStyle(layer);
      if (!hasMeaningfulStyle(style)) {
        return null;
      }

      const key = JSON.stringify(style);
      if (!keyToId.has(key)) {
        count++;
        const id = `style_${String(count).padStart(3, "0")}`;
        keyToId.set(key, id);
        styles[id] = style;
      }

      return keyToId.get(key) || null;
    },
  };
}

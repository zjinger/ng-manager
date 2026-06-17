/**
 * .sketch 文件内部的类型定义
 * 基于 @sketch-hq/sketch-file-format 规范
 */

export interface SketchFile {
  meta: SketchMeta;
  document: SketchDocument;
  pages: Map<string, SketchPage>;
  images: Map<string, Buffer>;
}

export interface SketchMeta {
  commit: string;
  pagesAndArtboards: Record<string, {
    name: string;
    artboards: Record<string, { name: string }>;
  }>;
  version: number;
  compatibilityVersion: number;
  app: string;
  autosaved: number;
  variant: string;
  created: {
    commit: string;
    appVersion: string;
    build: number;
    app: string;
    compatibilityVersion: number;
    version: number;
    variant: string;
  };
  saveHistory: string[];
  appVersion: string;
  build: number;
}

export interface SketchDocument {
  _class: "document";
  do_objectID: string;
  assets: SketchAssetCollection;
  colorSpace: number;
  currentPageIndex: number;
  foreignLayerStyles: SketchForeignLayerStyle[];
  foreignSymbols: SketchForeignSymbol[];
  foreignTextStyles: SketchForeignTextStyle[];
  layerStyles: SketchSharedStyleContainer;
  layerTextStyles: SketchSharedStyleContainer;
  layerSymbols: SketchSymbolContainer;
}

export interface SketchAssetCollection {
  _class: "assetCollection";
  colors: SketchColor[];
  gradients: SketchGradient[];
  imageCollection: { _class: "imageCollection"; images: Record<string, unknown> };
  images: unknown[];
}

export interface SketchForeignLayerStyle {
  _class: "foreignLayerStyle";
  do_objectID: string;
  libraryID: string;
  sourceLibraryName: string;
  symbolPrivate: boolean;
  value: SketchStyle;
}

export interface SketchForeignSymbol {
  _class: "foreignSymbol";
  do_objectID: string;
  libraryID: string;
  sourceLibraryName: string;
  symbolMaster: SketchSymbolMaster;
}

export interface SketchForeignTextStyle {
  _class: "foreignTextStyle";
  do_objectID: string;
  libraryID: string;
  sourceLibraryName: string;
  symbolPrivate: boolean;
  value: SketchStyle;
}

export interface SketchSharedStyleContainer {
  _class: "sharedStyleContainer";
  objects: SketchSharedStyle[];
}

export interface SketchSharedStyle {
  _class: "sharedStyle";
  do_objectID: string;
  name: string;
  value: SketchStyle;
}

export interface SketchSymbolContainer {
  _class: "symbolContainer";
  objects: SketchSymbolMaster[];
}

export interface SketchSymbolMaster {
  _class: "symbolMaster";
  do_objectID: string;
  name: string;
  frame: SketchRect;
  style: SketchStyle;
  layers: SketchLayer[];
  symbolID: string;
  changeIdentifier: number;
  allowsOverrides: boolean;
  overrideProperties: unknown[];
  isFlowHome: boolean;
}

export interface SketchPage {
  _class: "page";
  do_objectID: string;
  booleanOperation: number;
  exportOptions: SketchExportOptions;
  frame: SketchRect;
  isFixedToViewport: boolean;
  isFlippedHorizontal: boolean;
  isFlippedVertical: boolean;
  isLocked: boolean;
  isVisible: boolean;
  layerListExpandedType: number;
  name: string;
  nameIsFixed: boolean;
  resizingConstraint: number;
  resizingType: number;
  rotation: number;
  shouldBreakMaskChain: boolean;
  layers: SketchLayer[];
  hasClickThrough: boolean;
  includeInCloudUpload: boolean;
}

export interface SketchLayer {
  _class: string;
  do_objectID: string;
  booleanOperation: number;
  exportOptions: SketchExportOptions;
  frame: SketchRect;
  isFixedToViewport: boolean;
  isFlippedHorizontal: boolean;
  isFlippedVertical: boolean;
  isLocked: boolean;
  isVisible: boolean;
  layerListExpandedType: number;
  name: string;
  nameIsFixed: boolean;
  resizingConstraint: number;
  resizingType: number;
  rotation: number;
  shouldBreakMaskChain: boolean;
  style: SketchStyle;
  layers?: SketchLayer[];
  attributedString?: SketchAttributedString;
  automaticallyDrawOnUnderlyingPath?: boolean;
  dontSynchroniseWithSymbol?: boolean;
  lineSpacingBehaviour?: number;
  textBehaviour?: number;
  glyphBounds?: string;
  points?: SketchCurvePoint[];
  cornerRadius?: number;
  fixedRadius?: number;
  hasConvertedToNewRoundCorners?: boolean;
  isClosed?: boolean;
  pointRadiusBehaviour?: number;
  symbolID?: string;
  overrideProperties?: unknown[];
  overrides?: unknown[];
  isFlowHome?: boolean;
}

export interface SketchRect {
  _class: "rect";
  constrainProportions: boolean;
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface SketchExportOptions {
  _class: "exportOptions";
  includedLayerIds: unknown[];
  layerOptions: number;
  shouldTrim: boolean;
  exportFormats: unknown[];
}

export interface SketchStyle {
  _class: "style";
  do_objectID: string;
  endMarkerType: number;
  miterLimit: number;
  startMarkerType: number;
  windingRule: number;
  blur?: SketchBlur;
  borderOptions?: SketchBorderOptions;
  borders?: SketchBorder[];
  colorControls?: SketchColorControls;
  contextSettings?: SketchGraphicsContextSettings;
  fills?: SketchFill[];
  innerShadows?: SketchInnerShadow[];
  shadows?: SketchShadow[];
  textStyle?: SketchTextStyle;
}

export interface SketchBlur {
  _class: "blur";
  isEnabled: boolean;
  center: string;
  motionAngle: number;
  radius: number;
  saturation: number;
  type: number;
}

export interface SketchBorderOptions {
  _class: "borderOptions";
  dashPattern: unknown[];
  isEnabled: boolean;
  lineCapStyle: number;
  lineJoinStyle: number;
}

export interface SketchBorder {
  _class: "border";
  isEnabled: boolean;
  color: SketchColor;
  fillType: number;
  position: number;
  thickness: number;
  contextSettings: SketchGraphicsContextSettings;
  gradient: SketchGradient;
}

export interface SketchFill {
  _class: "fill";
  isEnabled: boolean;
  color: SketchColor;
  fillType: number;
  noiseIndex: number;
  noiseIntensity: number;
  patternFillType: number;
  patternTileScale: number;
  contextSettings: SketchGraphicsContextSettings;
  gradient: SketchGradient;
  image: unknown;
}

export interface SketchShadow {
  _class: "shadow";
  isEnabled: boolean;
  blurRadius: number;
  color: SketchColor;
  contextSettings: SketchGraphicsContextSettings;
  offsetX: number;
  offsetY: number;
  spread: number;
}

export interface SketchInnerShadow {
  _class: "innerShadow";
  isEnabled: boolean;
  blurRadius: number;
  color: SketchColor;
  contextSettings: SketchGraphicsContextSettings;
  offsetX: number;
  offsetY: number;
  spread: number;
}

export interface SketchColor {
  _class: "color";
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

export interface SketchGradient {
  _class: "gradient";
  gradientType: number;
  stops: SketchGradientStop[];
  from: string;
  to: string;
  ellipticalLength: number;
}

export interface SketchGradientStop {
  _class: "gradientStop";
  color: SketchColor;
  position: number;
}

export interface SketchColorControls {
  _class: "colorControls";
  isEnabled: boolean;
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
}

export interface SketchGraphicsContextSettings {
  _class: "graphicsContextSettings";
  blendMode: number;
  opacity: number;
}

export interface SketchTextStyle {
  _class: "textStyle";
  encodedAttributes: SketchEncodedAttributes;
  verticalAlignment: number;
}

export interface SketchEncodedAttributes {
  paragraphStyle?: SketchParagraphStyle;
  MSAttributedStringFontAttribute?: SketchFontDescriptor;
  MSAttributedStringColorAttribute?: SketchColor;
  MSAttributedStringTextTransformAttribute?: number;
  underlineStyle?: number;
  strikethroughStyle?: number;
  kerning?: number;
  textStyleVerticalAlignmentKey?: number;
}

export interface SketchParagraphStyle {
  _class: "paragraphStyle";
  alignment: number;
  allowsDefaultTighteningForTruncation: number;
  maximumLineHeight: number;
  minimumLineHeight: number;
  lineSpacing: number;
  paragraphSpacing: number;
  paragraphSpacingBefore: number;
  headIndent: number;
  tailIndent: number;
  firstLineHeadIndent: number;
  lineHeightMultiple: number;
  maximumLineHeightRule: number;
  lineBreakMode: number;
}

export interface SketchFontDescriptor {
  _class: "fontDescriptor";
  attributes: SketchFontDescriptorAttributes;
}

export interface SketchFontDescriptorAttributes {
  name: string;
  size: number;
  variation?: Record<string, number>;
}

export interface SketchAttributedString {
  _class: "attributedString";
  string: string;
  attributes: SketchStringAttribute[];
}

export interface SketchStringAttribute {
  _class: "stringAttribute";
  location: number;
  length: number;
  attributes: SketchStringAttributeAttributes;
}

export interface SketchStringAttributeAttributes {
  MSAttributedStringFontAttribute?: SketchFontDescriptor;
  MSAttributedStringColorAttribute?: SketchColor;
  paragraphStyle?: SketchParagraphStyle;
  kerning?: number;
  textStyleVerticalAlignmentKey?: number;
  underlineStyle?: number;
  strikethroughStyle?: number;
}

export interface SketchCurvePoint {
  _class: "curvePoint";
  cornerRadius: number;
  curveFrom: string;
  curveMode: number;
  curveTo: string;
  hasCurveFrom: boolean;
  hasCurveTo: boolean;
  point: string;
}

/**
 * 版本兼容性检查结果
 */
export interface VersionCompatibility {
  supported: boolean;
  documentVersion: number;
  appVersion: string;
  warnings: string[];
  unsupportedFeatures: string[];
}

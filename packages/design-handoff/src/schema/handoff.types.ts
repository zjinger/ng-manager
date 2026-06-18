export interface HandoffFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandoffMeta {
  pluginVersion: string;
  handoffSpecVersion?: string;
  documentName: string;
  documentPath: string | null;
  pageName: string;
  artboardName: string;
  exportedAt: string;
  platform: "sketch";
}

export type HandoffLayerRole =
  | "page"
  | "artboard"
  | "navigation"
  | "sidebar"
  | "toolbar"
  | "menu"
  | "button"
  | "input"
  | "select"
  | "form"
  | "table"
  | "list"
  | "card"
  | "modal"
  | "drawer"
  | "tabs"
  | "breadcrumb"
  | "chart"
  | "text"
  | "image"
  | "icon"
  | "container"
  | "unknown";

export interface HandoffLayerNode {
  id: string;
  handoffId?: string;
  name: string;
  type: string;
  frame: HandoffFrame;
  absoluteFrame?: HandoffFrame;
  artboardId?: string;
  parentId?: string | null;
  path?: string[];
  hidden: boolean;
  locked: boolean;
  text: string | null;
  styleRef?: string | null;
  role?: HandoffLayerRole;
  domSelector?: string;
  children: HandoffLayerNode[];
}

export interface HandoffTextNode {
  id: string;
  name: string;
  text: string;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: string | null;
  color: string | null;
  frame: HandoffFrame;
}

export interface HandoffShadow {
  type: string;
  color: string | null;
  x: number;
  y: number;
  blur: number;
  spread: number;
}

export interface HandoffStyle {
  fills: string[];
  borders: string[];
  radius: number | null;
  opacity: number;
  shadows: HandoffShadow[];
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: string | null;
}

export type HandoffStyleMap = Record<string, HandoffStyle>;

export interface HandoffTokenMap {
  colors: Record<string, string>;
  fontSize: Record<string, number>;
  radius: Record<string, number>;
}

export type HandoffComponentType =
  | "page"
  | "navigation"
  | "sidebar"
  | "toolbar"
  | "menu"
  | "button"
  | "input"
  | "select"
  | "form"
  | "table"
  | "list"
  | "card"
  | "modal"
  | "drawer"
  | "tabs"
  | "breadcrumb"
  | "chart"
  | "unknown";

export interface HandoffComponentImplementationHint {
  angularComponentName?: string;
  suggestedInputs?: string[];
  suggestedOutputs?: string[];
  notes?: string[];
}

export interface HandoffComponent {
  id: string;
  layerId?: string;
  handoffId?: string;
  artboardId?: string;
  name: string;
  inferredType: HandoffComponentType;
  confidence: number;
  frame: HandoffFrame;
  absoluteFrame?: HandoffFrame;
  text: string | null;
  textList?: string[];
  layerIds?: string[];
  domSelector?: string;
  implementationHint?: HandoffComponentImplementationHint;
}

export type HandoffAssetType =
  | "bitmap"
  | "slice"
  | "icon"
  | "sprite"
  | "screenshot"
  | "image";

export interface HandoffAsset {
  id: string;
  name: string;
  layerId: string;
  type: HandoffAssetType;
  path: string;
  frame: HandoffFrame;
  hash?: string;
  usedByLayerIds?: string[];
}

export interface HandoffAssetMap {
  screenshot: string | null;
  assets: HandoffAsset[];
  warnings: string[];
}

export interface HandoffPackage {
  packageDir: string;
  meta: HandoffMeta;
  manifest?: HandoffPackageManifest | null;
  layerTree: HandoffLayerNode;
  texts: HandoffTextNode[];
  styles: HandoffStyleMap;
  tokens: HandoffTokenMap;
  components: HandoffComponent[];
  assetsMap: HandoffAssetMap;
  handoffMap?: HandoffDomMap | null;
  designContext?: string | null;
  previewHtmlPath?: string | null;
  interactionBridgePath?: string | null;
  agentPrompt: string;
  screenshotPath: string | null;
}

export interface HandoffValidationIssue {
  file?: string;
  message: string;
}

export interface HandoffValidationResult {
  ok: boolean;
  packageDir: string;
  errors: HandoffValidationIssue[];
  warnings: HandoffValidationIssue[];
}

export interface HandoffAgentContext {
  source: "ngm-ai-handoff";
  generatedAt: string;
  packageDir: string;
  summary: {
    documentName: string;
    pageName: string;
    artboardName: string;
    textCount: number;
    componentCount: number;
  };
  files: {
    meta: "meta.json";
    layerTree: "layer-tree.json";
    texts: "texts.json";
    styles: "styles.json";
    tokens: "tokens.json";
    components: "components.json";
    assetsMap: "assets-map.json";
    screenshot: string | null;
    prompt: "agent-prompt.md";
  };
  prompt: string;
  handoff: HandoffPackage;
}

export interface HandoffDomMapNode {
  handoffId: string;
  layerId: string;
  componentId?: string;
  artboardId: string;
  type: "artboard" | "layer" | "component" | "asset";
  name: string;
  domSelector: string;
  frame: HandoffFrame;
}

export interface HandoffDomMap {
  version: "1.0";
  source: "ngm-ai-handoff";
  nodes: HandoffDomMapNode[];
}

export interface HandoffPackageManifest {
  specVersion: string;
  handoffSpecVersion?: string;
  meta: "meta.json";
  files: {
    layerTree: "layer-tree.json";
    texts: "texts.json";
    styles: "styles.json";
    tokens: "tokens.json";
    components: "components.json";
    assetsMap: "assets-map.json";
    handoffMap?: "handoff-map.json";
    designContext?: "design-context.md";
    previewHtml?: "preview.html";
    interactionBridge?: "interaction-bridge.js";
    agentPrompt: "agent-prompt.md";
    screenshot?: string | null;
  };
  exportedAt?: string;
}

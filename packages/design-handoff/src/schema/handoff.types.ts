export interface HandoffFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandoffMeta {
  pluginVersion: string;
  documentName: string;
  documentPath: string | null;
  pageName: string;
  artboardName: string;
  exportedAt: string;
  platform: "sketch";
}

export interface HandoffLayerNode {
  id: string;
  name: string;
  type: string;
  frame: HandoffFrame;
  hidden: boolean;
  locked: boolean;
  text: string | null;
  styleRef?: string | null;
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
  | "button"
  | "input"
  | "table"
  | "card"
  | "modal"
  | "drawer";

export interface HandoffComponent {
  id: string;
  name: string;
  inferredType: HandoffComponentType;
  confidence: number;
  frame: HandoffFrame;
  text: string | null;
}

export interface HandoffAsset {
  id: string;
  name: string;
  layerId: string;
  path: string;
  frame: HandoffFrame;
}

export interface HandoffAssetMap {
  screenshot: string | null;
  assets: HandoffAsset[];
  warnings: string[];
}

export interface HandoffPackage {
  packageDir: string;
  meta: HandoffMeta;
  layerTree: HandoffLayerNode;
  texts: HandoffTextNode[];
  styles: HandoffStyleMap;
  tokens: HandoffTokenMap;
  components: HandoffComponent[];
  assetsMap: HandoffAssetMap;
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

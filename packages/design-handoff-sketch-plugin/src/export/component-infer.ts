const normalize = require("../sketch/normalize-layer");

import type { HandoffLayerNodeDto, RectDto } from "../types/runtime";

type ComponentType =
  | "navigation" | "sidebar" | "toolbar" | "menu" | "breadcrumb" | "table" | "tabs"
  | "button" | "input" | "select" | "form" | "list" | "card" | "modal" | "drawer"
  | "chart" | "unknown";

interface ComponentRule {
  type: ComponentType;
  confidence: number;
  patterns: RegExp[];
}

interface InferredComponentDto {
  id: string;
  layerId: string;
  handoffId: string;
  artboardId: string | null;
  name: string;
  inferredType: ComponentType;
  confidence: number;
  frame: RectDto;
  absoluteFrame: RectDto;
  text: string | null;
  textList: string[];
  layerIds: string[];
  domSelector: string;
  implementationHint: {
    angularComponentName: string;
    suggestedInputs: string[];
    suggestedOutputs: string[];
    notes: string[];
  };
}

let RULES: ComponentRule[] = [
  { type: "navigation", confidence: 0.7, patterns: [/nav|导航|header|topbar|顶栏|页头/] },
  { type: "sidebar", confidence: 0.7, patterns: [/sidebar|侧边|sidenav|aside/] },
  { type: "toolbar", confidence: 0.68, patterns: [/toolbar|工具栏/] },
  { type: "menu", confidence: 0.7, patterns: [/menu|菜单/] },
  { type: "breadcrumb", confidence: 0.72, patterns: [/breadcrumb|面包屑/] },
  { type: "table", confidence: 0.86, patterns: [/table|表格/] },
  { type: "tabs", confidence: 0.7, patterns: [/tab|标签页/] },
  { type: "button", confidence: 0.88, patterns: [/button|\bbtn\b|按钮/] },
  { type: "input", confidence: 0.84, patterns: [/input|search|输入框|搜索框/] },
  { type: "select", confidence: 0.82, patterns: [/select|下拉|picker/] },
  { type: "form", confidence: 0.8, patterns: [/form|表单/] },
  { type: "list", confidence: 0.8, patterns: [/list|列表/] },
  { type: "card", confidence: 0.82, patterns: [/card|卡片/] },
  { type: "modal", confidence: 0.84, patterns: [/dialog|modal|弹窗/] },
  { type: "drawer", confidence: 0.84, patterns: [/drawer|抽屉/] },
  { type: "chart", confidence: 0.78, patterns: [/chart|图表|graph/] },
];

let ANGULAR_HINT: Record<ComponentType, { angularComponentName: string; notes: string[] }> = {
  navigation: { angularComponentName: "nz-header / app-header", notes: ["顶部导航建议使用 nz-header 与 nz-menu 组合"] },
  sidebar: { angularComponentName: "nz-layout / nz-sider", notes: ["侧边栏建议使用 nz-sider + nz-menu"] },
  toolbar: { angularComponentName: "nz-button-group / nz-space", notes: ["工具栏建议使用 nz-button 组合"] },
  menu: { angularComponentName: "nz-menu", notes: ["菜单建议使用 NzMenuModule"] },
  breadcrumb: { angularComponentName: "nz-breadcrumb", notes: ["面包屑使用 NzBreadcrumbModule"] },
  tabs: { angularComponentName: "nz-tabs", notes: ["标签页使用 NzTabsModule"] },
  button: { angularComponentName: "button[nz-button]", notes: ["按钮使用 NzButtonModule"] },
  input: { angularComponentName: "input[nz-input]", notes: ["输入框使用 NzInputModule"] },
  select: { angularComponentName: "nz-select", notes: ["下拉选择使用 NzSelectModule"] },
  form: { angularComponentName: "form[nz-form]", notes: ["表单使用 NzFormModule"] },
  table: { angularComponentName: "nz-table", notes: ["表格使用 NzTableModule"] },
  list: { angularComponentName: "nz-list", notes: ["列表使用 NzListModule"] },
  card: { angularComponentName: "nz-card", notes: ["卡片使用 NzCardModule"] },
  modal: { angularComponentName: "nz-modal", notes: ["弹窗使用 NzModalModule"] },
  drawer: { angularComponentName: "nz-drawer", notes: ["抽屉使用 NzDrawerModule"] },
  chart: { angularComponentName: "图表组件", notes: ["图表建议使用 ng2-charts 或自定义 ECharts 组件"] },
  unknown: { angularComponentName: "", notes: ["类型未确定，请人工确认"] },
};

export function inferComponent(node: HandoffLayerNodeDto): { type: ComponentType; confidence: number } | null {
  let target = [node.name || "", node.text || ""].join(" ");

  for (let i = 0; i < RULES.length; i += 1) {
    let rule = RULES[i];
    for (let j = 0; j < rule.patterns.length; j += 1) {
      if (rule.patterns[j].test(target)) {
        return {
          type: rule.type,
          confidence: rule.confidence,
        };
      }
    }
  }

  return null;
}

function collectNodeText(node: HandoffLayerNodeDto): string | null {
  if (node.text) {
    return node.text;
  }

  const children = node.children || [];
  for (let i = 0; i < children.length; i += 1) {
    let text: string | null = collectNodeText(children[i]);
    if (text) {
      return text;
    }
  }

  return null;
}

function collectAllTexts(node: HandoffLayerNodeDto): string[] {
  let texts: string[] = [];
  if (node.text) {
    texts.push(node.text);
  }
  const children = node.children || [];
  for (let i = 0; i < children.length; i += 1) {
    let childTexts: string[] = collectAllTexts(children[i]);
    for (let j = 0; j < childTexts.length; j += 1) {
      texts.push(childTexts[j]);
    }
  }
  return texts;
}

function collectLayerIds(node: HandoffLayerNodeDto): string[] {
  let ids: string[] = [node.id];
  const children = node.children || [];
  for (let i = 0; i < children.length; i += 1) {
    let childIds = collectLayerIds(children[i]);
    for (let j = 0; j < childIds.length; j += 1) {
      ids.push(childIds[j]);
    }
  }
  return ids;
}

function buildImplementationHint(type: ComponentType): InferredComponentDto["implementationHint"] {
  let hint = ANGULAR_HINT[type] || ANGULAR_HINT.unknown;
  return {
    angularComponentName: hint.angularComponentName,
    suggestedInputs: [],
    suggestedOutputs: [],
    notes: hint.notes,
  };
}

export function inferComponents(layerTree: HandoffLayerNodeDto): InferredComponentDto[] {
  let components: InferredComponentDto[] = [];
  let count = 0;

  function pushComponent(node: HandoffLayerNodeDto, type: ComponentType, confidence: number) {
    count += 1;
    let handoffId = "component_" + normalize.shortHash(String(node.id) + ":" + (node.artboardId || ""));
    components.push({
      id: "cmp_" + String(count).padStart(3, "0"),
      layerId: node.id,
      handoffId: handoffId,
      artboardId: node.artboardId || null,
      name: node.name,
      inferredType: type,
      confidence: confidence,
      frame: node.frame,
      absoluteFrame: node.absoluteFrame || node.frame,
      text: collectNodeText(node),
      textList: collectAllTexts(node),
      layerIds: collectLayerIds(node),
      domSelector: node.domSelector || ("[data-handoff-id=\"" + handoffId + "\"]"),
      implementationHint: buildImplementationHint(type),
    });
  }

  function visit(node: HandoffLayerNodeDto) {
    let inferred = inferComponent(node);
    let hasChildren = node.children && node.children.length > 0;
    let isArtboard = node.role === "artboard" || node.type === "Artboard";

    if (inferred) {
      pushComponent(node, inferred.type, inferred.confidence);
    } else if (hasChildren && !isArtboard) {
      pushComponent(node, "unknown", 0.3);
    }

    (node.children || []).forEach(visit);
  }

  visit(layerTree);
  return components;
}

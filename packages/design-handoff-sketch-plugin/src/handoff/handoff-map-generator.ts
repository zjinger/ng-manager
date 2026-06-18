import type { HandoffLayerNodeDto, RectDto } from "../types/runtime";

interface ComponentLike {
  id: string;
  layerId: string;
  handoffId: string;
  artboardId?: string | null;
  name?: string;
  domSelector?: string;
  frame: RectDto;
  absoluteFrame?: RectDto;
}

interface HandoffMapNodeDto {
  handoffId: string;
  layerId: string;
  componentId: string | null;
  artboardId: string | null;
  type: "artboard" | "layer" | "component";
  name: string;
  domSelector: string;
  frame: RectDto;
}

export function buildHandoffMap(layerTree: HandoffLayerNodeDto, components: ComponentLike[]) {
  let nodes: HandoffMapNodeDto[] = [];

  function visitLayer(node: HandoffLayerNodeDto | null | undefined): void {
    if (!node) {
      return;
    }
    let isArtboard = node.role === "artboard" || node.type === "Artboard";
    nodes.push({
      handoffId: node.handoffId || node.id,
      layerId: node.id,
      componentId: null,
      artboardId: node.artboardId || null,
      type: isArtboard ? "artboard" : "layer",
      name: node.name || "",
      domSelector: node.domSelector || ("[data-handoff-id=\"" + (node.handoffId || node.id) + "\"]"),
      frame: node.absoluteFrame || node.frame,
    });
    if (node.children && node.children.length > 0) {
      node.children.forEach(visitLayer);
    }
  }

  visitLayer(layerTree);

  (components || []).forEach(function (cmp: ComponentLike) {
    nodes.push({
      handoffId: cmp.handoffId,
      layerId: cmp.layerId,
      componentId: cmp.id,
      artboardId: cmp.artboardId || null,
      type: "component",
      name: cmp.name || "",
      domSelector: cmp.domSelector || ("[data-handoff-id=\"" + cmp.handoffId + "\"]"),
      frame: cmp.absoluteFrame || cmp.frame,
    });
  });

  return {
    version: "1.0",
    source: "ngm-ai-handoff",
    nodes: nodes,
  };
}

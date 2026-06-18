// @ts-nocheck
function buildHandoffMap(layerTree, components) {
  var nodes = [];

  function visitLayer(node) {
    if (!node) {
      return;
    }
    var isArtboard = node.role === "artboard" || node.type === "Artboard";
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

  (components || []).forEach(function (cmp) {
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

module.exports = {
  buildHandoffMap: buildHandoffMap,
};


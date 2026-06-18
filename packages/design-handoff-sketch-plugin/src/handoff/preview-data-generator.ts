// 生成 preview-data.json，提供 Preview Render Model（architecture-plan-v2 第 8.3 节）。
// 该模型不直接复用 layer-tree，而是提取 preview 需要的可见节点、组件、资源引用，
// 便于 preview.js 独立渲染图层树、Inspect 面板与资源面板。

function getFrame(node) {
  return node && (node.absoluteFrame || node.frame) ? node.absoluteFrame || node.frame : { x: 0, y: 0, width: 0, height: 0 };
}

function getStyleRef(node, styleMap) {
  if (!node || !node.styleRef || !styleMap) {
    return null;
  }
  return styleMap[node.styleRef] || null;
}

function inferRenderStrategy(node, asset) {
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

function buildInspect(node, styleMap, asset) {
  var style = getStyleRef(node, styleMap);
  var inspect = {
    layerType: node.type,
    role: node.role || null,
    styleRef: node.styleRef || null,
    text: node.text || null,
    opacity: style && style.opacity != null ? style.opacity : null,
    fills: style && style.fills ? style.fills : [],
    borders: style && style.borders ? style.borders : [],
    shadows: style && style.shadows ? style.shadows : [],
    radius: style && style.radius != null ? style.radius : null,
    fontFamily: style && style.fontFamily ? style.fontFamily : null,
    fontSize: style && style.fontSize ? style.fontSize : null,
    fontWeight: style && style.fontWeight ? style.fontWeight : null,
    assetType: asset ? asset.type : null,
    assetFormat: asset ? asset.format : null,
    assetPath: asset && asset.path ? asset.path : null,
  };
  return inspect;
}

function buildPreviewNode(node, styleMap, assetsByLayerId, parentId, artboardId) {
  if (!node || node.hidden) {
    return null;
  }
  var asset = node.layerId || node.id ? assetsByLayerId[String(node.layerId || node.id || "")] || null : null;
  var strategy = inferRenderStrategy(node, asset);
  if (strategy === "ignore") {
    return null;
  }

  var children = [];
  if (node.children && node.children.length > 0) {
    node.children.forEach(function (child) {
      var childNode = buildPreviewNode(child, styleMap, assetsByLayerId, node.handoffId || node.id, artboardId);
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

function buildAssetRefs(assetsMap) {
  var refs = [];
  (assetsMap && assetsMap.assets || []).forEach(function (asset) {
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
      exportStatus: asset.exportStatus || "unknown",
      warnings: asset.warnings || [],
    });
  });
  return refs;
}

function buildComponentPreviews(components) {
  return (components || []).map(function (cmp) {
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

function generatePreviewData(meta, layerTree, components, screenshot, styleMap, assetsMap) {
  var frame = getFrame(layerTree);
  var assetsByLayerId = {};
  (assetsMap && assetsMap.assets || []).forEach(function (asset) {
    if (asset && asset.layerId) {
      assetsByLayerId[String(asset.layerId)] = asset;
    }
  });

  var root = buildPreviewNode({
    id: layerTree.id,
    handoffId: layerTree.handoffId,
    name: layerTree.name || meta.artboardName,
    type: "Artboard",
    role: "artboard",
    frame: layerTree.frame,
    absoluteFrame: layerTree.absoluteFrame || layerTree.frame,
    children: layerTree.children,
    artboardId: layerTree.artboardId,
    hidden: false,
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
      backgroundColor: layerTree.backgroundColor || null,
    },
    screenshot: screenshot || null,
    nodes: root ? root.children : [],
    assets: buildAssetRefs(assetsMap),
    components: buildComponentPreviews(components),
  };
}

module.exports = {
  generatePreviewData: generatePreviewData,
};

export {};

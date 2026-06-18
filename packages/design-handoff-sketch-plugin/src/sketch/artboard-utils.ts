// 画板收集与父级画板查找工具。
// 所有函数保持纯函数风格，不直接调用 UI，便于测试与复用。

import type { ArtboardGroup, FlatArtboardEntry, ScopeSelectionDto } from "../export/export-types";

export function isArtboard(layer: SketchLayerLike | undefined | null): layer is SketchLayerLike {
  return Boolean(layer && layer.type === "Artboard");
}

// 向上查找最近的 Artboard 父级，找不到返回 null。
export function findParentArtboard(layer: SketchLayerLike | undefined | null): SketchLayerLike | null {
  let current: SketchLayerLike | null = layer || null;
  while (current) {
    if (current.type === "Artboard") {
      return current;
    }
    current = current.parent || null;
  }
  return null;
}

// 兼容未实现 parent 访问器的图层：递归向上直到 document 层级。
export function findOwningArtboard(layer: SketchLayerLike | undefined | null, document: SketchDocumentLike): SketchLayerLike | null {
  let direct = findParentArtboard(layer);
  if (direct) {
    return direct;
  }

  // 兜底：遍历所有页面的可见 artboard，通过 id 匹配当前选中图层所属 artboard。
  if (!document || !document.pages) {
    return null;
  }

  let layerId = String(layer && layer.id ? layer.id : "");
  if (!layerId) {
    return null;
  }

  for (let i = 0; i < document.pages.length; i += 1) {
    let page = document.pages[i];
    let owned = findArtboardContainingLayerId(page, layerId);
    if (owned) {
      return owned.artboard;
    }
  }

  return null;
}

function findArtboardContainingLayerId(page: SketchPageLike, layerId: string): FlatArtboardEntry | null {
  if (!page || !page.layers) {
    return null;
  }

  for (let i = 0; i < page.layers.length; i += 1) {
    let layer = page.layers[i];
    if (!isArtboard(layer)) {
      continue;
    }

    if (containsLayerId(layer, layerId)) {
      return { page: page, artboard: layer };
    }
  }

  return null;
}

function containsLayerId(root: SketchLayerLike | undefined | null, layerId: string): boolean {
  if (!root) {
    return false;
  }
  if (String(root.id || "") === layerId) {
    return true;
  }
  if (root.layers && root.layers.length > 0) {
    for (let i = 0; i < root.layers.length; i += 1) {
      if (containsLayerId(root.layers[i], layerId)) {
        return true;
      }
    }
  }
  return false;
}

// 从当前选中图层收集所属画板，自动去重。
// - 直接选中 Artboard -> 使用该 Artboard
// - 选中内部图层 -> 找到父级 Artboard
// - 多个图层 -> 合并所属 Artboard 并去重
export function getArtboardsFromSelection(document: SketchDocumentLike): SketchLayerLike[] {
  let selection = document && document.selectedLayers ? document.selectedLayers.layers : [];
  let result: SketchLayerLike[] = [];
  let seenIds: Record<string, boolean> = {};

  (selection || []).forEach(function (layer: SketchLayerLike) {
    let artboard: SketchLayerLike | null;
    if (isArtboard(layer)) {
      artboard = layer;
    } else {
      artboard = findOwningArtboard(layer, document);
    }

    if (!artboard) {
      return;
    }

    let id = String(artboard.id || "");
    if (!id) {
      result.push(artboard);
      return;
    }
    if (seenIds[id]) {
      return;
    }
    seenIds[id] = true;
    result.push(artboard);
  });

  return result;
}

// 收集 Page 下所有可见 Artboard（保留原始顺序）。
export function collectVisibleArtboards(page: SketchPageLike | undefined | null): SketchLayerLike[] {
  if (!page || !page.layers) {
    return [];
  }

  return page.layers.filter(function (layer: SketchLayerLike) {
    return isArtboard(layer) && !layer.hidden;
  });
}

export function getAllPages(document: SketchDocumentLike | undefined | null): SketchPageLike[] {
  if (!document || !document.pages) {
    return [];
  }
  return document.pages.slice();
}

// 返回分组结构：[{ page, artboards: [...] }]
// 仅保留至少含 1 个可见画板的 Page。
export function getDocumentArtboardGroups(document: SketchDocumentLike): ArtboardGroup[] {
  let pages = getAllPages(document);
  let groups: ArtboardGroup[] = [];

  pages.forEach(function (page: SketchPageLike) {
    let artboards = collectVisibleArtboards(page);
    if (artboards.length > 0) {
      groups.push({ page: page, artboards: artboards });
    }
  });

  return groups;
}

// 将分组扁平化为 [{ page, artboard }] 列表，保留顺序。
export function flattenGroups(groups: ArtboardGroup[] | undefined | null): FlatArtboardEntry[] {
  let flat: FlatArtboardEntry[] = [];
  (groups || []).forEach(function (group) {
    (group.artboards || []).forEach(function (artboard: SketchLayerLike) {
      flat.push({ page: group.page, artboard: artboard });
    });
  });
  return flat;
}

// 仅保留被勾选的画板，按 (pageId, artboardId) 匹配。
// selection: [{ pageId, artboardId }]
export function filterGroupsBySelection(groups: ArtboardGroup[], selection: ScopeSelectionDto[] | null | undefined): ArtboardGroup[] {
  if (!selection || selection.length === 0) {
    return [];
  }

  let lookup: Record<string, boolean> = {};
  selection.forEach(function (item: ScopeSelectionDto) {
    let key = String(item.pageId) + "|" + String(item.artboardId);
    lookup[key] = true;
  });

  let result: ArtboardGroup[] = [];
  groups.forEach(function (group: ArtboardGroup) {
    let pageId = String((group.page && group.page.id) || "");
    let matched = (group.artboards || []).filter(function (artboard: SketchLayerLike) {
      let key = pageId + "|" + String(artboard.id || "");
      return Boolean(lookup[key]);
    });

    if (matched.length > 0) {
      result.push({ page: group.page, artboards: matched });
    }
  });

  return result;
}

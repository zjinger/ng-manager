// 资源导出模块（Asset Export v2）。
// 升级目标见 docs/design-handoff/plan/phase1_refactor.md 任务 1-4。
// - 扩展资源识别（icon/vector/symbol/logo/misc），不再只识别 bitmap/slice
// - icon/vector/logo 优先 svg，失败 fallback png；其余默认 png
// - 不假设导出文件名一定是 baseName.png：导出到独立临时目录、扫描新增文件、重命名为稳定文件名
// - 每个 asset 写入完整字段（含 handoffId/artboardId/absoluteFrame/format/width/height/...）
// - 单个资源导出失败只记录 warning，不中断整个 Artboard 导出
const sketch = require("sketch");
const normalize = require("./normalize-layer");
const classify = require("./asset-classify");

function getFileManager() {
  return NSFileManager.defaultManager();
}

function ensureDir(dir) {
  getFileManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(
    String(dir),
    true,
    null,
    null,
  );
}

function removeItemAt(path) {
  try {
    getFileManager().removeItemAtPath_error(String(path), null);
  } catch (error) {
    // ignore: 清理临时目录失败不应影响主流程
  }
}

function moveItemFromTo(source, target) {
  getFileManager().moveItemAtPath_toPath_error(String(source), String(target), null);
}

function fileExistsAt(path) {
  return getFileManager().fileExistsAtPath(String(path));
}

function sanitizeAssetName(name) {
  const value = String(name || "asset")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return value || "asset";
}

function scanDirFileNames(dir) {
  const fm = getFileManager();
  if (!fm.fileExistsAtPath(String(dir))) {
    return [];
  }
  let contents = fm.contentsOfDirectoryAtPath_error(String(dir), null);
  let result = [];
  if (!contents) {
    return result;
  }
  const count = contents.count();
  for (let i = 0; i < count; i += 1) {
    result.push(String(contents.objectAtIndex(i)));
  }
  return result;
}

function fileExt(name) {
  const dot = String(name || "").lastIndexOf(".");
  return dot >= 0 ? String(name).slice(dot + 1).toLowerCase() : "";
}

// 构建 layerId -> { handoffId, absoluteFrame, artboardId } 索引，
// 从已 normalize 的 layerTree 查询，避免重复归一化并保证 handoffId 与图层树一致。
function buildLayerIndex(layerTree) {
  const index = {};
  if (!layerTree) {
    return index;
  }
  function visit(node) {
    if (!node || !node.id) {
      return;
    }
    index[String(node.id)] = {
      handoffId: node.handoffId || null,
      absoluteFrame: node.absoluteFrame || null,
      artboardId: node.artboardId || null,
    };
    if (node.children && node.children.length > 0) {
      node.children.forEach(visit);
    }
  }
  visit(layerTree);
  return index;
}

// 递归收集资源图层。若某层被分类为资源（icon group / symbol 等），
// 则整体导出、不再向下递归子层，避免图标与其内部 ShapePath 重复导出。
function collectAssetLayers(layer, list) {
  if (!layer) {
    return;
  }
  const info = classify.classifyAsset(layer);
  if (info) {
    list.push({ layer: layer, info: info });
    return;
  }
  if (layer.layers && layer.layers.length > 0) {
    layer.layers.forEach(function (child) {
      collectAssetLayers(child, list);
    });
  }
}

// 在独立临时目录内导出指定格式，扫描新增文件。
// 临时目录导出前为空，避免与已有文件同名覆盖导致的 before/after 误判（任务 3）。
function exportIntoTempDir(layer, tmpDir, fmt) {
  ensureDir(tmpDir);
  const before = scanDirFileNames(tmpDir);
  try {
    sketch.export(layer, {
      output: tmpDir,
      formats: fmt,
      scales: "1",
      overwriting: true,
    });
  } catch (error) {
    return null;
  }
  const after = scanDirFileNames(tmpDir);
  for (let i = 0; i < after.length; i += 1) {
    const name = after[i];
    if (before.indexOf(name) !== -1) {
      continue;
    }
    if (fileExt(name) === fmt) {
      return name;
    }
  }
  return null;
}
// 导出单个资源：按格式策略依次尝试，成功后重命名为稳定文件名。
// 返回 { format, relPath } 或 null（含资源级 warning 写入 assetWarnings）。
function exportAssetItem(layer, type, outputDir, joinPath, seq, baseName, shortId, assetWarnings) {
  const formats = classify.preferSvg(type) ? ["svg", "png"] : ["png"];
  const subDir = classify.assetTypeDirectory(type);
  const assetDir = joinPath(outputDir, "assets", subDir);
  ensureDir(assetDir);

  for (let f = 0; f < formats.length; f += 1) {
    const fmt = formats[f];
    const tmpDir = joinPath(assetDir, ".tmp-" + seq + "-" + shortId + "-" + fmt);
    let producedName = exportIntoTempDir(layer, tmpDir, fmt);

    if (!producedName) {
      // svg 可能不被某些图层支持（如位图），记 warning 后继续尝试 png fallback。
      assetWarnings.push((layer.name || "layer") + " 以 " + fmt + " 导出未生成文件");
      removeItemAt(tmpDir);
      continue;
    }

    const stableName = type + "-" + seq + "-" + baseName + "__" + shortId + "." + fmt;
    const stableAbs = joinPath(assetDir, stableName);
    const producedAbs = joinPath(tmpDir, producedName);

    if (fileExistsAt(stableAbs)) {
      removeItemAt(stableAbs);
    }
    moveItemFromTo(producedAbs, stableAbs);
    removeItemAt(tmpDir);

    return { format: fmt, relPath: joinPath("assets", subDir, stableName) };
  }

  return null;
}

// 导出 Artboard 的资源图层，返回 assets 数组（写入 assets-map.json）。
// 保留原函数名 exportBitmapAssets 以兼容 exporter.ts 调用；
// 新增第 5 个参数 context = { layerTree, artboardId }，用于补全 handoffId / absoluteFrame。
function exportBitmapAssets(artboard, outputDir, joinPath, warnings, context) {
  context = context || {};
  let layerTree = context.layerTree || null;
  const artboardId = context.artboardId || (layerTree ? layerTree.artboardId : null) || "";
  const layerIndex = buildLayerIndex(layerTree);

  const imagesDir = joinPath(outputDir, "assets", "images");
  ensureDir(imagesDir);

  const list = [];
  collectAssetLayers(artboard, list);

  const assets = [];
  list.forEach(function (item, index) {
    let layer = item.layer;
    const info = item.info;
    const seq = String(index + 1).padStart(3, "0");
    const baseName = sanitizeAssetName(layer.name || ("asset_" + seq));
    const shortId = normalize.shortHash(String(layer.id || "") + ":" + artboardId);
    const frame = normalize.getFrame(layer);

    // handoffId / absoluteFrame 优先取自 normalize 后的图层树索引；
    // 若节点被归一化裁剪（空容器等），按 normalize 公式兜底生成 handoffId。
    let node = layerIndex[String(layer.id || "")] || null;
    const handoffId = node && node.handoffId
      ? node.handoffId
      : "layer_" + normalize.shortHash(String(layer.id || "") + ":" + artboardId);
    const absoluteFrame = node && node.absoluteFrame ? node.absoluteFrame : frame;
    const resolvedArtboardId = node && node.artboardId ? node.artboardId : artboardId;

    const assetWarnings = [];
    let result = exportAssetItem(
      layer,
      info.type,
      outputDir,
      joinPath,
      seq,
      baseName,
      shortId,
      assetWarnings,
    );

    if (!result) {
      // 导出失败：仍写入 assets-map（exportStatus=failed, path=null），
      // 便于 preview / AI 上下文感知失败资源，同时不中断整体导出（验收 6/7）。
      const failedName = layer.name || ("asset_" + seq);
      const failReason = assetWarnings.length > 0 ? assetWarnings.join("; ") : "export produced no file";
      assets.push({
        id: "asset_" + seq,
        name: failedName,
        layerId: String(layer.id || ""),
        handoffId: handoffId,
        artboardId: resolvedArtboardId,
        type: info.type,
        format: null,
        path: null,
        width: frame.width,
        height: frame.height,
        frame: frame,
        absoluteFrame: absoluteFrame,
        sourceLayerType: info.sourceLayerType,
        exportStatus: "failed",
        warnings: assetWarnings,
      });
      warnings.push("Asset export failed for " + failedName + ": " + failReason);
      return;
    }

    assets.push({
      id: "asset_" + seq,
      name: layer.name || ("asset_" + seq),
      layerId: String(layer.id || ""),
      handoffId: handoffId,
      artboardId: resolvedArtboardId,
      type: info.type,
      format: result.format,
      path: result.relPath,
      width: frame.width,
      height: frame.height,
      frame: frame,
      absoluteFrame: absoluteFrame,
      sourceLayerType: info.sourceLayerType,
      exportStatus: "success",
      warnings: [],
    });
  });

  return assets;
}

module.exports = {
  exportBitmapAssets: exportBitmapAssets,
  buildLayerIndex: buildLayerIndex,
  collectAssetLayers: collectAssetLayers,
};

export {};

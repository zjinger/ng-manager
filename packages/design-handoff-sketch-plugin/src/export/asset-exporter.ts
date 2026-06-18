// @ts-nocheck
var sketch = require("sketch");
var normalize = require("./normalize-layer");

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

function sanitizeAssetName(name) {
  var value = String(name || "asset")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return value || "asset";
}

function classifyAsset(layer) {
  if (!layer) {
    return null;
  }
  var type = layer.type;
  if (type === "Slice") {
    return "slice";
  }
  if (type === "Image" || type === "Bitmap") {
    return "bitmap";
  }
  return null;
}

function collectAssetLayers(layer, list) {
  if (!layer) {
    return;
  }
  var kind = classifyAsset(layer);
  if (kind) {
    list.push({ layer: layer, kind: kind });
  }
  if (layer.layers && layer.layers.length > 0) {
    layer.layers.forEach(function (child) {
      collectAssetLayers(child, list);
    });
  }
}

function fileExistsAt(path) {
  return getFileManager().fileExistsAtPath(String(path));
}

function exportBitmapAssets(artboard, outputDir, joinPath, warnings) {
  var imagesDir = joinPath(outputDir, "assets", "images");
  ensureDir(imagesDir);

  var assets = [];
  var list = [];
  collectAssetLayers(artboard, list);

  list.forEach(function (item, index) {
    var layer = item.layer;
    var baseName = sanitizeAssetName(layer.name || ("asset_" + index));
    var fileName = baseName + ".png";
    var absPath = joinPath(imagesDir, fileName);
    var relPath = joinPath("assets", "images", fileName);

    try {
      sketch.export(layer, {
        output: imagesDir,
        formats: "png",
        scales: "1",
        overwriting: true,
      });
    } catch (error) {
      warnings.push(
        "Asset export failed for " + (layer.name || "layer") + ": " +
          (error && error.message ? error.message : String(error)),
      );
      return;
    }

    if (!fileExistsAt(absPath)) {
      warnings.push("Asset export did not produce expected file: " + relPath);
      return;
    }

    assets.push({
      id: "asset_" + String(index + 1).padStart(3, "0"),
      name: layer.name || ("asset_" + index),
      layerId: String(layer.id || ""),
      type: item.kind,
      path: relPath,
      frame: normalize.getFrame(layer),
    });
  });

  return assets;
}

module.exports = {
  exportBitmapAssets: exportBitmapAssets,
};


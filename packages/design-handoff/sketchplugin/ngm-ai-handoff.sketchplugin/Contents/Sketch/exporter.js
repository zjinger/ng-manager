var fs = require("@skpm/fs");
var path = require("path");
var sketch = require("sketch");
var normalize = require("./normalize-layer");
var styles = require("./style-extractor");
var components = require("./component-infer");
var promptGenerator = require("./prompt-generator");

function sanitizeName(name) {
  return String(name || "untitled")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function ensureDirRecursive(dir) {
  var parts = dir.split(path.sep);
  var current = parts[0] || path.sep;

  parts.slice(current === path.sep ? 1 : 1).forEach(function (part) {
    if (!part) {
      return;
    }
    current = path.join(current, part);
    ensureDir(current);
  });
}

function getDesktopRoot() {
  return path.join(String(NSHomeDirectory()), "Desktop", "ngm-ai-handoff");
}

function getDocumentPath(document) {
  if (document.path) {
    return String(document.path);
  }

  return null;
}

function writeJson(outputDir, fileName, value) {
  fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(value, null, 2), "utf8");
}

function writeText(outputDir, fileName, value) {
  fs.writeFileSync(path.join(outputDir, fileName), value, "utf8");
}

function collectExportedPngs(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter(function (file) {
      return /\.png$/i.test(file);
    })
    .map(function (file) {
      return path.join(dir, file);
    });
}

function exportScreenshot(artboard, outputDir, warnings) {
  var before = collectExportedPngs(outputDir);

  try {
    sketch.export(artboard, {
      output: outputDir,
      formats: "png",
      scales: "1",
      overwriting: true,
    });
  } catch (error) {
    warnings.push("Sketch screenshot export failed: " + (error && error.message ? error.message : String(error)));
    return null;
  }

  var after = collectExportedPngs(outputDir);
  var newFiles = after.filter(function (file) {
    return before.indexOf(file) === -1;
  });

  var expected = path.join(outputDir, sanitizeName(artboard.name) + ".png");
  var source = null;
  if (fs.existsSync(expected)) {
    source = expected;
  } else if (newFiles.length > 0) {
    source = newFiles[0];
  }

  if (!source) {
    warnings.push("Sketch screenshot export did not produce a png file.");
    return null;
  }

  var target = path.join(outputDir, "screenshot.png");
  if (source !== target) {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    fs.renameSync(source, target);
  }

  return "screenshot.png";
}

function buildMeta(document, artboard, pluginVersion) {
  return {
    pluginVersion: pluginVersion,
    documentName: document.name || "Untitled",
    documentPath: getDocumentPath(document),
    pageName: document.selectedPage ? document.selectedPage.name : "",
    artboardName: artboard.name || "Untitled Artboard",
    exportedAt: new Date().toISOString(),
    platform: "sketch",
  };
}

function exportArtboard(document, artboard, options) {
  var pluginVersion = options && options.pluginVersion ? options.pluginVersion : "0.1.0";
  var documentName = sanitizeName(document.name || "Untitled");
  var artboardName = sanitizeName(artboard.name || "Untitled Artboard");
  var outputDir = path.join(getDesktopRoot(), documentName, artboardName);
  var warnings = [];

  ensureDirRecursive(outputDir);

  var styleRegistry = styles.createStyleRegistry();
  var layerTree = normalize.normalizeLayer(artboard, styleRegistry);
  if (!layerTree) {
    throw new Error("Selected artboard has no exportable layers.");
  }

  var texts = normalize.collectTexts(artboard);
  var styleMap = styleRegistry.styles;
  var tokens = styles.extractTokens(styleMap, texts);
  var inferredComponents = components.inferComponents(layerTree);
  var screenshot = exportScreenshot(artboard, outputDir, warnings);
  var assetsMap = {
    screenshot: screenshot,
    assets: [],
    warnings: warnings,
  };
  var meta = buildMeta(document, artboard, pluginVersion);
  var prompt = promptGenerator.generatePrompt(meta, assetsMap);

  writeJson(outputDir, "meta.json", meta);
  writeJson(outputDir, "layer-tree.json", layerTree);
  writeJson(outputDir, "texts.json", texts);
  writeJson(outputDir, "styles.json", styleMap);
  writeJson(outputDir, "tokens.json", tokens);
  writeJson(outputDir, "components.json", inferredComponents);
  writeJson(outputDir, "assets-map.json", assetsMap);
  writeText(outputDir, "agent-prompt.md", prompt);

  return outputDir;
}

module.exports = {
  exportArtboard: exportArtboard,
};

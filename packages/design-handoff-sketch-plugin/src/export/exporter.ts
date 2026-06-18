// @ts-nocheck
var sketch = require("sketch");
var normalize = require("./normalize-layer");
var styles = require("./style-extractor");
var components = require("./component-infer");
var promptGenerator = require("./prompt-generator");
var pluginSettings = require("./settings");
var handoffMapGenerator = require("./handoff-map-generator");
var previewRenderer = require("./preview-renderer");
var interactionBridgeTemplate = require("./interaction-bridge-template");
var designContextGenerator = require("./design-context-generator");
var assetExporter = require("./asset-exporter");

var UTF8_ENCODING = typeof NSUTF8StringEncoding !== "undefined" ? NSUTF8StringEncoding : 4;

function getFileManager() {
  return NSFileManager.defaultManager();
}

function fileExists(filePath) {
  return getFileManager().fileExistsAtPath(String(filePath));
}

function ensureDirRecursive(dir) {
  getFileManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(
    String(dir),
    true,
    null,
    null,
  );
}

function removeFile(filePath) {
  getFileManager().removeItemAtPath_error(String(filePath), null);
}

function moveFile(source, target) {
  getFileManager().moveItemAtPath_toPath_error(String(source), String(target), null);
}

function readDir(dir) {
  var contents = getFileManager().contentsOfDirectoryAtPath_error(String(dir), null);
  var result = [];

  if (!contents) {
    return result;
  }

  for (var index = 0; index < contents.count(); index += 1) {
    result.push(String(contents.objectAtIndex(index)));
  }

  return result;
}

function sanitizeName(name) {
  return String(name || "untitled")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getDocumentPath(document) {
  if (document.path) {
    return String(document.path);
  }

  return null;
}

function writeJson(outputDir, fileName, value) {
  writeText(outputDir, fileName, JSON.stringify(value, null, 2));
}

function writeText(outputDir, fileName, value) {
  var filePath = pluginSettings.joinPath(outputDir, fileName);
  var text = NSString.stringWithString(String(value));
  var ok = text.writeToFile_atomically_encoding_error(filePath, true, UTF8_ENCODING, null);

  if (!ok) {
    throw new Error("Failed to write file: " + filePath);
  }
}

function collectExportedPngs(dir) {
  if (!fileExists(dir)) {
    return [];
  }

  return readDir(dir)
    .filter(function (file) {
      return /\.png$/i.test(file);
    })
    .map(function (file) {
      return pluginSettings.joinPath(dir, file);
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

  var expected = pluginSettings.joinPath(outputDir, sanitizeName(artboard.name) + ".png");
  var source = null;
  if (fileExists(expected)) {
    source = expected;
  } else if (newFiles.length > 0) {
    source = newFiles[0];
  }

  if (!source) {
    warnings.push("Sketch screenshot export did not produce a png file.");
    return null;
  }

  var target = pluginSettings.joinPath(outputDir, "screenshot.png");
  if (source !== target) {
    if (fileExists(target)) {
      removeFile(target);
    }
    moveFile(source, target);
  }

  return "screenshot.png";
}

function buildMeta(document, artboard, pluginVersion, pageName) {
  return {
    pluginVersion: pluginVersion,
    handoffSpecVersion: "1.0",
    documentName: document.name || "Untitled",
    documentPath: getDocumentPath(document),
    pageName: pageName || (document.selectedPage ? document.selectedPage.name : ""),
    artboardName: artboard.name || "Untitled Artboard",
    exportedAt: new Date().toISOString(),
    platform: "sketch",
  };
}

function buildManifest(meta, screenshot) {
  return {
    specVersion: "1.0",
    handoffSpecVersion: meta.handoffSpecVersion || "1.0",
    meta: "meta.json",
    files: {
      layerTree: "layer-tree.json",
      texts: "texts.json",
      styles: "styles.json",
      tokens: "tokens.json",
      components: "components.json",
      assetsMap: "assets-map.json",
      handoffMap: "handoff-map.json",
      designContext: "design-context.md",
      previewHtml: "preview.html",
      interactionBridge: "interaction-bridge.js",
      agentPrompt: "agent-prompt.md",
      screenshot: screenshot,
    },
    exportedAt: meta.exportedAt,
  };
}

function exportArtboard(document, artboard, options) {
  options = options || {};
  var pluginVersion = options.pluginVersion ? options.pluginVersion : "0.2.0";
  var settings = options.settings ? options.settings : pluginSettings.getSettings();
  var onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  var logger = options.logger || null;
  var pageName = options.pageName ? options.pageName : null;
  var documentName = sanitizeName(document.name || "Untitled");
  var artboardName = sanitizeName(artboard.name || "Untitled Artboard");
  var outputDir = options.outputDir
    ? options.outputDir
    : pluginSettings.joinPath(settings.outputRoot, documentName, artboardName);
  var warnings = [];

  function logStep(stage, message, data) {
    if (logger && typeof logger.step === "function") {
      logger.step(stage, message, data || null);
    }
  }

  function logWarning(stage, message, data) {
    if (logger && typeof logger.warn === "function") {
      logger.warn(stage, message, data || null);
    }
  }

  logStep("创建输出目录", "准备创建画板输出目录", { outputDir: outputDir });
  ensureDirRecursive(outputDir);

  function emitStep(key, name) {
    if (onProgress) {
      try {
        onProgress(key, name);
      } catch (error) {
        // 进度回调失败不应影响导出
      }
    }
  }

  emitStep("generatingHandoffJson", artboard.name);

  logStep("normalize layer tree", "开始归一化图层树", { artboardName: artboard.name });
  var styleRegistry = styles.createStyleRegistry();
  var layerTree = normalize.normalizeLayer(artboard, styleRegistry);
  if (!layerTree) {
    throw new Error("Selected artboard has no exportable layers.");
  }

  logStep("collect texts", "开始收集文本图层", { artboardName: artboard.name });
  var texts = normalize.collectTexts(artboard);
  logStep("extract styles", "开始提取样式", { artboardName: artboard.name });
  var styleMap = styleRegistry.styles;
  logStep("extract tokens", "开始提取设计 Token", { artboardName: artboard.name });
  var tokens = styles.extractTokens(styleMap, texts);
  logStep("infer components", "开始推断组件", { artboardName: artboard.name });
  var inferredComponents = components.inferComponents(layerTree);

  if (settings.exportScreenshot) {
    emitStep("generatingScreenshot", artboard.name);
    logStep("export screenshot", "开始导出截图", { artboardName: artboard.name });
  }
  var screenshot = settings.exportScreenshot ? exportScreenshot(artboard, outputDir, warnings) : null;
  if (!settings.exportScreenshot) {
    warnings.push("Screenshot export is disabled in plugin settings.");
    logWarning("export screenshot", "插件设置已禁用截图导出", { artboardName: artboard.name });
  } else if (!screenshot) {
    logWarning("export screenshot", "截图导出未生成 screenshot.png", { artboardName: artboard.name });
  }

  logStep("export assets", "开始导出资源图层", { artboardName: artboard.name });
  var bitmapAssets = assetExporter.exportBitmapAssets(
    artboard,
    outputDir,
    pluginSettings.joinPath,
    warnings,
    { layerTree: layerTree, artboardId: layerTree.artboardId },
  );
  var assetsMap = {
    screenshot: screenshot,
    assets: bitmapAssets,
    warnings: warnings,
  };

  var meta = buildMeta(document, artboard, pluginVersion, pageName);
  logStep("build handoff map", "开始生成 Handoff 映射", { artboardName: artboard.name });
  var handoffMap = handoffMapGenerator.buildHandoffMap(layerTree, inferredComponents);

  emitStep("generatingPreview", artboard.name);
  logStep("generate preview html", "开始生成预览 HTML", { artboardName: artboard.name });
  var previewHtml = previewRenderer.generatePreviewHtml(meta, layerTree, inferredComponents, screenshot, styleMap, assetsMap);
  var bridgeScript = interactionBridgeTemplate.generateBridgeScript();

  emitStep("generatingAiContext", artboard.name);
  logStep("generate design context", "开始生成设计上下文", { artboardName: artboard.name });
  var designContext = designContextGenerator.generateDesignContext(meta, layerTree, inferredComponents, texts, tokens, assetsMap);
  var manifest = buildManifest(meta, screenshot);
  var prompt = promptGenerator.generatePrompt(meta, assetsMap);

  logStep("write json files", "开始写入 Handoff JSON 文件", { outputDir: outputDir });
  writeJson(outputDir, "meta.json", meta);
  writeJson(outputDir, "handoff.json", manifest);
  writeJson(outputDir, "layer-tree.json", layerTree);
  writeJson(outputDir, "texts.json", texts);
  writeJson(outputDir, "styles.json", styleMap);
  writeJson(outputDir, "tokens.json", tokens);
  writeJson(outputDir, "components.json", inferredComponents);
  writeJson(outputDir, "assets-map.json", assetsMap);
  writeJson(outputDir, "handoff-map.json", handoffMap);
  logStep("write html files", "开始写入 HTML 与上下文文件", { outputDir: outputDir });
  writeText(outputDir, "preview.html", previewHtml);
  writeText(outputDir, "interaction-bridge.js", bridgeScript);
  writeText(outputDir, "design-context.md", designContext);
  writeText(outputDir, "agent-prompt.md", prompt);

  if (warnings.length > 0) {
    logWarning("导出完成", "画板导出完成但存在警告", { artboardName: artboard.name, warnings: warnings });
  }

  return { outputDir: outputDir, warnings: warnings };
}

module.exports = {
  exportArtboard: exportArtboard,
  // 暴露文件系统辅助函数，供 main.js / 文档级索引与日志复用。
  ensureDirRecursive: ensureDirRecursive,
  writeJson: writeJson,
  writeText: writeText,
  sanitizeName: sanitizeName,
  fileExists: fileExists,
  joinPath: pluginSettings.joinPath,
};


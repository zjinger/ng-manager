const sketch = require("sketch");
const normalize = require("../sketch/normalize-layer");
const styles = require("./style-extractor");
const components = require("./component-infer");
const promptGenerator = require("./prompt-generator");
const pluginSettings = require("../sketch/settings");
const handoffMapGenerator = require("../handoff/handoff-map-generator");
const previewTemplate = require("../handoff/preview-template");
const previewDataGenerator = require("../handoff/preview-data-generator");
const previewCss = require("../handoff/preview-css");
const previewJs = require("../handoff/preview-js");
const interactionBridgeTemplate = require("../handoff/interaction-bridge-template");
const designContextGenerator = require("../handoff/design-context-generator");
const assetExporter = require("./asset-exporter");

const UTF8_ENCODING = typeof NSUTF8StringEncoding !== "undefined" ? NSUTF8StringEncoding : 4;

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
  let contents = getFileManager().contentsOfDirectoryAtPath_error(String(dir), null);
  const result = [];

  if (!contents) {
    return result;
  }

  for (let index = 0; index < contents.count(); index += 1) {
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
  const filePath = pluginSettings.joinPath(outputDir, fileName);
  const text = NSString.stringWithString(String(value));
  let ok = text.writeToFile_atomically_encoding_error(filePath, true, UTF8_ENCODING, null);

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
  const before = collectExportedPngs(outputDir);

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

  const after = collectExportedPngs(outputDir);
  const newFiles = after.filter(function (file) {
    return before.indexOf(file) === -1;
  });

  const expected = pluginSettings.joinPath(outputDir, sanitizeName(artboard.name) + ".png");
  let source = null;
  if (fileExists(expected)) {
    source = expected;
  } else if (newFiles.length > 0) {
    source = newFiles[0];
  }

  if (!source) {
    warnings.push("Sketch screenshot export did not produce a png file.");
    return null;
  }

  const target = pluginSettings.joinPath(outputDir, "screenshot.png");
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
      previewCss: "preview.css",
      previewJs: "preview.js",
      previewData: "preview-data.json",
      interactionBridge: "interaction-bridge.js",
      agentPrompt: "agent-prompt.md",
      screenshot: screenshot,
    },
    exportedAt: meta.exportedAt,
  };
}

function exportArtboard(document, artboard, options) {
  options = options || {};
  const pluginVersion = options.pluginVersion ? options.pluginVersion : "0.2.0";
  const settings = options.settings ? options.settings : pluginSettings.getSettings();
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const logger = options.logger || null;
  const pageName = options.pageName ? options.pageName : null;
  const documentName = sanitizeName(document.name || "Untitled");
  const artboardName = sanitizeName(artboard.name || "Untitled Artboard");
  const outputDir = options.outputDir
    ? options.outputDir
    : pluginSettings.joinPath(settings.outputRoot, documentName, artboardName);
  const warnings = [];

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
  const styleRegistry = styles.createStyleRegistry();
  let layerTree = normalize.normalizeLayer(artboard, styleRegistry);
  if (!layerTree) {
    throw new Error("Selected artboard has no exportable layers.");
  }

  logStep("collect texts", "开始收集文本图层", { artboardName: artboard.name });
  const texts = normalize.collectTexts(artboard);
  logStep("extract styles", "开始提取样式", { artboardName: artboard.name });
  const styleMap = styleRegistry.styles;
  logStep("extract tokens", "开始提取设计 Token", { artboardName: artboard.name });
  const tokens = styles.extractTokens(styleMap, texts);
  logStep("infer components", "开始推断组件", { artboardName: artboard.name });
  const inferredComponents = components.inferComponents(layerTree);

  if (settings.exportScreenshot) {
    emitStep("generatingScreenshot", artboard.name);
    logStep("export screenshot", "开始导出截图", { artboardName: artboard.name });
  }
  let screenshot = settings.exportScreenshot ? exportScreenshot(artboard, outputDir, warnings) : null;
  if (!settings.exportScreenshot) {
    warnings.push("Screenshot export is disabled in plugin settings.");
    logWarning("export screenshot", "插件设置已禁用截图导出", { artboardName: artboard.name });
  } else if (!screenshot) {
    logWarning("export screenshot", "截图导出未生成 screenshot.png", { artboardName: artboard.name });
  }

  logStep("export assets", "开始导出资源图层", { artboardName: artboard.name });
  const bitmapAssets = assetExporter.exportBitmapAssets(
    artboard,
    outputDir,
    pluginSettings.joinPath,
    warnings,
    { layerTree: layerTree, artboardId: layerTree.artboardId },
  );
  const assetsMap = {
    screenshot: screenshot,
    assets: bitmapAssets,
    warnings: warnings,
  };

  const meta = buildMeta(document, artboard, pluginVersion, pageName);
  logStep("build handoff map", "开始生成 Handoff 映射", { artboardName: artboard.name });
  const handoffMap = handoffMapGenerator.buildHandoffMap(layerTree, inferredComponents);

  emitStep("generatingPreview", artboard.name);
  logStep("generate preview html", "开始生成预览 HTML", { artboardName: artboard.name });
  const previewDataJson = previewDataGenerator.generatePreviewData(meta, layerTree, inferredComponents, screenshot, styleMap, assetsMap);
  const previewCssText = previewCss.generatePreviewCss();
  const previewJsText = previewJs.generatePreviewJs();
  const previewHtml = previewTemplate.generatePreviewHtml(meta, layerTree, inferredComponents, screenshot, styleMap, assetsMap, previewDataJson);
  const bridgeScript = interactionBridgeTemplate.generateBridgeScript();

  emitStep("generatingAiContext", artboard.name);
  logStep("generate design context", "开始生成设计上下文", { artboardName: artboard.name });
  const designContext = designContextGenerator.generateDesignContext(meta, layerTree, inferredComponents, texts, tokens, assetsMap);
  const manifest = buildManifest(meta, screenshot);
  const prompt = promptGenerator.generatePrompt(meta, assetsMap);

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
  writeJson(outputDir, "preview-data.json", previewDataJson);
  writeText(outputDir, "preview.html", previewHtml);
  writeText(outputDir, "preview.css", previewCssText);
  writeText(outputDir, "preview.js", previewJsText);
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

export {};

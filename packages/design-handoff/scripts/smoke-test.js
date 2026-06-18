const { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");
const {
  createHandoffAgentTask,
  generateAgentContext,
  generateAgentPrompt,
  loadTargetProjectProfile,
  parseHandoffPackage,
  scanHandoffPackages,
  validateHandoffPackage,
} = require("../lib");

// 尝试加载 parseSketchFile（异步函数）
let parseSketchFile = null;
try {
  const sketchFileModule = require("../lib/sketch-file");
  parseSketchFile = sketchFileModule.parseSketchFile;
} catch (error) {
  console.log("Note: sketch-file module not available, skipping .sketch file parsing test");
}

const root = mkdtempSync(join(tmpdir(), "ngm-handoff-"));
const valid = join(root, "valid");
const invalid = join(root, "invalid");
const targetProject = join(root, "target-project");
const taskOutput = join(root, "tasks");

mkdirSync(valid);
mkdirSync(invalid);
mkdirSync(targetProject);

const frame = { x: 0, y: 0, width: 1440, height: 900 };

writeFileSync(
  join(valid, "meta.json"),
  JSON.stringify(
    {
      pluginVersion: "0.1.0",
      documentName: "hub-v2.sketch",
      documentPath: "/tmp/hub-v2.sketch",
      pageName: "研发管理",
      artboardName: "FeatureProgressPage",
      exportedAt: "2026-06-03T00:00:00.000Z",
      platform: "sketch",
    },
    null,
    2,
  ),
);
writeFileSync(
  join(valid, "layer-tree.json"),
  JSON.stringify(
    {
      id: "artboard_001",
      name: "FeatureProgressPage",
      type: "Artboard",
      frame,
      hidden: false,
      locked: false,
      text: null,
      styleRef: null,
      children: [],
    },
    null,
    2,
  ),
);
writeFileSync(
  join(valid, "texts.json"),
  JSON.stringify(
    [
      {
        id: "txt_001",
        name: "Text/PageTitle",
        text: "功能点进度管理",
        fontFamily: "PingFang SC",
        fontSize: 20,
        fontWeight: "600",
        color: "#111827",
        frame,
      },
    ],
    null,
    2,
  ),
);
writeFileSync(
  join(valid, "styles.json"),
  JSON.stringify({ style_001: { fills: ["#ffffff"], borders: [], radius: 8, opacity: 1, shadows: [] } }, null, 2),
);
writeFileSync(
  join(valid, "tokens.json"),
  JSON.stringify({ colors: { color_001: "#ffffff" }, fontSize: { font_size_001: 20 }, radius: { radius_001: 8 } }, null, 2),
);
writeFileSync(join(valid, "components.json"), JSON.stringify([], null, 2));
writeFileSync(
  join(valid, "assets-map.json"),
  JSON.stringify({ screenshot: null, assets: [], warnings: [] }, null, 2),
);
writeFileSync(join(valid, "agent-prompt.md"), "prompt");
writeFileSync(
  join(targetProject, ".ngm-handoff.json"),
  JSON.stringify(
    {
      name: "fixture-angular-app",
      projectRoot: ".",
      framework: "angular",
      uiLibrary: "ng-zorro",
      outputPath: "src/app/features/demo/pages/feature-progress",
      route: "/demo/feature-progress",
      styleGuide: ["src/styles.less", "src/app/shared/ui"],
      referenceFiles: ["package.json", "src/app/features/demo/routes.ts"],
      buildCommand: "npm run build",
      implementationRules: ["Use target project shared components before creating new primitives."],
    },
    null,
    2,
  ),
);

const validResult = validateHandoffPackage(valid);
if (!validResult.ok) {
  throw new Error(`Expected valid fixture, got ${JSON.stringify(validResult.errors)}`);
}

const handoff = parseHandoffPackage(valid);
const prompt = generateAgentPrompt(handoff);
const context = generateAgentContext(handoff);

if (!prompt.includes("Angular + NG-ZORRO")) {
  throw new Error("Generated prompt is missing Angular + NG-ZORRO guidance.");
}

if (context.summary.textCount !== 1) {
  throw new Error("Generated context summary is incorrect.");
}

const profile = loadTargetProjectProfile(targetProject);
if (profile.name !== "fixture-angular-app" || !profile.projectRoot.endsWith("target-project")) {
  throw new Error("Target project profile did not load correctly.");
}

const profiledTask = createHandoffAgentTask({
  packageDir: valid,
  outputRoot: taskOutput,
  slug: "profiled-task",
  targetProject,
});

if (!existsSync(profiledTask.promptPath) || !existsSync(profiledTask.contextPath)) {
  throw new Error("Profiled agent task files were not created.");
}

const profiledPrompt = readFileSync(profiledTask.promptPath, "utf8");
const removedDefaultTargetText = ["hub-v2", "app shell"].join(" ");
if (!profiledPrompt.includes("fixture-angular-app") || profiledPrompt.includes(removedDefaultTargetText)) {
  throw new Error("Profiled prompt did not use the target project profile correctly.");
}
if (!profiledPrompt.includes("Generate native static files only: index.html, styles.css, and script.js.")) {
  throw new Error("Profiled prompt should default to static HTML output.");
}

const profiledContext = JSON.parse(readFileSync(profiledTask.contextPath, "utf8"));
if (profiledContext.task.profile.name !== "fixture-angular-app") {
  throw new Error("Profiled context is missing target project profile data.");
}
if (profiledContext.task.artifactType !== "static-html" || profiledContext.task.profile.artifactType !== "static-html") {
  throw new Error("Profiled context should record static-html as the default artifact type.");
}

const fallbackTask = createHandoffAgentTask({
  packageDir: valid,
  outputRoot: taskOutput,
  slug: "fallback-task",
  targetApp: "legacy-target",
  targetRoute: "/legacy/feature-progress",
  targetPath: "src/pages/feature-progress",
});
if (!existsSync(fallbackTask.promptPath)) {
  throw new Error("Fallback agent task was not created.");
}

const targetRootTask = createHandoffAgentTask({
  packageDir: valid,
  slug: "target-root-task",
  targetApp: targetProject,
  targetRoute: "/static/feature-progress",
  targetPath: "handoff-static/feature-progress",
  artifactType: "static-html",
});
if (!targetRootTask.taskDir.startsWith(join(targetProject, ".artifacts", "design-handoff", "agent-tasks"))) {
  throw new Error("Task output should default to the target project artifact directory when targetApp is a path.");
}

const invalidResult = validateHandoffPackage(invalid);
if (invalidResult.ok || invalidResult.errors.length === 0) {
  throw new Error("Expected invalid fixture to report missing files.");
}

// ===== 新风格 Handoff Package 物料（part1） =====
const newStyle = join(root, "newstyle");
mkdirSync(newStyle);
const abFrame = { x: 0, y: 0, width: 1440, height: 900 };
const childFrame = { x: 0, y: 0, width: 1440, height: 64 };

writeFileSync(join(newStyle, "meta.json"), JSON.stringify({
  pluginVersion: "0.2.0", handoffSpecVersion: "1.0", documentName: "demo.sketch",
  documentPath: "/tmp/demo.sketch", pageName: "首页", artboardName: "DemoPage",
  exportedAt: "2026-06-17T00:00:00.000Z", platform: "sketch",
}, null, 2));
writeFileSync(join(newStyle, "handoff.json"), JSON.stringify({
  specVersion: "1.0", handoffSpecVersion: "1.0", meta: "meta.json",
  files: { layerTree: "layer-tree.json", texts: "texts.json", styles: "styles.json", tokens: "tokens.json", components: "components.json", assetsMap: "assets-map.json", handoffMap: "handoff-map.json", designContext: "design-context.md", previewHtml: "preview.html", interactionBridge: "interaction-bridge.js", agentPrompt: "agent-prompt.md", screenshot: null },
  exportedAt: "2026-06-17T00:00:00.000Z",
}, null, 2));
writeFileSync(join(newStyle, "layer-tree.json"), JSON.stringify({
  id: "artboard-001", handoffId: "artboard_aabbccdd", name: "DemoPage", type: "Artboard",
  frame: abFrame, absoluteFrame: abFrame, artboardId: "artboard_aabbccdd", parentId: null, path: ["DemoPage"],
  hidden: false, locked: false, text: null, styleRef: null, role: "artboard",
  domSelector: "[data-handoff-id=\"artboard_aabbccdd\"]",
  children: [{
    id: "layer-001", handoffId: "layer_11223344", name: "TopNav", type: "Group",
    frame: childFrame, absoluteFrame: childFrame, artboardId: "artboard_aabbccdd", parentId: "artboard_aabbccdd", path: ["DemoPage", "TopNav"],
    hidden: false, locked: false, text: null, styleRef: null, role: "navigation",
    domSelector: "[data-handoff-id=\"layer_11223344\"]", children: [],
  }],
}, null, 2));
writeFileSync(join(newStyle, "texts.json"), JSON.stringify([
  { id: "txt-001", name: "Title", text: "标题", fontFamily: "PingFang SC", fontSize: 16, fontWeight: "600", color: "#111827", frame: childFrame },
], null, 2));
writeFileSync(join(newStyle, "styles.json"), JSON.stringify({ style_001: { fills: ["#ffffff"], borders: [], radius: 4, opacity: 1, shadows: [] } }, null, 2));
writeFileSync(join(newStyle, "tokens.json"), JSON.stringify({ colors: { color_001: "#ffffff" }, fontSize: { font_size_001: 16 }, radius: { radius_001: 4 } }, null, 2));
writeFileSync(join(newStyle, "components.json"), JSON.stringify([
  { id: "cmp_001", layerId: "layer-001", handoffId: "component_22334455", artboardId: "artboard_aabbccdd", name: "TopNav", inferredType: "navigation", confidence: 0.7, frame: childFrame, absoluteFrame: childFrame, text: null, textList: [], layerIds: ["layer-001"], domSelector: "[data-handoff-id=\"component_22334455\"]", implementationHint: { angularComponentName: "nz-header / app-header", suggestedInputs: [], suggestedOutputs: [], notes: ["顶部导航建议使用 nz-header 与 nz-menu 组合"] } },
], null, 2));
writeFileSync(join(newStyle, "assets-map.json"), JSON.stringify({ screenshot: null, assets: [], warnings: [] }, null, 2));

writeFileSync(join(newStyle, "handoff-map.json"), JSON.stringify({
  version: "1.0", source: "ngm-ai-handoff",
  nodes: [
    { handoffId: "artboard_aabbccdd", layerId: "artboard-001", componentId: null, artboardId: "artboard_aabbccdd", type: "artboard", name: "DemoPage", domSelector: "[data-handoff-id=\"artboard_aabbccdd\"]", frame: abFrame },
    { handoffId: "layer_11223344", layerId: "layer-001", componentId: null, artboardId: "artboard_aabbccdd", type: "layer", name: "TopNav", domSelector: "[data-handoff-id=\"layer_11223344\"]", frame: childFrame },
    { handoffId: "component_22334455", layerId: "layer-001", componentId: "cmp_001", artboardId: "artboard_aabbccdd", type: "component", name: "TopNav", domSelector: "[data-handoff-id=\"component_22334455\"]", frame: childFrame },
  ],
}, null, 2));
writeFileSync(join(newStyle, "design-context.md"), "# Design Context\n\n- 画板名称：DemoPage\n");
writeFileSync(join(newStyle, "preview.html"), "<!DOCTYPE html><html><body><div data-handoff-id=\"artboard_aabbccdd\"></div></body></html>");
writeFileSync(join(newStyle, "interaction-bridge.js"), "(function(){})();");
writeFileSync(join(newStyle, "agent-prompt.md"), "prompt");

const newStyleValidation = validateHandoffPackage(newStyle);
if (!newStyleValidation.ok) {
  throw new Error("Expected new-style fixture to be valid, got " + JSON.stringify(newStyleValidation.errors));
}
const newStyleHandoff = parseHandoffPackage(newStyle);
if (!newStyleHandoff.manifest || newStyleHandoff.manifest.specVersion !== "1.0") {
  throw new Error("New-style package should parse handoff.json manifest.");
}
if (!newStyleHandoff.handoffMap || newStyleHandoff.handoffMap.nodes.length !== 3) {
  throw new Error("New-style package should parse handoff-map.json with 3 nodes.");
}
if (!newStyleHandoff.designContext || newStyleHandoff.designContext.indexOf("Design Context") === -1) {
  throw new Error("New-style package should parse design-context.md.");
}
if (!newStyleHandoff.previewHtmlPath) {
  throw new Error("New-style package should expose previewHtmlPath.");
}
if (!newStyleHandoff.layerTree.handoffId) {
  throw new Error("New-style layer-tree root should carry handoffId.");
}
if (!newStyleHandoff.components[0] || !newStyleHandoff.components[0].layerId) {
  throw new Error("New-style component should associate layerId.");
}
const legacyValidation = validateHandoffPackage(valid);
if (!legacyValidation.ok) {
  throw new Error("Legacy package should remain valid.");
}
const legacyRecommendedWarnings = legacyValidation.warnings.filter(function (w) {
  return w.message && w.message.indexOf("Recommended handoff file") === 0;
});
if (legacyRecommendedWarnings.length === 0) {
  throw new Error("Legacy package should warn about missing recommended files.");
}
const summaries = scanHandoffPackages(root);
const newStyleSummary = summaries.find(function (s) { return s.packageDir === newStyle; });
if (!newStyleSummary || !newStyleSummary.hasPreviewHtml || !newStyleSummary.hasHandoffMap || !newStyleSummary.hasDesignContext) {
  throw new Error("Scanner should report new capability flags for new-style package.");
}

// 测试 .sketch 文件解析功能
async function testSketchFileParsing() {
  if (!parseSketchFile) {
    console.log("Skipping .sketch file parsing test (module not available)");
    return;
  }

  console.log("Testing .sketch file parsing...");

  // 创建一个模拟的 .sketch 文件（ZIP 格式）
  const JSZip = require("jszip");
  const zip = new JSZip();

  // 添加 meta.json
  zip.file("meta.json", JSON.stringify({
    commit: "test-commit",
    pagesAndArtboards: {
      "page-001": {
        name: "Test Page",
        artboards: {
          "artboard-001": { name: "TestArtboard" }
        }
      }
    },
    version: 135,
    compatibilityVersion: 99,
    app: "com.bohemiancoding.sketch3",
    autosaved: 0,
    variant: "NONAPPSTORE",
    created: {
      commit: "test-commit",
      appVersion: "83.2",
      build: 138642,
      app: "com.bohemiancoding.sketch3",
      compatibilityVersion: 99,
      version: 135,
      variant: "NONAPPSTORE"
    },
    saveHistory: ["NONAPPSTORE.138642"],
    appVersion: "83.2",
    build: 138642
  }));

  // 添加 document.json
  zip.file("document.json", JSON.stringify({
    _class: "document",
    do_objectID: "doc-001",
    assets: {
      _class: "assetCollection",
      colors: [],
      gradients: [],
      imageCollection: { _class: "imageCollection", images: {} },
      images: []
    },
    colorSpace: 0,
    currentPageIndex: 0,
    foreignLayerStyles: [],
    foreignSymbols: [],
    foreignTextStyles: [],
    layerStyles: { _class: "sharedStyleContainer", objects: [] },
    layerTextStyles: { _class: "sharedStyleContainer", objects: [] },
    layerSymbols: { _class: "symbolContainer", objects: [] }
  }));

  // 添加 pages/page-001.json
  zip.file("pages/page-001.json", JSON.stringify({
    _class: "page",
    do_objectID: "page-001",
    booleanOperation: -1,
    exportOptions: {
      _class: "exportOptions",
      includedLayerIds: [],
      layerOptions: 0,
      shouldTrim: false,
      exportFormats: []
    },
    frame: { _class: "rect", constrainProportions: false, height: 0, width: 0, x: 0, y: 0 },
    isFixedToViewport: false,
    isFlippedHorizontal: false,
    isFlippedVertical: false,
    isLocked: false,
    isVisible: true,
    layerListExpandedType: 0,
    name: "Test Page",
    nameIsFixed: false,
    resizingConstraint: 63,
    resizingType: 0,
    rotation: 0,
    shouldBreakMaskChain: false,
    layers: [
      {
        _class: "artboard",
        do_objectID: "artboard-001",
        booleanOperation: -1,
        exportOptions: {
          _class: "exportOptions",
          includedLayerIds: [],
          layerOptions: 0,
          shouldTrim: false,
          exportFormats: []
        },
        frame: { _class: "rect", constrainProportions: false, height: 900, width: 1440, x: 0, y: 0 },
        isFixedToViewport: false,
        isFlippedHorizontal: false,
        isFlippedVertical: false,
        isLocked: false,
        isVisible: true,
        layerListExpandedType: 0,
        name: "TestArtboard",
        nameIsFixed: false,
        resizingConstraint: 63,
        resizingType: 0,
        rotation: 0,
        shouldBreakMaskChain: false,
        style: {
          _class: "style",
          do_objectID: "style-001",
          endMarkerType: 0,
          miterLimit: 10,
          startMarkerType: 0,
          windingRule: 1,
          fills: [
            {
              _class: "fill",
              isEnabled: true,
              color: { _class: "color", alpha: 1, blue: 1, green: 1, red: 1 },
              fillType: 0,
              noiseIndex: 0,
              noiseIntensity: 0,
              patternFillType: 0,
              patternTileScale: 1
            }
          ],
          borders: [],
          shadows: []
        },
        layers: [
          {
            _class: "text",
            do_objectID: "text-001",
            booleanOperation: -1,
            exportOptions: {
              _class: "exportOptions",
              includedLayerIds: [],
              layerOptions: 0,
              shouldTrim: false,
              exportFormats: []
            },
            frame: { _class: "rect", constrainProportions: false, height: 40, width: 200, x: 100, y: 50 },
            isFixedToViewport: false,
            isFlippedHorizontal: false,
            isFlippedVertical: false,
            isLocked: false,
            isVisible: true,
            layerListExpandedType: 0,
            name: "Text/PageTitle",
            nameIsFixed: false,
            resizingConstraint: 63,
            resizingType: 0,
            rotation: 0,
            shouldBreakMaskChain: false,
            style: {
              _class: "style",
              do_objectID: "style-002",
              endMarkerType: 0,
              miterLimit: 10,
              startMarkerType: 0,
              windingRule: 1,
              textStyle: {
                _class: "textStyle",
                encodedAttributes: {
                  MSAttributedStringFontAttribute: {
                    _class: "fontDescriptor",
                    attributes: {
                      name: "PingFang SC",
                      size: 20
                    }
                  },
                  MSAttributedStringColorAttribute: {
                    _class: "color",
                    alpha: 1,
                    blue: 0.09,
                    green: 0.09,
                    red: 0.07
                  }
                },
                verticalAlignment: 0
              }
            },
            attributedString: {
              _class: "attributedString",
              string: "测试标题",
              attributes: []
            }
          }
        ]
      }
    ],
    hasClickThrough: true,
    includeInCloudUpload: true
  }));

  // 生成 ZIP 文件
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const sketchFilePath = join(root, "test.sketch");
  writeFileSync(sketchFilePath, zipBuffer);

  // 测试解析
  try {
    const result = await parseSketchFile({
      sketchFilePath,
      outputDir: join(root, "sketch-output"),
    });

    if (!result.handoff.meta.artboardName) {
      throw new Error("Failed to parse artboard name");
    }

    if (result.handoff.meta.artboardName !== "TestArtboard") {
      throw new Error(`Expected artboard name "TestArtboard", got "${result.handoff.meta.artboardName}"`);
    }

    if (result.handoff.texts.length === 0) {
      throw new Error("Expected at least one text node");
    }

    if (result.handoff.texts[0].text !== "测试标题") {
      throw new Error(`Expected text "测试标题", got "${result.handoff.texts[0].text}"`);
    }

    if (result.handoff.layerTree.type !== "Artboard") {
      throw new Error(`Expected layer type "Artboard", got "${result.handoff.layerTree.type}"`);
    }

    if (result.handoff.layerTree.children.length === 0) {
      throw new Error("Expected at least one child layer");
    }

    if (result.handoff.layerTree.children[0].type !== "Text") {
      throw new Error(`Expected child layer type "Text", got "${result.handoff.layerTree.children[0].type}"`);
    }

    // 检查输出文件是否创建
    if (!existsSync(join(root, "sketch-output", "meta.json"))) {
      throw new Error("Output meta.json was not created");
    }

    if (!existsSync(join(root, "sketch-output", "layer-tree.json"))) {
      throw new Error("Output layer-tree.json was not created");
    }

    if (!existsSync(join(root, "sketch-output", "texts.json"))) {
      throw new Error("Output texts.json was not created");
    }

    console.log("Sketch file parsing test passed");
  } catch (error) {
    console.error("Sketch file parsing test failed:", error.message);
    throw error;
  }
}

// 运行测试
testSketchFileParsing().then(() => {
  console.log("design-handoff smoke test passed");
}).catch((error) => {
  console.error("Smoke test failed:", error.message);
  process.exit(1);
});

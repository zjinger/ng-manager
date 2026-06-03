const { mkdtempSync, mkdirSync, writeFileSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");
const {
  generateAgentContext,
  generateAgentPrompt,
  parseHandoffPackage,
  validateHandoffPackage,
} = require("../lib");

const root = mkdtempSync(join(tmpdir(), "ngm-handoff-"));
const valid = join(root, "valid");
const invalid = join(root, "invalid");

mkdirSync(valid);
mkdirSync(invalid);

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

const invalidResult = validateHandoffPackage(invalid);
if (invalidResult.ok || invalidResult.errors.length === 0) {
  throw new Error("Expected invalid fixture to report missing files.");
}

console.log("design-handoff smoke test passed");

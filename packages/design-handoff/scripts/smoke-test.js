const { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");
const {
  createHandoffAgentTask,
  generateAgentContext,
  generateAgentPrompt,
  loadTargetProjectProfile,
  parseHandoffPackage,
  validateHandoffPackage,
} = require("../lib");

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

console.log("design-handoff smoke test passed");

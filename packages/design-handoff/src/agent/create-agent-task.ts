import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { basename, isAbsolute, join, resolve } from "path";
import { generateAgentContext } from "../generator";
import { HandoffArtifactType, resolveTargetProjectProfile, TargetProjectProfile } from "../profile";
import { parseHandoffPackage } from "../parser";
import { HandoffAgentContext } from "../schema";

export interface CreateHandoffAgentTaskOptions {
  packageDir: string;
  outputRoot?: string;
  slug?: string;
  targetProject?: string;
  profile?: string;
  profileData?: TargetProjectProfile;
  targetApp?: string;
  targetRoute?: string;
  targetPath?: string;
  artifactType?: HandoffArtifactType;
  mode?: "prototype" | "production";
}

export interface HandoffAgentTask {
  taskDir: string;
  promptPath: string;
  contextPath: string;
  screenshotPath: string | null;
  context: HandoffAgentContext;
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/[（）()]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "handoff-task"
  );
}

function packageOutputRoot(): string {
  return resolve(__dirname, "..", "..", "..", "..", ".artifacts", "design-handoff", "agent-tasks");
}

function looksLikePath(value: string | undefined): value is string {
  return Boolean(value && (isAbsolute(value) || value.startsWith(".") || value.includes("/") || value.includes("\\")));
}

function resolveDefaultOutputRoot(options: CreateHandoffAgentTaskOptions, profile: TargetProjectProfile | null): string {
  const targetRoot = profile?.projectRoot ?? (looksLikePath(options.targetApp) ? resolve(options.targetApp) : null);
  return targetRoot ? join(targetRoot, ".artifacts", "design-handoff", "agent-tasks") : packageOutputRoot();
}

interface ResolvedTaskTarget {
  targetApp: string;
  targetRoute: string;
  targetPath: string;
  artifactType: HandoffArtifactType;
  mode: "prototype" | "production";
  profile: TargetProjectProfile | null;
}

function listOrFallback(items: string[], fallback: string): string[] {
  return items.length > 0 ? items : [fallback];
}

function normalizeArtifactType(value: unknown): HandoffArtifactType {
  if (value === "static-html" || value === "framework-component") {
    return value;
  }

  throw new Error('Handoff agent task artifact type must be "static-html" or "framework-component".');
}

function buildPrompt(context: HandoffAgentContext, target: ResolvedTaskTarget): string {
  const screenshotLine = context.files.screenshot
    ? `- screenshot.png: visual reference copied from the handoff package`
    : "- screenshot.png: not available";
  const profile = target.profile;
  const frameworkLine = profile
    ? `${profile.framework} + ${profile.uiLibrary}`
    : "the target project's framework and UI library";
  const buildCommand = profile?.buildCommand || "Use the target project's documented build command.";
  const artifactGoal =
    target.artifactType === "static-html"
      ? "Build native HTML + CSS + JavaScript files from this Sketch handoff package."
      : `Build a ${target.mode} page from this Sketch handoff package using ${frameworkLine}.`;
  const artifactRules =
    target.artifactType === "static-html"
      ? [
          "- Generate native static files only: index.html, styles.css, and script.js.",
          "- Do not generate Angular, React, Vue, or framework component files in this pass.",
          "- Use semantic HTML, responsive CSS, and minimal JavaScript for interactions/mock state.",
          "- The static page can be opened directly in a browser without a dev server.",
        ]
      : [
          "- Use semantic components and the target project's existing UI primitives where they fit.",
          "- Follow the target framework's routing, component, state, and style conventions.",
        ];

  return [
    `# AI Handoff Coding Task: ${context.summary.artboardName}`,
    "",
    "## Goal",
    "",
    artifactGoal,
    "",
    "## Target",
    "",
    `- Project: ${profile?.name ?? target.targetApp}`,
    `- Project root: ${profile?.projectRoot ?? target.targetApp}`,
    `- Route: ${target.targetRoute || "Use the route from the target project profile."}`,
    `- Output path: ${target.targetPath || "Use the outputPath from the target project profile."}`,
    `- Artifact type: ${target.artifactType}`,
    `- Build command: ${buildCommand}`,
    "",
    "## Inputs",
    "",
    "- context.json: normalized handoff context for tools and agents",
    "- layer-tree.json: structure and geometry source",
    "- texts.json: required visible copy and table labels",
    "- styles.json / tokens.json: visual token reference",
    "- components.json: component hints; treat as advisory, not authoritative",
    screenshotLine,
    "",
    "## Target Project Context",
    "",
    "- Read the target project's package.json before implementation.",
    ...listOrFallback(profile?.styleGuide ?? [], "Read the target project's global styles and theme files.").map(
      (item) => `- Style guide: ${item}`,
    ),
    ...listOrFallback(profile?.referenceFiles ?? [], "Read similar pages/components in the target project.").map(
      (item) => `- Reference file: ${item}`,
    ),
    "",
    "## Implementation Rules",
    "",
    "- Do not copy Sketch DOM or generate absolute-positioned markup as the primary layout.",
    ...artifactRules,
    "- Match the target project's existing UI style instead of preserving this repository's demo styling.",
    "- Preserve visible Chinese labels, table columns, button text, status text, and pagination text.",
    ...(profile?.implementationRules ?? []),
    "- Do not modify unrelated routes, permissions, or existing business modules unless the profile explicitly requires it.",
    "",
    "## Acceptance Criteria",
    "",
    "- The generated page follows the target project's directory, routing, styling, and component conventions.",
    ...(target.artifactType === "static-html"
      ? ["- The output contains index.html, styles.css, and script.js under the target output path."]
      : ["- The output contains framework-native component/page files under the target output path."]),
    "- The page visually matches the screenshot at a 1920px desktop viewport.",
    "- The table, filters, status badges, action buttons, pagination, and top business navigation are present.",
    `- The target project build passes: ${buildCommand}`,
    "",
  ].join("\n");
}

export function createHandoffAgentTask(options: CreateHandoffAgentTaskOptions): HandoffAgentTask {
  const handoff = parseHandoffPackage(options.packageDir);
  const context = generateAgentContext(handoff);
  const profile = resolveTargetProjectProfile(options);
  const outputRoot = options.outputRoot ? resolve(options.outputRoot) : resolveDefaultOutputRoot(options, profile);
  const taskSlug = options.slug ?? slugify(handoff.meta.artboardName);
  const taskDir = join(outputRoot, taskSlug);
  const screenshotTarget = handoff.screenshotPath ? join(taskDir, "screenshot.png") : null;

  const resolved = {
    packageDir: options.packageDir,
    outputRoot,
    targetApp: options.targetApp ?? profile?.projectRoot ?? "target-project",
    targetRoute: options.targetRoute ?? profile?.route ?? "",
    targetPath: options.targetPath ?? profile?.outputPath ?? "",
    artifactType: normalizeArtifactType(options.artifactType ?? profile?.artifactType ?? "static-html"),
    mode: options.mode ?? "prototype",
    profile,
  };

  mkdirSync(taskDir, { recursive: true });

  if (handoff.screenshotPath && screenshotTarget) {
    copyFileSync(handoff.screenshotPath, screenshotTarget);
  }

  const sourceFiles = [
    "meta.json",
    "layer-tree.json",
    "texts.json",
    "styles.json",
    "tokens.json",
    "components.json",
    "assets-map.json",
    "agent-prompt.md",
  ].map((file) => ({
    name: file,
    path: join(handoff.packageDir, file),
    exists: existsSync(join(handoff.packageDir, file)),
  }));

  const contextForFile = {
    ...context,
    task: {
      targetApp: resolved.targetApp,
      targetRoute: resolved.targetRoute,
      targetPath: resolved.targetPath,
      artifactType: resolved.artifactType,
      mode: resolved.mode,
      profile: resolved.profile,
      sourcePackageDir: handoff.packageDir,
      sourceFiles,
      copiedScreenshot: screenshotTarget ? basename(screenshotTarget) : null,
    },
  };

  const prompt = buildPrompt(context, resolved);
  const promptPath = join(taskDir, "prompt.md");
  const contextPath = join(taskDir, "context.json");

  writeFileSync(promptPath, prompt, "utf8");
  writeFileSync(contextPath, JSON.stringify(contextForFile, null, 2), "utf8");

  return {
    taskDir,
    promptPath,
    contextPath,
    screenshotPath: screenshotTarget,
    context,
  };
}

import { existsSync, readFileSync, statSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";

export interface TargetProjectProfile {
  name: string;
  projectRoot: string;
  framework: string;
  uiLibrary: string;
  artifactType: HandoffArtifactType;
  outputPath: string;
  route: string;
  styleGuide: string[];
  referenceFiles: string[];
  buildCommand: string;
  implementationRules: string[];
}

export type HandoffArtifactType = "static-html" | "framework-component";

export interface ResolveTargetProjectProfileOptions {
  targetProject?: string;
  profile?: string;
  profileData?: TargetProjectProfile;
  targetApp?: string;
  targetRoute?: string;
  targetPath?: string;
  artifactType?: HandoffArtifactType;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Target project profile field "${field}" must be a non-empty string.`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Target project profile field "${field}" must be an array of strings.`);
  }

  return value.map((item, index) => readString(item, `${field}[${index}]`));
}

function readArtifactType(value: unknown): HandoffArtifactType {
  if (value === undefined || value === null || value === "") {
    return "static-html";
  }

  if (value === "static-html" || value === "framework-component") {
    return value;
  }

  throw new Error('Target project profile field "artifactType" must be "static-html" or "framework-component".');
}

function normalizeProfile(raw: unknown, baseDir: string): TargetProjectProfile {
  if (!isObject(raw)) {
    throw new Error("Target project profile must be a JSON object.");
  }

  const projectRootRaw = readString(raw.projectRoot, "projectRoot");
  const projectRoot = isAbsolute(projectRootRaw) ? projectRootRaw : resolve(baseDir, projectRootRaw);

  return {
    name: readString(raw.name, "name"),
    projectRoot,
    framework: readString(raw.framework, "framework"),
    uiLibrary: readString(raw.uiLibrary, "uiLibrary"),
    artifactType: readArtifactType(raw.artifactType),
    outputPath: readString(raw.outputPath, "outputPath"),
    route: readString(raw.route, "route"),
    styleGuide: readStringArray(raw.styleGuide, "styleGuide"),
    referenceFiles: readStringArray(raw.referenceFiles, "referenceFiles"),
    buildCommand: readString(raw.buildCommand, "buildCommand"),
    implementationRules: readStringArray(raw.implementationRules, "implementationRules"),
  };
}

function resolveProfilePath(profilePathOrProjectRoot: string): string {
  const resolved = resolve(profilePathOrProjectRoot);
  if (!existsSync(resolved)) {
    throw new Error(`Target project profile path does not exist: ${resolved}`);
  }

  const stat = statSync(resolved);
  if (stat.isDirectory()) {
    return join(resolved, ".ngm-handoff.json");
  }

  return resolved;
}

export function loadTargetProjectProfile(profilePathOrProjectRoot: string): TargetProjectProfile {
  const profilePath = resolveProfilePath(profilePathOrProjectRoot);
  if (!existsSync(profilePath)) {
    throw new Error(`Target project profile file does not exist: ${profilePath}`);
  }

  const content = readFileSync(profilePath, "utf8").replace(/^\uFEFF/, "");
  const raw = JSON.parse(content) as unknown;
  return normalizeProfile(raw, dirname(profilePath));
}

export function resolveTargetProjectProfile(
  options: ResolveTargetProjectProfileOptions,
): TargetProjectProfile | null {
  if (options.profileData) {
    return normalizeProfile(options.profileData, process.cwd());
  }

  if (options.profile) {
    return loadTargetProjectProfile(options.profile);
  }

  if (options.targetProject) {
    return loadTargetProjectProfile(options.targetProject);
  }

  if (options.targetApp || options.targetRoute || options.targetPath) {
    return {
      name: options.targetApp ?? "custom-target-project",
      projectRoot: options.targetApp ? resolve(options.targetApp) : process.cwd(),
      framework: "unknown",
      uiLibrary: "project-defined",
      artifactType: options.artifactType ?? "static-html",
      outputPath: options.targetPath ?? "",
      route: options.targetRoute ?? "",
      styleGuide: [],
      referenceFiles: ["package.json"],
      buildCommand: "",
      implementationRules: [
        "Read the target project structure before coding.",
        "Follow existing project conventions and UI style.",
      ],
    };
  }

  return null;
}

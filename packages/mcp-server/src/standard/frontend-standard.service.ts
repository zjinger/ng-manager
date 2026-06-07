import * as fs from "fs/promises";
import { defaultFrontendStandard } from "./frontend-standard.default";
import { frontendStandardSchema, summarizeFindings, type FrontendStandard, type StandardFinding } from "./frontend-standard.schema";
import { resolveNgManagerPath, pathExists, writeJsonFile, type ResolvedProjectRoot } from "../filesystem/project-files";
import { listProjectFiles, readSourceFiles, type SourceFile } from "./project-scan";
import { validateAngularStructure } from "./validators/angular-structure.validator";
import { validateComponentBoundary, validateComponentNaming } from "./validators/component.validator";
import { detectMissingSpecs, validateSpecNaming } from "./validators/test.validator";

export type LoadedFrontendStandard = {
  source: "file" | "default";
  path: string;
  standard: FrontendStandard;
};

export function standardConfigPath(projectRoot: string): string {
  return resolveNgManagerPath(projectRoot, "frontend-standard.json");
}

export async function loadFrontendStandard(project: ResolvedProjectRoot): Promise<LoadedFrontendStandard> {
  const filePath = standardConfigPath(project.projectRoot);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return {
      source: "file",
      path: filePath,
      standard: frontendStandardSchema.parse(JSON.parse(raw)),
    };
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") {
      throw error;
    }
    return {
      source: "default",
      path: filePath,
      standard: defaultFrontendStandard,
    };
  }
}

export async function initFrontendStandard(project: ResolvedProjectRoot, overwrite = false) {
  const filePath = standardConfigPath(project.projectRoot);
  const exists = await pathExists(filePath);
  if (exists && !overwrite) {
    return {
      status: "blocked",
      path: filePath,
      reason: "frontend-standard.json already exists; pass overwrite=true to replace it",
    };
  }
  await writeJsonFile(filePath, defaultFrontendStandard);
  return {
    status: "executed",
    path: filePath,
    changedFiles: [".ng-manager/frontend-standard.json"],
    standard: defaultFrontendStandard,
  };
}

export async function scanFrontendProject(projectRoot: string): Promise<SourceFile[]> {
  const files = await listProjectFiles(projectRoot);
  return readSourceFiles(files, (file) => file.path.endsWith(".ts") || file.path.endsWith("package.json"));
}

function mergeFindings(groups: StandardFinding[][]) {
  return summarizeFindings(groups.flat());
}

export async function validateFrontendProject(project: ResolvedProjectRoot, standard: FrontendStandard) {
  const files = await scanFrontendProject(project.projectRoot);
  const structure = validateAngularStructure(files, standard);
  const naming = validateComponentNaming(files, standard);
  const boundary = validateComponentBoundary(files, standard);
  const test = detectMissingSpecs(files, standard);
  const testNaming = validateSpecNaming(files);
  return {
    ...mergeFindings([structure.findings, naming.findings, boundary.findings, test.findings, testNaming.findings]),
    checks: {
      structure,
      componentNaming: naming,
      componentBoundary: boundary,
      missingSpecs: test,
      testNaming,
    },
  };
}

import * as path from "path";
import type { FrontendStandard, StandardFinding } from "../frontend-standard.schema";
import { summarizeFindings } from "../frontend-standard.schema";
import type { SourceFile } from "../project-scan";

function hasDirectory(files: SourceFile[], dir: string): boolean {
  const normalized = dir.replace(/\\/g, "/").replace(/\/$/, "");
  return files.some((file) => file.path === normalized || file.path.startsWith(`${normalized}/`));
}

export function validateAngularStructure(files: SourceFile[], standard: FrontendStandard) {
  const findings: StandardFinding[] = [];
  for (const [key, dir] of Object.entries({
    pages: standard.structure.pagesDir,
    components: standard.structure.componentsDir,
    services: standard.structure.servicesDir,
    models: standard.structure.modelsDir,
  })) {
    if (!hasDirectory(files, dir)) {
      findings.push({
        ruleId: `angular.structure.${key}`,
        severity: "warning",
        message: `Expected Angular ${key} directory was not found: ${dir}`,
        suggestion: `Create ${dir} when this project owns Angular ${key} code, or update frontend-standard.json for this project.`,
      });
    }
  }
  return summarizeFindings(findings);
}

export function validatePagePlacement(files: SourceFile[], standard: FrontendStandard): StandardFinding[] {
  const pagesDir = standard.structure.pagesDir.replace(/\\/g, "/").replace(/\/$/, "");
  return files
    .filter((file) => file.path.endsWith(".page.ts") || path.basename(file.path).includes("-page.component."))
    .filter((file) => !file.path.startsWith(`${pagesDir}/`))
    .map((file) => ({
      ruleId: "angular.page-placement",
      severity: "warning" as const,
      message: `Page component is outside ${pagesDir}.`,
      file: file.path,
      suggestion: "Move route/page-level components under the configured pages directory.",
    }));
}

import * as path from "path";
import type { FrontendStandard, StandardFinding } from "../frontend-standard.schema";
import { summarizeFindings } from "../frontend-standard.schema";
import type { SourceFile } from "../project-scan";
import { validatePagePlacement } from "./angular-structure.validator";

function isComponentTs(file: SourceFile): boolean {
  return file.path.endsWith(".component.ts") || file.path.endsWith(".page.ts");
}

function hasAllowedSuffix(filePath: string, standard: FrontendStandard): boolean {
  const base = path.basename(filePath).replace(/\.ts$/, "");
  return standard.naming.componentSuffixes.some((suffix) => base.endsWith(`.${suffix}`) || base.endsWith(`-${suffix}`));
}

export function validateComponentNaming(files: SourceFile[], standard: FrontendStandard) {
  const findings = files
    .filter(isComponentTs)
    .filter((file) => !hasAllowedSuffix(file.path, standard))
    .map((file) => ({
      ruleId: "angular.component-naming",
      severity: "warning" as const,
      message: "Component file name does not use an expected page/component/dialog/drawer/table/form suffix.",
      file: file.path,
      suggestion: "Rename the component file or adjust naming.componentSuffixes in frontend-standard.json.",
    }));
  return summarizeFindings(findings);
}

export function validateComponentBoundary(files: SourceFile[], standard: FrontendStandard) {
  const findings: StandardFinding[] = [...validatePagePlacement(files, standard)];
  for (const file of files.filter((item) => item.path.endsWith(".ts"))) {
    const text = file.text ?? "";
    if (isComponentTs(file) && file.lineCount && file.lineCount > standard.structure.maxComponentFileLines) {
      findings.push({
        ruleId: "angular.component-size",
        severity: "warning",
        message: `Component file has ${file.lineCount} lines, above configured limit ${standard.structure.maxComponentFileLines}.`,
        file: file.path,
        suggestion: "Split large component logic into services, child components, or focused helpers.",
      });
    }
    if (/\bany\b/.test(text)) {
      findings.push({
        ruleId: "typescript.no-obvious-any",
        severity: "warning",
        message: "File contains obvious any usage.",
        file: file.path,
        suggestion: "Replace any with explicit DTO, model, generic, or unknown at external boundaries.",
      });
    }
    if (/https?:\/\/(?!127\.0\.0\.1|localhost|::1)[^\s'"`]+/.test(text)) {
      findings.push({
        ruleId: "angular.no-hardcoded-api-url",
        severity: "warning",
        message: "File appears to contain a hardcoded remote API URL.",
        file: file.path,
        suggestion: "Move API origins into environment/runtime configuration or an API client service.",
      });
    }
  }
  return summarizeFindings(findings);
}

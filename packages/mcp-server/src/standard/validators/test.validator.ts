import * as path from "path";
import type { FrontendStandard, StandardFinding } from "../frontend-standard.schema";
import { summarizeFindings } from "../frontend-standard.schema";
import type { SourceFile } from "../project-scan";

function specPathFor(filePath: string): string {
  return filePath.replace(/\.ts$/, ".spec.ts");
}

function hasFile(files: SourceFile[], filePath: string): boolean {
  return files.some((file) => file.path === filePath);
}

export function detectMissingSpecs(files: SourceFile[], standard: FrontendStandard) {
  const findings: StandardFinding[] = [];
  const tsFiles = files.filter((file) => file.path.endsWith(".ts") && !file.path.endsWith(".spec.ts"));

  for (const file of tsFiles) {
    const base = path.basename(file.path);
    const needsServiceSpec = standard.testing.requireServiceSpec && base.endsWith(".service.ts");
    const needsUtilSpec = standard.testing.requireUtilSpec && (base.endsWith(".util.ts") || base.endsWith(".utils.ts"));
    const suggestsComponentSpec = standard.testing.suggestComponentSpec && base.endsWith(".component.ts") && (file.lineCount ?? 0) >= 120;
    if ((needsServiceSpec || needsUtilSpec || suggestsComponentSpec) && !hasFile(files, specPathFor(file.path))) {
      findings.push({
        ruleId: needsServiceSpec ? "test.missing-service-spec" : needsUtilSpec ? "test.missing-util-spec" : "test.missing-component-spec",
        severity: "warning",
        message: `Missing suggested spec file for ${file.path}.`,
        file: file.path,
        suggestion: `Add ${specPathFor(file.path)} or document why this file is covered elsewhere.`,
      });
    }
  }

  return summarizeFindings(findings);
}

export function validateSpecNaming(files: SourceFile[]) {
  const findings = files
    .filter((file) => file.path.endsWith(".test.ts") || file.path.endsWith(".tests.ts"))
    .map((file) => ({
      ruleId: "test.naming",
      severity: "warning" as const,
      message: "Angular frontend tests should use .spec.ts naming.",
      file: file.path,
      suggestion: "Rename frontend test files to .spec.ts where Angular tooling expects it.",
    }));
  return summarizeFindings(findings);
}

export function generateSpecPlan(files: SourceFile[], standard: FrontendStandard) {
  const missing = detectMissingSpecs(files, standard);
  return {
    ...missing,
    plan: missing.findings.map((finding) => ({
      sourceFile: finding.file,
      suggestedSpecFile: finding.suggestion?.match(/Add ([^ ]+)/)?.[1],
      focus: finding.ruleId.includes("service") ? "service behavior and API contracts" : finding.ruleId.includes("util") ? "pure utility inputs and edge cases" : "component inputs, outputs, and key rendering states",
    })),
  };
}

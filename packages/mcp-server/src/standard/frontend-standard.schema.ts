import { z } from "zod";

export const frontendStandardSchema = z.object({
  framework: z.object({
    name: z.string().min(1),
    version: z.string().optional(),
  }).strict(),
  uiLibrary: z.object({
    name: z.string().min(1),
    componentPrefix: z.string().optional(),
  }).strict(),
  style: z.object({
    language: z.string().min(1),
    fileExtension: z.string().min(1),
  }).strict(),
  naming: z.object({
    branchPatterns: z.array(z.string()).min(1),
    commitTypes: z.array(z.string()).min(1),
    componentSuffixes: z.array(z.string()).min(1),
  }).strict(),
  structure: z.object({
    pagesDir: z.string().min(1),
    componentsDir: z.string().min(1),
    servicesDir: z.string().min(1),
    modelsDir: z.string().min(1),
    maxComponentFileLines: z.number().int().min(50).max(2000),
  }).strict(),
  git: z.object({
    branchPatterns: z.array(z.string()).min(1),
    commitPattern: z.string().min(1),
  }).strict(),
  testing: z.object({
    requireServiceSpec: z.boolean(),
    requireUtilSpec: z.boolean(),
    suggestComponentSpec: z.boolean(),
  }).strict(),
  review: z.object({
    requireChecklist: z.boolean(),
    riskKeywords: z.array(z.string()),
  }).strict(),
}).strict();

export type FrontendStandard = z.infer<typeof frontendStandardSchema>;

export type FindingSeverity = "info" | "warning" | "error";
export type CheckStatus = "passed" | "warning" | "failed" | "blocked";

export type StandardFinding = {
  ruleId: string;
  severity: FindingSeverity;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
};

export type StandardCheckResult = {
  status: CheckStatus;
  findings: StandardFinding[];
  summary: {
    passed: number;
    warnings: number;
    errors: number;
    nextSteps: string[];
  };
};

export function summarizeFindings(findings: StandardFinding[]): StandardCheckResult {
  const errors = findings.filter((item) => item.severity === "error").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  const status: CheckStatus = errors > 0 ? "failed" : warnings > 0 ? "warning" : "passed";
  return {
    status,
    findings,
    summary: {
      passed: findings.length === 0 ? 1 : 0,
      warnings,
      errors,
      nextSteps: findings.length === 0
        ? ["No action required."]
        : findings.slice(0, 5).map((item) => item.suggestion ?? item.message),
    },
  };
}

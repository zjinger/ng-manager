import type { FrontendStandard, StandardFinding } from "../frontend-standard.schema";
import { summarizeFindings } from "../frontend-standard.schema";

export function validateBranchName(branchName: string, standard: FrontendStandard) {
  const matched = standard.git.branchPatterns.some((pattern) => new RegExp(pattern).test(branchName));
  const findings: StandardFinding[] = matched ? [] : [{
    ruleId: "git.branch-name",
    severity: "error",
    message: `Branch name does not match allowed frontend workflow patterns: ${branchName}`,
    suggestion: "Use feature/{issueId}-{short-name}, fix/{issueId}-{short-name}, refactor/{module}-{short-name}, or hotfix/{date}-{short-name}.",
  }];
  return summarizeFindings(findings);
}

export function validateCommitMessage(message: string, standard: FrontendStandard) {
  const matched = new RegExp(standard.git.commitPattern).test(message);
  const findings: StandardFinding[] = matched ? [] : [{
    ruleId: "git.commit-message",
    severity: "error",
    message: `Commit message does not match conventional frontend format: ${message}`,
    suggestion: "Use feat(scope): message, fix(scope): message, refactor(scope): message, docs(scope): message, test(scope): message, or chore(scope): message.",
  }];
  return summarizeFindings(findings);
}

export function generateCommitMessage(input: {
  type?: string;
  scope?: string;
  summary: string;
}, standard: FrontendStandard): string {
  const type = input.type && standard.naming.commitTypes.includes(input.type) ? input.type : "chore";
  const scope = (input.scope ?? "frontend").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "frontend";
  const summary = input.summary.trim().replace(/\s+/g, " ");
  return `${type}(${scope}): ${summary}`;
}

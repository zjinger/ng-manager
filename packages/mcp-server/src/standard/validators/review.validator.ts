import type { FrontendStandard, StandardFinding } from "../frontend-standard.schema";
import { summarizeFindings } from "../frontend-standard.schema";
import type { SourceFile } from "../project-scan";

export function detectReviewRisks(files: SourceFile[], changedFiles: string[], standard: FrontendStandard) {
  const changedSet = new Set(changedFiles.map((item) => item.replace(/\\/g, "/")));
  const findings: StandardFinding[] = [];

  for (const file of files.filter((item) => changedSet.has(item.path))) {
    const text = file.text ?? "";
    for (const keyword of standard.review.riskKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase()) || file.path.toLowerCase().includes(keyword.toLowerCase())) {
        findings.push({
          ruleId: "review.risk-keyword",
          severity: "warning",
          message: `Changed file matches review risk keyword: ${keyword}`,
          file: file.path,
          suggestion: "Add explicit human review notes for permission, security, data loss, lifecycle, or migration impact.",
        });
        break;
      }
    }
    if (file.path.endsWith("package.json")) {
      findings.push({
        ruleId: "review.package-json-change",
        severity: "warning",
        message: "package.json changed.",
        file: file.path,
        suggestion: "Confirm scripts, dependencies, package exports, and release impact.",
      });
    }
  }

  return summarizeFindings(findings);
}

export function reviewChecklist(changedFiles: string[]) {
  return [
    "确认变更范围只覆盖本次任务需要的文件。",
    "确认无 token/password/secret/cookie/authorization 泄漏。",
    "确认 UI、API、任务运行时或配置写入契约没有意外破坏。",
    "确认新增或变更逻辑已有对应测试计划。",
    changedFiles.length > 0 ? `确认 ${changedFiles.length} 个变更文件都已人工扫过。` : "确认当前没有检测到 Git 变更文件。",
  ];
}

export function generateReviewMarkdown(input: {
  taskId: string;
  changedFiles: string[];
  checks: Array<{ title: string; status: string; findings: StandardFinding[] }>;
  risks: StandardFinding[];
  checklist: string[];
}): string {
  const lines = [
    `# Review Report ${input.taskId}`,
    "",
    "## Changed Files",
    ...(input.changedFiles.length ? input.changedFiles.map((file) => `- ${file}`) : ["- No changed files detected."]),
    "",
    "## Automated Checks",
  ];
  for (const check of input.checks) {
    lines.push(`- ${check.title}: ${check.status}`);
    for (const finding of check.findings.slice(0, 20)) {
      lines.push(`  - [${finding.severity}] ${finding.file ? `${finding.file}: ` : ""}${finding.message}`);
    }
  }
  lines.push("", "## Risks");
  lines.push(...(input.risks.length ? input.risks.map((risk) => `- [${risk.severity}] ${risk.file ? `${risk.file}: ` : ""}${risk.message}`) : ["- No automated risks detected."]));
  lines.push("", "## Suggestions");
  lines.push(...input.checklist.map((item) => `- ${item}`));
  lines.push("", "## Manual Confirmation");
  lines.push("- [ ] Scope is correct.", "- [ ] Tests or verification are sufficient.", "- [ ] No sensitive data is included.");
  return lines.join("\n");
}

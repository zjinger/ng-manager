import type { CapabilityCatalogEntry } from "../types";

export const frontendStandardCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "frontend-standard",
    label: "Enterprise frontend standard, Angular structure checks, test guidance, code review reports, and workflow task files",
    skills: ["ngm-frontend-standard"],
    tools: [
      "ngm.standard.get",
      "ngm.standard.init",
      "ngm.standard.validateProject",
      "ngm.git.validateBranchName",
      "ngm.git.validateCommitMessage",
      "ngm.git.generateCommitMessage",
      "ngm.git.generateReviewSummary",
      "ngm.test.detectMissingSpecs",
      "ngm.test.generateSpecPlan",
      "ngm.test.validateNaming",
      "ngm.angular.validateStructure",
      "ngm.angular.validateComponentNaming",
      "ngm.angular.validateComponentBoundary",
      "ngm.review.scanChangedFiles",
      "ngm.review.generateChecklist",
      "ngm.review.detectRisks",
      "ngm.review.generateReport",
      "ngm.workflow.createFrontendTask",
      "ngm.workflow.generateDevPlan",
      "ngm.workflow.advanceStatus",
      "ngm.workflow.validateBeforeWrite",
      "ngm.workflow.validateBeforeCommit",
      "ngm.workflow.generateDeliveryReport",
    ],
    notes: ["Write tools only write project-local .ng-manager files and require confirm=true plus NGM_MCP_ALLOW_WRITE=true."],
  },
];


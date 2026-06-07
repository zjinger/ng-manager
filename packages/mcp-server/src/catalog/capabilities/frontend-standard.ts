import type { CapabilityCatalogEntry } from "../types";

export const frontendStandardCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "frontend-standard",
    label: "Enterprise frontend standard, Angular structure checks, test guidance, code review reports, and workflow task files",
    skills: ["ngm-frontend-standard"],
    tools: [
      "ngm_standard_get",
      "ngm_standard_init",
      "ngm_standard_validate_project",
      "ngm_git_validate_branch_name",
      "ngm_git_validate_commit_message",
      "ngm_git_generate_commit_message",
      "ngm_git_generate_review_summary",
      "ngm_test_detect_missing_specs",
      "ngm_test_generate_spec_plan",
      "ngm_test_validate_naming",
      "ngm_angular_validate_structure",
      "ngm_angular_validate_component_naming",
      "ngm_angular_validate_component_boundary",
      "ngm_review_scan_changed_files",
      "ngm_review_generate_checklist",
      "ngm_review_detect_risks",
      "ngm_review_generate_report",
      "ngm_workflow_create_frontend_task",
      "ngm_workflow_generate_dev_plan",
      "ngm_workflow_advance_status",
      "ngm_workflow_validate_before_write",
      "ngm_workflow_validate_before_commit",
      "ngm_workflow_generate_delivery_report",
    ],
    notes: ["Write tools only write project-local .ng-manager files and require confirm=true plus NGM_MCP_ALLOW_WRITE=true."],
  },
];


import type { CapabilityCatalogEntry } from "../types";

export const hubV2Capabilities: CapabilityCatalogEntry[] = [
  {
    id: "hub-v2",
    label: "Hub V2 collaboration data: issues, RD workflows, documents, members, and uploads",
    skills: ["hub-v2-api", "hub-v2-docs"],
    tools: [
      "hub_v2_projects_list",
      "hub_v2_projects_get",
      "hub_v2_project_members_list",
      "hub_v2_docs_list",
      "hub_v2_docs_get",
      "hub_v2_docs_get_by_slug",
      "hub_v2_docs_create",
      "hub_v2_docs_update",
      "hub_v2_issues_list",
      "hub_v2_issues_get",
      "hub_v2_issues_create",
      "hub_v2_issues_comment",
      "hub_v2_issues_assign",
      "hub_v2_issues_update",
      "hub_v2_upload_markdown_image",
      "hub_v2_rd_list",
      "hub_v2_rd_get",
      "hub_v2_rd_stage_tasks_list",
      "hub_v2_rd_create",
      "hub_v2_rd_advance_stage",
      "hub_v2_rd_stage_tasks_create",
      "hub_v2_rd_update_progress",
      "hub_v2_rd_member_blocks_list",
      "hub_v2_rd_member_block_create",
      "hub_v2_rd_member_block_resolve",
    ],
  },
];


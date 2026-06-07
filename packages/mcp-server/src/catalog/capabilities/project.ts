import type { CapabilityCatalogEntry } from "../types";

export const projectCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "project",
    label: "Local project entries, package.json scripts, task views, process status, and logs",
    skills: ["ngm-project"],
    tools: [
      "ngm_project_managed_list",
      "ngm_project_find",
      "ngm_project_get",
      "ngm_project_get_scripts",
      "ngm_project_read_package_json",
      "ngm_file_write",
      "ngm_project_run_script",
      "ngm_project_stop",
      "ngm_task_list",
      "ngm_task_get_status",
      "ngm_log_tail",
    ],
  },
];


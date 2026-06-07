import type { CapabilityCatalogEntry } from "../types";

export const projectCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "project",
    label: "Local project entries, package.json scripts, task views, process status, and logs",
    skills: ["ngm-project"],
    tools: [
      "ngm.project.list",
      "ngm_project_list",
      "ngm.project.find",
      "ngm.project.get",
      "ngm.project.getScripts",
      "ngm.project.readPackageJson",
      "ngm_file_write",
      "ngm_project_run_script",
      "ngm.project.runScript",
      "ngm_project_stop",
      "ngm.project.stop",
      "ngm_project_list_tasks",
      "ngm_project_task_status",
      "ngm_project_task_logs",
      "ngm_project_port_check",
      "ngm_project_health_check",
      "ngm.task.list",
      "ngm.task.getStatus",
      "ngm.log.tail",
    ],
  },
];


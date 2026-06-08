import type { ToolCatalogEntry } from "../types";

export const nginxTools: ToolCatalogEntry[] = [
  {
    name: "ngm_nginx_status",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Read local Nginx binding and process status.",
  },
  {
    name: "ngm_nginx_servers_list",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "List local Nginx server blocks.",
  },
  {
    name: "ngm_nginx_server_get",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Get one local Nginx server block.",
  },
  {
    name: "ngm_nginx_upstreams_list",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "List local Nginx upstream definitions.",
  },
  {
    name: "ngm_nginx_config_validate",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Validate current or supplied local Nginx config without reload.",
  },
  {
    name: "ngm_nginx_config_get_main",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Read local Nginx main config metadata and content.",
  },
  {
    name: "ngm_nginx_logs_tail",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Read recent local Nginx access or error log lines.",
  },
  {
    name: "ngm_nginx_reload",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "execute",
    description: "Validate and preview or reload the ng-manager managed local Nginx instance; preferred over direct nginx commands and audit logged when confirmed.",
  },
  {
    name: "ngm_nginx_proxy_save",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "write",
    description: "Preview or save a ng-manager managed Nginx proxy server block; validates inputs, avoids arbitrary file writes, and audit logs confirmed saves.",
  },
  {
    name: "ngm_proxy_list",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Compatibility tool for current ng-manager Nginx/proxy bindings.",
  },
  {
    name: "ngm_proxy_validate",
    skill: "ngm-nginx",
    capability: "nginx",
    riskLevel: "read",
    description: "Compatibility tool for validating Nginx/proxy config.",
  },
];


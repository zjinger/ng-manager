import type { CapabilityCatalogEntry } from "../types";

export const nginxCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "nginx",
    label: "Local Nginx status, server blocks, upstreams, config validation, and logs",
    skills: ["ngm-nginx"],
    tools: [
      "ngm_nginx_status",
      "ngm_nginx_servers_list",
      "ngm_nginx_server_get",
      "ngm_nginx_upstreams_list",
      "ngm_nginx_config_validate",
      "ngm_nginx_config_get_main",
      "ngm_nginx_logs_tail",
      "ngm_nginx_reload",
      "ngm_nginx_proxy_save",
      "ngm_proxy_list",
      "ngm_proxy_validate",
    ],
  },
];


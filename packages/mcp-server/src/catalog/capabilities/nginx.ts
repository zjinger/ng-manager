import type { CapabilityCatalogEntry } from "../types";

export const nginxCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "nginx",
    label: "Local Nginx status, server blocks, upstreams, config validation, and logs",
    skills: ["ngm-nginx"],
    tools: [
      "ngm.nginx.status",
      "ngm.nginx.servers.list",
      "ngm.nginx.server.get",
      "ngm.nginx.upstreams.list",
      "ngm.nginx.config.validate",
      "ngm.nginx.config.getMain",
      "ngm.nginx.logs.tail",
      "ngm_nginx_reload",
      "ngm.nginx.reload",
      "ngm_nginx_proxy_save",
      "ngm.nginx.proxy.save",
      "ngm.proxy.list",
      "ngm.proxy.validate",
    ],
  },
];


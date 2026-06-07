import { buildCapabilityCatalog, buildToolCatalog } from "./helpers";
import { blockedLocalActions } from "./capabilities/blocked-local-actions";
import { frontendStandardCapabilities } from "./capabilities/frontend-standard";
import { hubV2Capabilities } from "./capabilities/hub-v2";
import { nginxCapabilities } from "./capabilities/nginx";
import { projectCapabilities } from "./capabilities/project";
import { routerCapabilities } from "./capabilities/router";
import { runtimeCapabilities } from "./capabilities/runtime";
import { workspaceCapabilities } from "./capabilities/workspace";
import { frontendStandardTools } from "./tools/frontend-standard";
import { hubV2ApiTools } from "./tools/hub-v2-api";
import { hubV2DocsTools } from "./tools/hub-v2-docs";
import { nginxTools } from "./tools/nginx";
import { projectTools } from "./tools/project";
import { routerTools } from "./tools/router";
import { runtimeTools } from "./tools/runtime";
import { workspaceTools } from "./tools/workspace";

export const toolCatalog = buildToolCatalog(
  routerTools,
  workspaceTools,
  projectTools,
  runtimeTools,
  nginxTools,
  frontendStandardTools,
  hubV2DocsTools,
  hubV2ApiTools
);

export const capabilityCatalog = buildCapabilityCatalog(
  toolCatalog,
  routerCapabilities,
  workspaceCapabilities,
  frontendStandardCapabilities,
  projectCapabilities,
  runtimeCapabilities,
  nginxCapabilities,
  hubV2Capabilities
);

export { blockedLocalActions };

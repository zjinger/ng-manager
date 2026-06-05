import type { McpToolDefinition } from "../index";
import { hubV2DocsTools } from "./docs.tools";
import { hubV2IssuesTools } from "./issues.tools";
import { hubV2ProjectsTools } from "./projects.tools";
import { hubV2RdTools } from "./rd.tools";
import { hubV2UploadTools } from "./upload.tools";

export function hubV2Tools(): McpToolDefinition[] {
  return [
    ...hubV2ProjectsTools(),
    ...hubV2DocsTools(),
    ...hubV2IssuesTools(),
    ...hubV2RdTools(),
    ...hubV2UploadTools(),
  ];
}

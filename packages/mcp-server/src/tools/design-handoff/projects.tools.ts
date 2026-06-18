/**
 * 项目相关工具
 */
import type { McpToolDefinition } from "../index";
import { DesignHandoffClient, resolveDesignHandoffConfig } from "./shared";
import { listProjectsSchema, getProjectSchema } from "./schemas";
import { fail, ok } from "../../utils/result";
import type { Project } from "./shared";

export function projectTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_list_projects",
      description:
        "获取 Sprite Generator 项目列表。返回项目 ID、名称、SVN 地址等基本信息。",
      riskLevel: "read",
      inputSchema: listProjectsSchema,
      async handler() {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const data = await client.get<Project[]>("/api/projects");
          return ok("design_handoff_list_projects", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_list_projects", message);
        }
      },
    },
    {
      name: "design_handoff_get_project",
      description:
        "获取单个 Sprite Generator 项目的完整详情，包括 SVN 配置、CSS 前缀、运行时状态等。",
      riskLevel: "read",
      inputSchema: getProjectSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const data = await client.get<Project>(
            `/api/projects/${encodeURIComponent(args.projectId)}`,
          );
          return ok("design_handoff_get_project", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_get_project", message);
        }
      },
    },
    {
      name: "design_handoff_get_app_info",
      description:
        "获取 Sprite Generator 应用的基本信息，包括应用名称、版本号和运行环境。",
      riskLevel: "read",
      inputSchema: listProjectsSchema,
      async handler() {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const data = await client.get<Record<string, unknown>>("/api/app-info");
          return ok("design_handoff_get_app_info", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_get_app_info", message);
        }
      },
    },
  ];
}

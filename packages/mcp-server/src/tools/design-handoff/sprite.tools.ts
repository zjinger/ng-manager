/**
 * 雪碧图相关工具
 */
import type { McpToolDefinition } from "../index";
import { DesignHandoffClient, resolveDesignHandoffConfig } from "./shared";
import { listGroupsSchema, getSpriteResultsSchema } from "./schemas";
import { fail, ok } from "../../utils/result";

export function spriteTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_list_groups",
      description:
        "列出项目中所有可用的图标分组。分组名格式通常为 '尺寸-尺寸'，如 '10-10'、'20-20'。",
      riskLevel: "read",
      inputSchema: listGroupsSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const data = await client.get<unknown[]>(
            "/api/groups",
            { projectId: args.projectId },
          );
          return ok("design_handoff_list_groups", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_list_groups", message);
        }
      },
    },
    {
      name: "design_handoff_get_sprite_results",
      description:
        "获取项目已生成的雪碧图结果列表，包括每个分组的图片路径、CSS 路径和图标数量。",
      riskLevel: "read",
      inputSchema: getSpriteResultsSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const data = await client.get<unknown[]>(
            "/api/project-sprites",
            { projectId: args.projectId },
          );
          return ok("design_handoff_get_sprite_results", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_get_sprite_results", message);
        }
      },
    },
  ];
}

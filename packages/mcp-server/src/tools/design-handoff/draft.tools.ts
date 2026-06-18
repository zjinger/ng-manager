/**
 * 设计稿相关工具
 */
import type { McpToolDefinition } from "../index";
import { DesignHandoffClient, resolveDesignHandoffConfig } from "./shared";
import { listDraftFilesSchema, listPrototypeFilesSchema } from "./schemas";
import { fail, ok } from "../../utils/result";
import type { DraftListResponse } from "./shared";

export function draftTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_list_drafts",
      description:
        "列出项目中的设计稿文件（HTML 格式）。默认只返回 index.html 入口文件。可指定子目录路径浏览嵌套目录。设计稿支持 SVN 和本地上传两种来源。",
      riskLevel: "read",
      inputSchema: listDraftFilesSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const query: Record<string, unknown> = { projectId: args.projectId };
          if (args.subPath) query.draftSubPath = args.subPath;
          // 默认只返回 index.html，除非明确指定 indexOnly: false
          query.indexOnly = args.indexOnly !== false ? "1" : "0";

          const data = await client.get<DraftListResponse>(
            "/api/draft/list",
            query,
          );
          return ok("design_handoff_list_drafts", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_list_drafts", message);
        }
      },
    },
    {
      name: "design_handoff_list_prototypes",
      description:
        "列出项目中的原型图文件（HTML 格式）。默认只返回 index.html 入口文件。可指定子目录路径浏览嵌套目录。",
      riskLevel: "read",
      inputSchema: listPrototypeFilesSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const query: Record<string, unknown> = { projectId: args.projectId };
          if (args.subPath) query.prototypeSubPath = args.subPath;
          // 默认只返回 index.html，除非明确指定 indexOnly: false
          query.indexOnly = args.indexOnly !== false ? "1" : "0";

          const data = await client.get<DraftListResponse>(
            "/api/prototype/list",
            query,
          );
          return ok("design_handoff_list_prototypes", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_list_prototypes", message);
        }
      },
    },
  ];
}

/**
 * 杂项图片相关工具
 */
import type { McpToolDefinition } from "../index";
import { DesignHandoffClient, resolveDesignHandoffConfig } from "./shared";
import { listMiscImagesSchema, downloadMiscZipSchema } from "./schemas";
import { fail, ok } from "../../utils/result";
import type { MiscListResponse } from "./shared";

export function miscTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_list_misc_images",
      description:
        "列出项目的杂项图片资源。可指定子目录路径浏览嵌套目录。",
      riskLevel: "read",
      inputSchema: listMiscImagesSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const query: Record<string, unknown> = { projectId: args.projectId };
          if (args.subPath) query.miscSubPath = args.subPath;

          const data = await client.get<MiscListResponse>(
            "/api/misc/list",
            query,
          );
          return ok("design_handoff_list_misc_images", data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_list_misc_images", message);
        }
      },
    },
    {
      name: "design_handoff_download_assets",
      description:
        "下载项目全部切图（杂项图片）的 ZIP 压缩包。会将项目 misc 目录下的所有图片打包为 ZIP 返回。",
      riskLevel: "read",
      inputSchema: downloadMiscZipSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        try {
          const data = await client.download(
            `/api/sprite/${encodeURIComponent(args.projectId)}/misc-zip`,
          );
          return ok("design_handoff_download_assets", {
            projectId: args.projectId,
            contentType: data.contentType,
            contentLength: data.contentLength,
            message: `ZIP 文件大小: ${(data.contentLength / 1024).toFixed(1)} KB`,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_download_assets", message);
        }
      },
    },
  ];
}

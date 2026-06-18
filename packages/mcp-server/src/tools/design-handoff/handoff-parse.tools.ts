/**
 * 设计稿解析相关工具（预留）
 * 当 sprite-generator 实现解析功能后，更新此文件中的 handler
 */
import type { McpToolDefinition } from "../index";
import { parseDraftSchema, getParseResultSchema } from "./schemas";
import { fail } from "../../utils/result";

export function handoffParseTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_parse",
      description:
        "解析设计稿文件，提取 tokens、组件、资源等信息。注意：此功能尚未实现，等待后续版本。",
      riskLevel: "write",
      inputSchema: parseDraftSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: () => false,
      async handler(args) {
        // 预留接口，未来实现
        // 实现时需要：
        // 1. const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        // 2. const data = await client.post("/api/handoff/parse", { projectId: args.projectId, filePath: args.filePath });
        // 3. return ok("design_handoff_parse", data);

        return fail(
          "design_handoff_parse",
          "设计稿解析功能尚未实现，请等待后续版本。届时将支持解析 HTML 设计稿，提取颜色、字体、间距等 tokens，识别 UI 组件，检测图片资源等。",
          {
            code: "NOT_IMPLEMENTED",
            detail: {
              projectId: args.projectId,
              filePath: args.filePath,
              plannedFeatures: [
                "提取设计 tokens（颜色、字体、间距、圆角）",
                "识别 UI 组件（按钮、表格、卡片等）",
                "检测图片资源状态",
                "生成 CSS 变量和组件代码",
                "检测设计问题和建议",
              ],
            },
          },
        );
      },
    },
    {
      name: "design_handoff_get_result",
      description:
        "获取设计稿解析结果。注意：此功能尚未实现，等待后续版本。",
      riskLevel: "read",
      inputSchema: getParseResultSchema,
      async handler(args) {
        // 预留接口，未来实现
        // 实现时需要：
        // 1. const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        // 2. const data = await client.get("/api/handoff/result", { projectId: args.projectId, filePath: args.filePath });
        // 3. return ok("design_handoff_get_result", data);

        return fail(
          "design_handoff_get_result",
          "设计稿解析功能尚未实现，请等待后续版本。解析结果将包括：设计 tokens、UI 组件列表、资源状态、生成的代码、设计问题检测等。",
          {
            code: "NOT_IMPLEMENTED",
            detail: {
              projectId: args.projectId,
              filePath: args.filePath,
              expectedResultStructure: {
                status: "unparsed | parsing | parsed | failed | outdated",
                summary: "解析摘要（页面数、组件数、资源数等）",
                tokens: "设计 tokens（颜色、字体、间距等）",
                components: "识别的 UI 组件列表",
                assets: "图片资源状态",
                code: "生成的 CSS 和 JSON 代码",
                issues: "设计问题和建议",
                logs: "解析日志",
              },
            },
          },
        );
      },
    },
  ];
}

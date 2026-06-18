/**
 * 雪碧图配置相关工具
 */
import type { McpToolDefinition } from "../index";
import { DesignHandoffClient, resolveDesignHandoffConfig } from "./shared";
import { updateSpriteConfigSchema } from "./schemas";
import { fail, ok } from "../../utils/result";

export function spriteConfigTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_update_sprite_config",
      description:
        "更新雪碧图生成规则配置。可配置 CSS 类名前缀、URL 模板、复制代码模板、备注等。默认为预览模式，设置 confirm: true 执行更新。",
      riskLevel: "write",
      inputSchema: updateSpriteConfigSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        const { projectId, confirm, ...payload } = args;

        // 过滤掉 undefined 的字段，只保留要更新的内容
        const updatePayload: Record<string, unknown> = {};
        if (payload.cssPrefix !== undefined) updatePayload.cssPrefix = payload.cssPrefix;
        if (payload.spriteUrlTemplate !== undefined) updatePayload.spriteUrlTemplate = payload.spriteUrlTemplate;
        if (payload.copyTemplate !== undefined) updatePayload.copyTemplate = payload.copyTemplate;
        if (payload.note !== undefined) updatePayload.note = payload.note;

        // 检查是否有要更新的内容
        if (Object.keys(updatePayload).length === 0) {
          return fail(
            "design_handoff_update_sprite_config",
            "未指定任何要更新的配置项",
          );
        }

        // 预览模式
        if (!confirm) {
          return ok("design_handoff_update_sprite_config", {
            preview: true,
            message: "预览模式，设置 confirm: true 执行更新",
            projectId,
            changes: updatePayload,
          });
        }

        // 执行模式
        try {
          const data = await client.put<Record<string, unknown>>(
            `/api/projects/${encodeURIComponent(projectId)}`,
            updatePayload,
          );
          return ok("design_handoff_update_sprite_config", {
            preview: false,
            message: "雪碧图配置已更新",
            projectId,
            changes: updatePayload,
            project: data,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return fail("design_handoff_update_sprite_config", `更新失败: ${message}`);
        }
      },
    },
  ];
}

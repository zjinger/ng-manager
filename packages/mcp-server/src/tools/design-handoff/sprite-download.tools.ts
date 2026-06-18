/**
 * 雪碧图下载相关工具
 */
import * as fs from "fs";
import * as path from "path";
import type { McpToolDefinition } from "../index";
import { DesignHandoffClient, resolveDesignHandoffConfig } from "./shared";
import {
  downloadSpriteImageSchema,
  downloadSpriteCssSchema,
  downloadAllSpritesSchema,
} from "./schemas";
import { fail, ok } from "../../utils/result";

/**
 * 通用下载处理函数
 */
async function handleDownload(
  client: DesignHandoffClient,
  apiPath: string,
  outputDir: string,
  fileName: string,
  toolName: string,
) {
  // 检查目标文件夹是否存在
  if (!fs.existsSync(outputDir)) {
    return fail(
      toolName,
      `目标文件夹不存在: ${outputDir}，请先创建文件夹`,
    );
  }

  // 检查是否是目录
  const stat = fs.statSync(outputDir);
  if (!stat.isDirectory()) {
    return fail(toolName, `目标路径不是文件夹: ${outputDir}`);
  }

  try {
    // 下载文件
    const data = await client.download(apiPath);

    // 写入目标文件夹
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, data.content);

    // 返回结果
    return ok(toolName, {
      filePath,
      fileName,
      outputDir,
      fileSize: data.contentLength,
      fileSizeStr: `${(data.contentLength / 1024).toFixed(1)} KB`,
      contentType: data.contentType,
      message: `文件已下载到: ${filePath}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(toolName, `下载失败: ${message}`);
  }
}

export function spriteDownloadTools(): McpToolDefinition[] {
  return [
    {
      name: "design_handoff_download_sprite_image",
      description:
        "下载单个分组的雪碧图 PNG 到指定文件夹。文件名格式：{group}.png",
      riskLevel: "read",
      inputSchema: downloadSpriteImageSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        return handleDownload(
          client,
          `/api/sprite/${encodeURIComponent(args.projectId)}/${encodeURIComponent(args.group)}/image`,
          args.outputDir,
          `${args.group}.png`,
          "design_handoff_download_sprite_image",
        );
      },
    },
    {
      name: "design_handoff_download_sprite_css",
      description:
        "下载单个分组的 CSS 到指定文件夹。文件名格式：{group}.css",
      riskLevel: "read",
      inputSchema: downloadSpriteCssSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        return handleDownload(
          client,
          `/api/sprite/${encodeURIComponent(args.projectId)}/${encodeURIComponent(args.group)}/css`,
          args.outputDir,
          `${args.group}.css`,
          "design_handoff_download_sprite_css",
        );
      },
    },
    {
      name: "design_handoff_download_all_sprites",
      description:
        "下载整个项目的全部雪碧图资源（ZIP）到指定文件夹。文件名格式：{projectId}-sprites.zip",
      riskLevel: "read",
      inputSchema: downloadAllSpritesSchema,
      async handler(args) {
        const client = new DesignHandoffClient(resolveDesignHandoffConfig());
        return handleDownload(
          client,
          `/api/sprite/${encodeURIComponent(args.projectId)}/download-all`,
          args.outputDir,
          `${args.projectId}-sprites.zip`,
          "design_handoff_download_all_sprites",
        );
      },
    },
  ];
}

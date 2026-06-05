import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { McpToolDefinition } from "../index";
import { HubV2Client } from "./client";
import { resolveHubV2Context } from "./config";
import { markdownImageUploadSchema } from "./schemas";
import { ok } from "../../utils/result";

export function hubV2UploadTools(): McpToolDefinition[] {
  return [
    {
      name: "hub_v2_upload_markdown_image",
      description: "Upload a local or base64 image with Personal Token and return Markdown for Hub V2 content.",
      riskLevel: "write",
      inputSchema: markdownImageUploadSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const file = resolveUploadFile(args);
        const form = new FormData();
        const bytes = new Uint8Array(file.content.byteLength);
        bytes.set(file.content);
        form.append("file", new Blob([bytes], { type: file.mimeType }), file.fileName);
        if (args.alt) {
          form.append("alt", args.alt);
        }
        const data = await client.multipart("POST", client.personalUrl("/uploads/markdown"), form);
        return ok("hub_v2_upload_markdown_image", data);
      },
    },
  ];
}

function resolveUploadFile(args: {
  filePath?: string;
  contentBase64?: string;
  fileName?: string;
  mimeType?: string;
}): { content: Buffer; fileName: string; mimeType: string } {
  if (Boolean(args.filePath) === Boolean(args.contentBase64)) {
    throw new Error("provide exactly one of filePath or contentBase64");
  }
  if (args.filePath) {
    const resolvedPath = path.resolve(args.filePath);
    assertAllowedFilePath(resolvedPath);
    if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
      throw new Error(`upload file not found: ${resolvedPath}`);
    }
    return {
      content: readFileSync(resolvedPath),
      fileName: path.basename(resolvedPath),
      mimeType: args.mimeType ?? inferMimeType(resolvedPath),
    };
  }

  const fileName = args.fileName?.trim();
  if (!args.contentBase64 || !fileName) {
    throw new Error("contentBase64 and fileName are required");
  }
  return {
    content: Buffer.from(args.contentBase64, "base64"),
    fileName,
    mimeType: args.mimeType ?? inferMimeType(fileName),
  };
}

function assertAllowedFilePath(filePath: string): void {
  const roots = [
    process.env.NGM_WORKSPACE_ROOT,
    process.env.NGM_MCP_UPLOAD_ROOT,
    process.cwd(),
  ]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .map((item) => path.resolve(item));
  const allowed = roots.some((root) => filePath === root || filePath.startsWith(`${root}${path.sep}`));
  if (!allowed) {
    throw new Error("filePath must be under NGM_WORKSPACE_ROOT, NGM_MCP_UPLOAD_ROOT, or the current workspace");
  }
}

function inferMimeType(fileName: string): string {
  switch (path.extname(fileName).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

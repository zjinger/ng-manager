import type { McpToolDefinition } from "../index";
import { compact, compactUndefined, HubV2Client } from "./client";
import { resolveHubV2Context } from "./config/index";
import { docsCreateSchema, docsGetBySlugSchema, docsGetSchema, docsListSchema, docsPublishSchema, docsUpdateSchema } from "./schemas";
import { fail, ok } from "../../utils/result";

export function hubV2DocsTools(): McpToolDefinition[] {
  return [
    {
      name: "hub_v2_docs_list",
      description: "List Hub V2 project documents with Project Token.",
      riskLevel: "read",
      inputSchema: docsListSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const status = args.status;
        const data = await client.request(
          "GET",
          client.tokenUrl("/docs", {
            page: args.page ?? 1,
            pageSize: args.pageSize ?? 20,
            status,
            statusGroup: status ? undefined : "active",
            keyword: args.keyword,
            category: args.category,
            categoryId: args.categoryId,
          })
        );
        return ok("hub_v2_docs_list", data);
      },
    },
    {
      name: "hub_v2_docs_get",
      description: "Read one Hub V2 project document by id with Project Token.",
      riskLevel: "read",
      inputSchema: docsGetSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await client.request("GET", client.tokenUrl(`/docs/${encodeURIComponent(args.docId)}`));
        return ok("hub_v2_docs_get", data);
      },
    },
    {
      name: "hub_v2_docs_get_by_slug",
      description: "Read one Hub V2 project document by slug with Project Token.",
      riskLevel: "read",
      inputSchema: docsGetBySlugSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const payload = await client.request<Record<string, unknown>>("GET", client.tokenUrl(`/docs/by-slug/${encodeURIComponent(args.slug)}`));
        if (args.contentOnly) {
          const content = extractDocumentContent(payload);
          if (typeof content === "string") {
            return ok("hub_v2_docs_get_by_slug", content);
          }
          return fail("hub_v2_docs_get_by_slug", "Hub V2 document response did not include data.contentMd or data.item.contentMd", {
            code: "DOCUMENT_CONTENT_NOT_FOUND",
            detail: {
              slug: args.slug,
              responseKeys: Object.keys(payload),
            },
          });
        }
        return ok("hub_v2_docs_get_by_slug", payload);
      },
    },
    {
      name: "hub_v2_docs_create",
      description: "Preview or create a Hub V2 project document draft with Personal Token.",
      riskLevel: "write",
      inputSchema: docsCreateSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = "/docs";
        if (!hasDocumentContent(args)) {
          return fail("hub_v2_docs_create", "content or contentMd is required", {
            code: "VALIDATION_ERROR",
            detail: { field: "content" },
          });
        }
        const ctx = args.confirm ? resolveHubV2Context(args, "personal") : undefined;
        const body = compact({
          title: args.title,
          content: args.content,
          contentMd: args.contentMd,
          slug: args.slug,
          category: args.category,
          categoryId: args.categoryId,
          summary: args.summary,
          tags: args.tags,
          status: args.status ?? "draft",
          source: args.source ?? ctx?.source,
          version: args.version,
        });
        if (!args.confirm) {
          return ok("hub_v2_docs_create", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "doc:create:write",
              body,
            },
          });
        }
        const client = new HubV2Client(ctx!);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_docs_create", data);
      },
    },
    {
      name: "hub_v2_docs_update",
      description: "Preview or update a Hub V2 project document with Personal Token.",
      riskLevel: "write",
      inputSchema: docsUpdateSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = `/docs/${encodeURIComponent(args.docId)}`;
        if (!hasDocumentUpdateField(args)) {
          return fail("hub_v2_docs_update", "at least one document field is required", {
            code: "VALIDATION_ERROR",
            detail: { field: "title" },
          });
        }
        const ctx = args.confirm ? resolveHubV2Context(args, "personal") : undefined;
        const body = compactUndefined({
          title: args.title,
          content: args.content,
          contentMd: args.contentMd,
          slug: args.slug,
          category: args.category,
          categoryId: args.categoryId,
          summary: args.summary,
          tags: args.tags,
          source: args.source ?? ctx?.source,
          version: args.version,
        });
        if (!args.confirm) {
          return ok("hub_v2_docs_update", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "PATCH",
              path,
              requiredScope: "doc:update:write",
              body,
            },
          });
        }
        const client = new HubV2Client(ctx!);
        const data = await client.request("PATCH", client.personalUrl(path), body, { preserveNull: true });
        return ok("hub_v2_docs_update", data);
      },
    },
    {
      name: "hub_v2_docs_publish",
      description: "Preview or publish a Hub V2 project document with Personal Token.",
      riskLevel: "write",
      inputSchema: docsPublishSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = `/docs/${encodeURIComponent(args.docId)}/publish`;
        const ctx = args.confirm ? resolveHubV2Context(args, "personal") : undefined;
        const body = compact({
          source: args.source ?? ctx?.source,
        });
        if (!args.confirm) {
          return ok("hub_v2_docs_publish", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "doc:publish:write",
              body,
            },
          });
        }
        const client = new HubV2Client(ctx!);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_docs_publish", data);
      },
    },
  ];
}

function extractDocumentContent(payload: Record<string, unknown>): string | undefined {
  const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? (payload.data as Record<string, unknown>)
    : undefined;
  if (typeof data?.contentMd === "string") {
    return data.contentMd;
  }
  const item = data?.item && typeof data.item === "object" && !Array.isArray(data.item)
    ? (data.item as Record<string, unknown>)
    : undefined;
  return typeof item?.contentMd === "string" ? item.contentMd : undefined;
}

function hasDocumentContent(args: { content?: string; contentMd?: string }): boolean {
  return Boolean(args.content?.trim() || args.contentMd?.trim());
}

function hasDocumentUpdateField(args: {
  title?: string;
  content?: string;
  contentMd?: string;
  slug?: string;
  category?: string;
  categoryId?: string;
  summary?: string | null;
  version?: string | null;
}): boolean {
  return (
    args.title !== undefined ||
    args.content !== undefined ||
    args.contentMd !== undefined ||
    args.slug !== undefined ||
    args.category !== undefined ||
    args.categoryId !== undefined ||
    args.summary !== undefined ||
    args.version !== undefined
  );
}

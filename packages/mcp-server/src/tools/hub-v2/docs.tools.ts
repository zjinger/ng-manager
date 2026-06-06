import type { McpToolDefinition } from "../index";
import { HubV2Client } from "./client";
import { resolveHubV2Context } from "./config/index";
import { docsGetBySlugSchema, docsGetSchema, docsListSchema } from "./schemas";
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

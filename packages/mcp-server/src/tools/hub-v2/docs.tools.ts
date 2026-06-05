import type { McpToolDefinition } from "../index";
import { HubV2Client } from "./client";
import { resolveHubV2Context } from "./config";
import { docsGetBySlugSchema, docsGetSchema, docsListSchema } from "./schemas";
import { ok } from "../../utils/result";

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
          return ok("hub_v2_docs_get_by_slug", (payload.data as Record<string, unknown> | undefined)?.contentMd ?? null);
        }
        return ok("hub_v2_docs_get_by_slug", payload);
      },
    },
  ];
}

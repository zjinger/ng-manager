import { resolveContext } from "../config";
import { compact, personalProjectUrl, requestJson, tokenUrl } from "../http";
import { previewWrite } from "../preview";
import {
  ToolDefinition,
  bool,
  compactBody,
  contextOptions,
  num,
  objectSchema,
  pagingProperties,
  projectProperties,
  requiredStr,
  str,
  strArray,
  stringArray,
} from "../tool";
import { quote } from "../url";

export function docsTools(): ToolDefinition[] {
  return [
    {
      name: "sl_hub_v2.docs_list",
      title: "SL Hub V2 Docs List",
      description: "List project documents.",
      inputSchema: objectSchema({
        ...projectProperties,
        ...pagingProperties,
        status: { type: "string", enum: ["draft", "published", "archived"] },
        keyword: { type: "string" },
        category: { type: "string" },
        categoryId: { type: "string" },
      }),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        const status = str(args, "status");
        return requestJson(
          tokenUrl(ctx, "/docs", {
            page: num(args, "page") ?? 1,
            pageSize: num(args, "pageSize") ?? 20,
            status,
            statusGroup: status ? undefined : "active",
            keyword: str(args, "keyword"),
            category: str(args, "category"),
            categoryId: str(args, "categoryId"),
          }),
          ctx.token,
          "GET",
        );
      },
    },
    {
      name: "sl_hub_v2.docs_get",
      title: "SL Hub V2 Docs Get",
      description: "Read document detail by id.",
      inputSchema: objectSchema({ ...projectProperties, docId: { type: "string" } }, ["docId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(tokenUrl(ctx, `/docs/${quote(requiredStr(args, "docId"))}`), ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.docs_get_by_slug",
      title: "SL Hub V2 Docs Get By Slug",
      description: "Read document detail by slug.",
      inputSchema: objectSchema({ ...projectProperties, slug: { type: "string" }, contentOnly: { type: "boolean" } }, ["slug"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        const payload = await requestJson<Record<string, unknown>>(tokenUrl(ctx, `/docs/by-slug/${quote(requiredStr(args, "slug"))}`), ctx.token, "GET");
        if (bool(args, "contentOnly")) {
          return { code: "OK", data: (payload.data as Record<string, unknown> | undefined)?.contentMd ?? null };
        }
        return payload;
      },
    },
    {
      name: "sl_hub_v2.docs_create_draft",
      title: "SL Hub V2 Docs Create Draft",
      description: "Create a project document draft.",
      inputSchema: objectSchema({
        ...projectProperties,
        title: { type: "string" },
        slug: { type: "string" },
        content: { type: "string" },
        categoryId: { type: "string" },
        category: { type: "string" },
        summary: { type: "string" },
        tags: stringArray,
      }, ["title", "content"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const slug = str(args, "slug");
        if (slug) {
          try {
            const existing = await requestJson(tokenUrl(ctx, `/docs/by-slug/${quote(slug)}`), ctx.token, "GET");
            return { code: "DOCUMENT_SLUG_EXISTS", message: "document slug already exists", data: existing };
          } catch (error) {
            if (!isHttpStatus(error, 404)) {
              throw error;
            }
          }
        }
        return requestJson(
          personalProjectUrl(ctx, "/docs"),
          ctx.token,
          "POST",
          compactBody({
            title: requiredStr(args, "title"),
            slug,
            content: requiredStr(args, "content"),
            categoryId: str(args, "categoryId"),
            category: str(args, "category"),
            summary: str(args, "summary"),
            tags: strArray(args, "tags"),
            status: "draft",
            source: ctx.source,
          }),
        );
      },
    },
    {
      name: "sl_hub_v2.docs_update",
      title: "SL Hub V2 Docs Update",
      description: "Update an existing project document.",
      inputSchema: objectSchema({
        ...projectProperties,
        docId: { type: "string" },
        title: { type: "string" },
        slug: { type: "string" },
        content: { type: "string" },
        categoryId: { type: "string" },
        category: { type: "string" },
        summary: { type: "string" },
        version: { type: "string" },
        tags: stringArray,
      }, ["docId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        return requestJson(
          personalProjectUrl(ctx, `/docs/${quote(requiredStr(args, "docId"))}`),
          ctx.token,
          "PATCH",
          compactBody({
            title: str(args, "title"),
            slug: str(args, "slug"),
            content: str(args, "content"),
            categoryId: str(args, "categoryId"),
            category: str(args, "category"),
            summary: str(args, "summary"),
            version: str(args, "version"),
            tags: strArray(args, "tags"),
            source: ctx.source,
          }),
        );
      },
    },
    {
      name: "sl_hub_v2.docs_publish",
      title: "SL Hub V2 Docs Publish",
      description: "Publish a project document.",
      inputSchema: objectSchema({ ...projectProperties, docId: { type: "string" }, confirm: { type: "boolean" } }, ["docId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const suffix = `/docs/${quote(requiredStr(args, "docId"))}/publish`;
        const body = compact({ source: ctx.source });
        if (!bool(args, "confirm")) {
          return previewWrite("doc:publish:write", "POST", suffix, body);
        }
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", body);
      },
    },
  ];
}

function isHttpStatus(error: unknown, status: number): boolean {
  return Boolean(error && typeof error === "object" && (error as { payload?: { status?: number } }).payload?.status === status);
}

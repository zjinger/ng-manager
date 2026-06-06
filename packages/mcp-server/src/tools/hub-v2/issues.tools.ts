import type { McpToolDefinition } from "../index";
import { compact, compactUndefined, HubV2Client } from "./client";
import { resolveHubV2Context } from "./config";
import { issueCommentSchema, issueCreateSchema, issueGetSchema, issuesListSchema, issueUpdateSchema } from "./schemas";
import { fail, ok } from "../../utils/result";

export function hubV2IssuesTools(): McpToolDefinition[] {
  return [
    {
      name: "hub_v2_issues_list",
      description: "List Hub V2 issues with Project Token.",
      riskLevel: "read",
      inputSchema: issuesListSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await client.request(
          "GET",
          client.tokenUrl("/issues", {
            page: args.page ?? 1,
            pageSize: args.pageSize ?? 20,
            keyword: args.keyword,
            status: args.status,
            priority: args.priority,
            assigneeId: args.assigneeId,
            verifierId: args.verifierId,
            rdItemId: args.rdItemId,
          })
        );
        return ok("hub_v2_issues_list", data);
      },
    },
    {
      name: "hub_v2_issues_get",
      description: "Read one Hub V2 issue by id with Project Token.",
      riskLevel: "read",
      inputSchema: issueGetSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await client.request("GET", client.tokenUrl(`/issues/${encodeURIComponent(args.issueId)}`));
        return ok("hub_v2_issues_get", data);
      },
    },
    {
      name: "hub_v2_issues_create",
      description: "Preview or create a Hub V2 issue with Personal Token.",
      riskLevel: "write",
      inputSchema: issueCreateSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = "/issues";
        const body = compact({
          title: args.title,
          description: args.description,
          type: args.type,
          priority: args.priority,
          assigneeId: args.assigneeId,
          verifierId: args.verifierId,
          rdItemId: args.rdItemId,
          moduleCode: args.moduleCode,
          versionCode: args.versionCode,
          environmentCode: args.environmentCode,
        });
        if (!args.confirm) {
          return ok("hub_v2_issues_create", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "issue:create:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_issues_create", data);
      },
    },
    {
      name: "hub_v2_issues_comment",
      description: "Preview or add a Hub V2 issue comment with Personal Token.",
      riskLevel: "write",
      inputSchema: issueCommentSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = `/issues/${encodeURIComponent(args.issueId)}/comments`;
        const body = compact({
          content: args.content,
          mentions: args.mentions,
        });
        if (!args.confirm) {
          return ok("hub_v2_issues_comment", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "issue:comment:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_issues_comment", data);
      },
    },
    {
      name: "hub_v2_issues_update",
      description: "Preview or update Hub V2 issue basic fields with Personal Token.",
      riskLevel: "write",
      inputSchema: issueUpdateSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = `/issues/${encodeURIComponent(args.issueId)}`;
        const body = compactUndefined({
          title: args.title,
          description: args.description,
          type: args.type,
          priority: args.priority,
          rdItemId: args.rdItemId,
          moduleCode: args.moduleCode,
          versionCode: args.versionCode,
          environmentCode: args.environmentCode,
        });
        if (Object.keys(body).length === 0) {
          return fail("hub_v2_issues_update", "at least one issue field is required");
        }
        if (!args.confirm) {
          return ok("hub_v2_issues_update", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "PATCH",
              path,
              requiredScope: "issue:update:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("PATCH", client.personalUrl(path), body, { preserveNull: true });
        return ok("hub_v2_issues_update", data);
      },
    },
  ];
}

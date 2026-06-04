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

export function issueTools(): ToolDefinition[] {
  return [
    {
      name: "sl_hub_v2.issues_list",
      title: "SL Hub V2 Issues List",
      description: "List project issues.",
      inputSchema: objectSchema({
        ...projectProperties,
        ...pagingProperties,
        keyword: { type: "string" },
        status: stringArray,
        priority: stringArray,
        assigneeId: { type: "string" },
        verifierId: { type: "string" },
        rdItemId: { type: "string" },
      }),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(
          tokenUrl(ctx, "/issues", {
            page: num(args, "page") ?? 1,
            pageSize: num(args, "pageSize") ?? 20,
            keyword: str(args, "keyword"),
            status: strArray(args, "status"),
            priority: strArray(args, "priority"),
            assigneeId: str(args, "assigneeId"),
            verifierId: str(args, "verifierId"),
            rdItemId: str(args, "rdItemId"),
          }),
          ctx.token,
          "GET",
        );
      },
    },
    {
      name: "sl_hub_v2.issues_get",
      title: "SL Hub V2 Issues Get",
      description: "Read issue detail.",
      inputSchema: objectSchema({ ...projectProperties, issueId: { type: "string" } }, ["issueId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(tokenUrl(ctx, `/issues/${quote(requiredStr(args, "issueId"))}`), ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.issues_related",
      title: "SL Hub V2 Issues Related",
      description: "Read issue logs, comments, participants, attachments, or branches.",
      inputSchema: objectSchema({
        ...projectProperties,
        issueId: { type: "string" },
        kind: { type: "string", enum: ["logs", "comments", "participants", "attachments", "branches"] },
      }, ["issueId", "kind"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(tokenUrl(ctx, `/issues/${quote(requiredStr(args, "issueId"))}/${requiredStr(args, "kind")}`), ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.issues_comment",
      title: "SL Hub V2 Issues Comment",
      description: "Add an issue comment.",
      inputSchema: objectSchema({ ...projectProperties, issueId: { type: "string" }, content: { type: "string" }, mentions: stringArray }, ["issueId", "content"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        return requestJson(
          personalProjectUrl(ctx, `/issues/${quote(requiredStr(args, "issueId"))}/comments`),
          ctx.token,
          "POST",
          compactBody({ content: requiredStr(args, "content"), mentions: strArray(args, "mentions") }),
        );
      },
    },
    {
      name: "sl_hub_v2.issues_assign",
      title: "SL Hub V2 Issues Assign",
      description: "Assign or claim an issue.",
      inputSchema: objectSchema({ ...projectProperties, issueId: { type: "string" }, assigneeId: { type: "string" }, claim: { type: "boolean" } }, ["issueId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const suffix = bool(args, "claim") ? `/issues/${quote(requiredStr(args, "issueId"))}/claim` : `/issues/${quote(requiredStr(args, "issueId"))}/assign`;
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", bool(args, "claim") ? undefined : compactBody({ assigneeId: str(args, "assigneeId") }));
      },
    },
    {
      name: "sl_hub_v2.issues_transition",
      title: "SL Hub V2 Issues Transition",
      description: "Preview or execute an issue status transition.",
      inputSchema: objectSchema({
        ...projectProperties,
        issueId: { type: "string" },
        action: { type: "string", enum: ["start", "wait-update", "verify", "resolve", "reopen", "close"] },
        resolutionSummary: { type: "string" },
        reason: { type: "string" },
        remark: { type: "string" },
        confirm: { type: "boolean" },
      }, ["issueId", "action"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const action = requiredStr(args, "action");
        const suffix = `/issues/${quote(requiredStr(args, "issueId"))}/${action}`;
        const body = transitionBody(action, args);
        if (!bool(args, "confirm")) {
          return previewWrite("issue:transition:write", "POST", suffix, body);
        }
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", body);
      },
    },
    {
      name: "sl_hub_v2.issues_branch",
      title: "SL Hub V2 Issues Branch",
      description: "Create, start, or complete an issue branch.",
      inputSchema: objectSchema({
        ...projectProperties,
        issueId: { type: "string" },
        action: { type: "string", enum: ["create", "start-mine", "start", "complete"] },
        branchId: { type: "string" },
        ownerUserId: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
      }, ["issueId", "action"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const issueId = quote(requiredStr(args, "issueId"));
        const action = requiredStr(args, "action");
        if (action === "create") {
          return requestJson(personalProjectUrl(ctx, `/issues/${issueId}/branches`), ctx.token, "POST", compactBody({ ownerUserId: str(args, "ownerUserId"), title: str(args, "title") }));
        }
        if (action === "start-mine") {
          return requestJson(personalProjectUrl(ctx, `/issues/${issueId}/branches/start-mine`), ctx.token, "POST", compactBody({ title: str(args, "title") }));
        }
        const branchId = quote(requiredStr(args, "branchId"));
        const suffix = action === "start" ? `/issues/${issueId}/branches/${branchId}/start` : `/issues/${issueId}/branches/${branchId}/complete`;
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", action === "complete" ? compactBody({ summary: str(args, "summary") }) : undefined);
      },
    },
    {
      name: "sl_hub_v2.issues_participant",
      title: "SL Hub V2 Issues Participant",
      description: "Add or remove an issue participant.",
      inputSchema: objectSchema({
        ...projectProperties,
        issueId: { type: "string" },
        action: { type: "string", enum: ["add", "remove"] },
        userId: { type: "string" },
        participantId: { type: "string" },
        taskTitle: { type: "string" },
      }, ["issueId", "action"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const issueId = quote(requiredStr(args, "issueId"));
        if (requiredStr(args, "action") === "add") {
          return requestJson(personalProjectUrl(ctx, `/issues/${issueId}/participants`), ctx.token, "POST", compactBody({ userId: str(args, "userId"), taskTitle: str(args, "taskTitle") }));
        }
        return requestJson(personalProjectUrl(ctx, `/issues/${issueId}/participants/${quote(requiredStr(args, "participantId"))}`), ctx.token, "DELETE");
      },
    },
  ];
}

function transitionBody(action: string, args: Record<string, unknown>): Record<string, unknown> | undefined {
  if (action === "resolve") {
    return compact({ resolutionSummary: str(args, "resolutionSummary") });
  }
  if (action === "reopen") {
    return compact({ remark: str(args, "remark") });
  }
  if (action === "close") {
    return compact({ reason: str(args, "reason"), remark: str(args, "remark") });
  }
  return undefined;
}

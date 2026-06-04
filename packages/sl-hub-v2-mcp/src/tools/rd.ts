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

export function rdTools(): ToolDefinition[] {
  return [
    {
      name: "sl_hub_v2.rd_stages",
      title: "SL Hub V2 RD Stages",
      description: "List RD stages.",
      inputSchema: objectSchema(projectProperties),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(tokenUrl(ctx, "/rd-stages"), ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.rd_list",
      title: "SL Hub V2 RD List",
      description: "List RD items.",
      inputSchema: objectSchema({
        ...projectProperties,
        ...pagingProperties,
        keyword: { type: "string" },
        stageId: { type: "string" },
        status: stringArray,
        type: stringArray,
        priority: stringArray,
        assigneeId: { type: "string" },
      }),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(
          tokenUrl(ctx, "/rd-items", {
            page: num(args, "page") ?? 1,
            pageSize: num(args, "pageSize") ?? 20,
            keyword: str(args, "keyword"),
            stageId: str(args, "stageId"),
            status: strArray(args, "status"),
            type: strArray(args, "type"),
            priority: strArray(args, "priority"),
            assigneeId: str(args, "assigneeId"),
          }),
          ctx.token,
          "GET",
        );
      },
    },
    {
      name: "sl_hub_v2.rd_get",
      title: "SL Hub V2 RD Get",
      description: "Read RD item detail.",
      inputSchema: objectSchema({ ...projectProperties, itemId: { type: "string" } }, ["itemId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        return requestJson(tokenUrl(ctx, `/rd-items/${quote(requiredStr(args, "itemId"))}`), ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.rd_related",
      title: "SL Hub V2 RD Related",
      description: "Read RD logs, stage history, progress, or progress history.",
      inputSchema: objectSchema({
        ...projectProperties,
        itemId: { type: "string" },
        kind: { type: "string", enum: ["logs", "stage-history", "progress", "progress-history"] },
      }, ["itemId", "kind"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "project");
        const kind = requiredStr(args, "kind");
        const suffix = kind === "progress-history" ? "/progress/history" : `/${kind}`;
        return requestJson(tokenUrl(ctx, `/rd-items/${quote(requiredStr(args, "itemId"))}${suffix}`), ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.rd_transition",
      title: "SL Hub V2 RD Transition",
      description: "Preview or execute an RD status transition.",
      inputSchema: objectSchema({
        ...projectProperties,
        itemId: { type: "string" },
        action: { type: "string", enum: ["start", "resume", "accept", "reopen", "block", "complete", "close"] },
        reason: { type: "string" },
        blockerReason: { type: "string" },
        confirm: { type: "boolean" },
      }, ["itemId", "action"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const action = requiredStr(args, "action");
        const suffix = `/rd-items/${quote(requiredStr(args, "itemId"))}/${action}`;
        const body = rdTransitionBody(action, args);
        if (!bool(args, "confirm")) {
          return previewWrite("rd:transition:write", "POST", suffix, body);
        }
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", body);
      },
    },
    {
      name: "sl_hub_v2.rd_advance_stage",
      title: "SL Hub V2 RD Advance Stage",
      description: "Preview or execute RD stage advance.",
      inputSchema: objectSchema({
        ...projectProperties,
        itemId: { type: "string" },
        stageId: { type: "string" },
        memberIds: stringArray,
        description: { type: "string" },
        planStartAt: { type: "string" },
        planEndAt: { type: "string" },
        confirm: { type: "boolean" },
      }, ["itemId", "stageId"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const suffix = `/rd-items/${quote(requiredStr(args, "itemId"))}/advance-stage`;
        const body = compactBody({
          stageId: requiredStr(args, "stageId"),
          memberIds: strArray(args, "memberIds"),
          description: str(args, "description"),
          planStartAt: str(args, "planStartAt"),
          planEndAt: str(args, "planEndAt"),
        });
        if (!bool(args, "confirm")) {
          return previewWrite("rd:transition:write", "POST", suffix, body);
        }
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", body);
      },
    },
    {
      name: "sl_hub_v2.rd_update_progress",
      title: "SL Hub V2 RD Update Progress",
      description: "Update RD progress.",
      inputSchema: objectSchema({
        ...projectProperties,
        itemId: { type: "string" },
        progress: { type: "integer", minimum: 0, maximum: 100 },
        note: { type: "string" },
        blockReason: { type: "string" },
        resolveBlockId: { type: "string" },
        stageTaskId: { type: "string" },
        confirm: { type: "boolean" },
      }, ["itemId", "progress"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        const progress = num(args, "progress");
        if (progress === undefined) {
          throw new Error("progress is required");
        }
        const suffix = `/rd-items/${quote(requiredStr(args, "itemId"))}/progress`;
        const body = compactBody({
          progress,
          note: str(args, "note"),
          blockReason: str(args, "blockReason"),
          resolveBlockId: str(args, "resolveBlockId"),
          stageTaskId: str(args, "stageTaskId"),
        });
        if (progress === 100 && !bool(args, "confirm")) {
          return previewWrite("rd:transition:write", "POST", suffix, body);
        }
        return requestJson(personalProjectUrl(ctx, suffix), ctx.token, "POST", body);
      },
    },
    {
      name: "sl_hub_v2.rd_update",
      title: "SL Hub V2 RD Update",
      description: "Update RD item basic fields.",
      inputSchema: objectSchema({
        ...projectProperties,
        itemId: { type: "string" },
        version: { type: "integer" },
        title: { type: "string" },
        description: { type: "string" },
        stageId: { type: "string" },
        type: { type: "string" },
        priority: { type: "string" },
        memberIds: stringArray,
        verifierId: { type: "string" },
        planStartAt: { type: "string" },
        planEndAt: { type: "string" },
        stageDescription: { type: "string" },
      }, ["itemId", "version"]),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        return requestJson(
          personalProjectUrl(ctx, `/rd-items/${quote(requiredStr(args, "itemId"))}`),
          ctx.token,
          "PATCH",
          compactBody({
            version: num(args, "version"),
            title: str(args, "title"),
            description: str(args, "description"),
            stageId: str(args, "stageId"),
            type: str(args, "type"),
            priority: str(args, "priority"),
            memberIds: strArray(args, "memberIds"),
            verifierId: str(args, "verifierId"),
            planStartAt: str(args, "planStartAt"),
            planEndAt: str(args, "planEndAt"),
            stageDescription: str(args, "stageDescription"),
          }),
        );
      },
    },
  ];
}

function rdTransitionBody(action: string, args: Record<string, unknown>): Record<string, unknown> | undefined {
  if (action === "block") {
    return compact({ blockerReason: str(args, "blockerReason") });
  }
  if (action === "complete" || action === "close") {
    return compact({ reason: str(args, "reason") });
  }
  return undefined;
}

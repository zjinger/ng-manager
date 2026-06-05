import type { McpToolDefinition } from "../index";
import { compact, HubV2Client } from "./client";
import { resolveHubV2Context } from "./config";
import {
  rdAdvanceStageSchema,
  rdCreateSchema,
  rdGetSchema,
  rdListSchema,
  rdStageTaskCreateSchema,
  rdStageTasksListSchema,
  rdUpdateProgressSchema,
} from "./schemas";
import { ok } from "../../utils/result";

export function hubV2RdTools(): McpToolDefinition[] {
  return [
    {
      name: "hub_v2_rd_list",
      description: "List Hub V2 RD items with Project Token.",
      riskLevel: "read",
      inputSchema: rdListSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await client.request(
          "GET",
          client.tokenUrl("/rd-items", {
            page: args.page ?? 1,
            pageSize: args.pageSize ?? 20,
            keyword: args.keyword,
            stageId: args.stageId,
            status: args.status,
            type: args.type,
            priority: args.priority,
            assigneeId: args.assigneeId,
          })
        );
        return ok("hub_v2_rd_list", data);
      },
    },
    {
      name: "hub_v2_rd_get",
      description: "Read one Hub V2 RD item by id with Project Token.",
      riskLevel: "read",
      inputSchema: rdGetSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await client.request("GET", client.tokenUrl(`/rd-items/${encodeURIComponent(args.itemId)}`));
        return ok("hub_v2_rd_get", data);
      },
    },
    {
      name: "hub_v2_rd_stage_tasks_list",
      description: "List Hub V2 RD current stage tasks with Project Token.",
      riskLevel: "read",
      inputSchema: rdStageTasksListSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await client.request("GET", client.tokenUrl(`/rd-items/${encodeURIComponent(args.itemId)}/stage-tasks`));
        return ok("hub_v2_rd_stage_tasks_list", data);
      },
    },
    {
      name: "hub_v2_rd_create",
      description: "Preview or create a Hub V2 RD item with Personal Token.",
      riskLevel: "write",
      inputSchema: rdCreateSchema,
      async handler(args) {
        const path = "/rd-items";
        const body = compact({
          title: args.title,
          description: args.description,
          stageId: args.stageId,
          type: args.type,
          priority: args.priority,
          memberIds: args.memberIds,
          verifierId: args.verifierId,
          planStartAt: args.planStartAt,
          planEndAt: args.planEndAt,
          stageTasks: args.stageTasks,
          stageTaskTemplates: args.stageTaskTemplates,
        });
        if (!args.confirm) {
          return ok("hub_v2_rd_create", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "rd:create:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_rd_create", data);
      },
    },
    {
      name: "hub_v2_rd_advance_stage",
      description: "Preview or execute Hub V2 RD stage advance with Personal Token.",
      riskLevel: "write",
      inputSchema: rdAdvanceStageSchema,
      async handler(args) {
        const path = `/rd-items/${encodeURIComponent(args.itemId)}/advance-stage`;
        const body = compact({
          stageId: args.stageId,
          memberIds: args.memberIds,
          description: args.description,
          planStartAt: args.planStartAt,
          planEndAt: args.planEndAt,
          stageTasks: args.stageTasks,
          stageTaskTemplates: args.stageTaskTemplates,
        });
        if (!args.confirm) {
          return ok("hub_v2_rd_advance_stage", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "rd:transition:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_rd_advance_stage", data);
      },
    },
    {
      name: "hub_v2_rd_stage_tasks_create",
      description: "Preview or create a Hub V2 RD stage task on the current stage with Personal Token.",
      riskLevel: "write",
      inputSchema: rdStageTaskCreateSchema,
      async handler(args) {
        const path = `/rd-items/${encodeURIComponent(args.itemId)}/stage-tasks`;
        const body = compact({
          title: args.title,
          description: args.description,
          ownerIds: args.ownerIds,
          plannedStartAt: args.plannedStartAt,
          plannedEndAt: args.plannedEndAt,
          sortOrder: args.sortOrder,
          remark: args.remark,
        });
        if (!args.confirm) {
          return ok("hub_v2_rd_stage_tasks_create", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "rd:stage-task:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_rd_stage_tasks_create", data);
      },
    },
    {
      name: "hub_v2_rd_update_progress",
      description: "Preview or update Hub V2 RD progress with Personal Token.",
      riskLevel: "write",
      inputSchema: rdUpdateProgressSchema,
      async handler(args) {
        const path = `/rd-items/${encodeURIComponent(args.itemId)}/progress`;
        const body = compact({
          progress: args.progress,
          note: args.note,
          blockReason: args.blockReason,
          resolveBlockId: args.resolveBlockId,
          stageTaskId: args.stageTaskId,
        });
        if (!args.confirm) {
          return ok("hub_v2_rd_update_progress", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "POST",
              path,
              requiredScope: "rd:progress:write or rd:transition:write",
              body,
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("POST", client.personalUrl(path), body);
        return ok("hub_v2_rd_update_progress", data);
      },
    },
  ];
}

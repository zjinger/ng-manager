import type { McpToolDefinition } from "../index";
import { compact, HubV2Client } from "./client";
import { resolveHubV2Context } from "./config/index";
import { readRawAsBase64 } from "./raw";
import {
  issueAttachmentRawSchema,
  issueBranchActionSchema,
  issueBranchCompleteSchema,
  issueBranchStartMineSchema,
  issueCloseSchema,
  issueParticipantRemoveSchema,
  issueReadDetailSchema,
  issueReopenSchema,
  issueResolveSchema,
  issueSimpleWriteSchema,
  issueUploadRawSchema,
} from "./schemas";
import { ok } from "../../utils/result";

export function hubV2IssueWorkflowTools(): McpToolDefinition[] {
  return [
    issueReadTool("hub_v2_issues_logs_list", "List Hub V2 issue logs with Project Token.", "logs"),
    issueReadTool("hub_v2_issues_comments_list", "List Hub V2 issue comments with Project Token.", "comments"),
    issueReadTool("hub_v2_issues_participants_list", "List Hub V2 issue participants with Project Token.", "participants"),
    issueReadTool("hub_v2_issues_attachments_list", "List Hub V2 issue attachments with Project Token.", "attachments"),
    issueReadTool("hub_v2_issues_branches_list", "List Hub V2 issue collaboration branches with Project Token.", "branches"),
    {
      name: "hub_v2_issues_attachment_raw_get",
      description: "Read one Hub V2 issue attachment raw file as base64 with Project Token.",
      riskLevel: "read",
      inputSchema: issueAttachmentRawSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await readRawAsBase64(
          client,
          client.tokenUrl(`/issues/${encodeURIComponent(args.issueId)}/attachments/${encodeURIComponent(args.attachmentId)}/raw`),
          args.maxBytes
        );
        return ok("hub_v2_issues_attachment_raw_get", data);
      },
    },
    {
      name: "hub_v2_issues_upload_raw_get",
      description: "Read one Hub V2 issue Markdown upload raw file as base64 with Project Token.",
      riskLevel: "read",
      inputSchema: issueUploadRawSchema,
      async handler(args) {
        const ctx = resolveHubV2Context(args, "project");
        const client = new HubV2Client(ctx);
        const data = await readRawAsBase64(
          client,
          client.tokenUrl(`/issues/${encodeURIComponent(args.issueId)}/uploads/${encodeURIComponent(args.uploadId)}/raw`),
          args.maxBytes
        );
        return ok("hub_v2_issues_upload_raw_get", data);
      },
    },
    issueSimpleWriteTool("hub_v2_issues_claim", "Preview or claim a Hub V2 issue with Personal Token.", "claim", "issue:assign:write"),
    {
      name: "hub_v2_issues_participant_remove",
      description: "Preview or remove a Hub V2 issue collaborator with Personal Token.",
      riskLevel: "write",
      inputSchema: issueParticipantRemoveSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = `/issues/${encodeURIComponent(args.issueId)}/participants/${encodeURIComponent(args.participantId)}`;
        if (!args.confirm) {
          return ok("hub_v2_issues_participant_remove", {
            code: "PREVIEW",
            message: "set confirm=true to execute this write operation",
            data: {
              method: "DELETE",
              path,
              requiredScope: "issue:participant:write",
            },
          });
        }
        const ctx = resolveHubV2Context(args, "personal");
        const client = new HubV2Client(ctx);
        const data = await client.request("DELETE", client.personalUrl(path));
        return ok("hub_v2_issues_participant_remove", data);
      },
    },
    {
      name: "hub_v2_issues_branch_start_mine",
      description: "Preview or start the current user's Hub V2 issue collaboration branch with Personal Token.",
      riskLevel: "write",
      inputSchema: issueBranchStartMineSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        return issueBodyWrite("hub_v2_issues_branch_start_mine", args, "branches/start-mine", "issue:branch:write", {
          title: args.title,
        });
      },
    },
    issueBranchActionTool("hub_v2_issues_branch_start", "Preview or start a Hub V2 issue collaboration branch with Personal Token.", "start"),
    {
      name: "hub_v2_issues_branch_complete",
      description: "Preview or complete a Hub V2 issue collaboration branch with Personal Token.",
      riskLevel: "write",
      inputSchema: issueBranchCompleteSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        const path = `branches/${encodeURIComponent(args.branchId)}/complete`;
        return issueBodyWrite("hub_v2_issues_branch_complete", args, path, "issue:branch:write", {
          summary: args.summary,
        });
      },
    },
    issueSimpleWriteTool("hub_v2_issues_start", "Preview or start Hub V2 issue processing with Personal Token.", "start", "issue:transition:write"),
    issueSimpleWriteTool("hub_v2_issues_wait_update", "Preview or move a Hub V2 issue to waiting-update with Personal Token.", "wait-update", "issue:transition:write"),
    {
      name: "hub_v2_issues_resolve",
      description: "Preview or resolve a Hub V2 issue with Personal Token.",
      riskLevel: "write",
      inputSchema: issueResolveSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        return issueBodyWrite("hub_v2_issues_resolve", args, "resolve", "issue:transition:write", {
          resolutionSummary: args.resolutionSummary,
        });
      },
    },
    issueSimpleWriteTool("hub_v2_issues_verify", "Preview or verify a Hub V2 issue with Personal Token.", "verify", "issue:transition:write"),
    {
      name: "hub_v2_issues_reopen",
      description: "Preview or reopen a Hub V2 issue with Personal Token.",
      riskLevel: "write",
      inputSchema: issueReopenSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        return issueBodyWrite("hub_v2_issues_reopen", args, "reopen", "issue:transition:write", {
          remark: args.remark,
        });
      },
    },
    {
      name: "hub_v2_issues_close",
      description: "Preview or close a Hub V2 issue with Personal Token.",
      riskLevel: "write",
      inputSchema: issueCloseSchema,
      allowPreviewWhenBlocked: true,
      isConfirmed: (args) => args.confirm === true,
      async handler(args) {
        return issueBodyWrite("hub_v2_issues_close", args, "close", "issue:transition:write", {
          reason: args.reason,
          remark: args.remark,
        });
      },
    },
  ];
}

function issueReadTool(name: string, description: string, suffix: string): McpToolDefinition {
  return {
    name,
    description,
    riskLevel: "read",
    inputSchema: issueReadDetailSchema,
    async handler(args) {
      const ctx = resolveHubV2Context(args, "project");
      const client = new HubV2Client(ctx);
      const data = await client.request("GET", client.tokenUrl(`/issues/${encodeURIComponent(args.issueId)}/${suffix}`));
      return ok(name, data);
    },
  };
}

function issueSimpleWriteTool(name: string, description: string, suffix: string, requiredScope: string): McpToolDefinition {
  return {
    name,
    description,
    riskLevel: "write",
    inputSchema: issueSimpleWriteSchema,
    allowPreviewWhenBlocked: true,
    isConfirmed: (args) => args.confirm === true,
    async handler(args) {
      return issueBodyWrite(name, args, suffix, requiredScope);
    },
  };
}

function issueBranchActionTool(name: string, description: string, suffix: string): McpToolDefinition {
  return {
    name,
    description,
    riskLevel: "write",
    inputSchema: issueBranchActionSchema,
    allowPreviewWhenBlocked: true,
    isConfirmed: (args) => args.confirm === true,
    async handler(args) {
      return issueBodyWrite(name, args, `branches/${encodeURIComponent(args.branchId)}/${suffix}`, "issue:branch:write");
    },
  };
}

async function issueBodyWrite(
  name: string,
  args: Record<string, any>,
  suffix: string,
  requiredScope: string,
  body: Record<string, unknown> = {}
) {
  const path = `/issues/${encodeURIComponent(args.issueId)}/${suffix}`;
  const compactBody = compact(body);
  if (!args.confirm) {
    return ok(name, {
      code: "PREVIEW",
      message: "set confirm=true to execute this write operation",
      data: {
        method: "POST",
        path,
        requiredScope,
        ...(Object.keys(compactBody).length > 0 ? { body: compactBody } : {}),
      },
    });
  }
  const ctx = resolveHubV2Context(args, "personal");
  const client = new HubV2Client(ctx);
  const data = await client.request("POST", client.personalUrl(path), compactBody);
  return ok(name, data);
}

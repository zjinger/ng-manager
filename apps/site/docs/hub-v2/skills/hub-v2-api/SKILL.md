---
name: hub-v2-api
description: Use SL Hub V2 MCP tools to read and operate Issue and RD workflows. Trigger when Codex, OpenCode, Claude Code, OpenClaw, or another agent needs to list or inspect test issues, comments, logs, participants, attachments, issue branches, project members, RD stages, RD items, RD logs, RD progress, transition Issue or RD status, add Issue comments, assign or claim issues, manage issue collaborators or branches, advance RD stages, update RD progress, edit RD basic fields, inspect personal token identity/capabilities, or debug SL Hub V2 token scope errors.
---

# SL Hub V2 API

## Primary Tooling

Prefer the SL Hub V2 MCP server when available. Use these MCP tools first:

- Project/config: `sl_hub_v2.projects_list`
- Identity/permissions: `sl_hub_v2.me`, `sl_hub_v2.capabilities`
- Issues: `sl_hub_v2.issues_list`, `sl_hub_v2.issues_get`, `sl_hub_v2.issues_related`, `sl_hub_v2.issues_comment`, `sl_hub_v2.issues_assign`, `sl_hub_v2.issues_transition`, `sl_hub_v2.issues_branch`, `sl_hub_v2.issues_participant`
- RD: `sl_hub_v2.rd_stages`, `sl_hub_v2.rd_list`, `sl_hub_v2.rd_get`, `sl_hub_v2.rd_related`, `sl_hub_v2.rd_transition`, `sl_hub_v2.rd_advance_stage`, `sl_hub_v2.rd_update_progress`, `sl_hub_v2.rd_update`

Use `scripts/hub_v2_api.py` only when MCP tools are not configured in the current agent.

## Project Selection

- If the user names a project alias such as `hubv2` or `ais`, pass it as `project`.
- If the user says "current project", use `sl_hub_v2.projects_list` and choose the configured default.
- If multiple projects exist and no default is clear, ask for the project alias.
- Treat `projectKey` as the SL Hub V2 API project key, not a local workspace id or display name.

## Read Workflow

- Read operations should run directly with Project Token-backed tools.
- Use `issues_get` / `rd_get` before making recommendations about a specific item.
- Use `issues_related` or `rd_related` when comments, logs, progress, or history may affect the answer.
- For "unfinished Issue" queries, treat `verified` as completed. Unless the user gives a different definition, filter unfinished Issues by excluding `verified` and `closed`.

## Write Workflow

- Issue comments may be executed directly when the user gives both a clear `issueId` and comment content.
- Issue/RD status transitions and RD stage advance must preview first. Call the MCP tool without `confirm`, report the preview, then execute with `confirm: true` only after the user confirms.
- `rd_update_progress` with `progress: 100` must also preview first.
- For ambiguous writes, read detail and capabilities before previewing the write.

## Common Requests

- "我是谁": `sl_hub_v2.me`
- "我能做什么": `sl_hub_v2.capabilities`
- "查看未完成 issue": `sl_hub_v2.issues_list` with status excluding `verified` and `closed`
- "查看某个测试单": find/list if needed, then `sl_hub_v2.issues_get`; load `comments`/`logs` when context matters
- "开始处理测试单": preview `sl_hub_v2.issues_transition` with `action: "start"`, then wait for confirmation
- "查看研发项": `sl_hub_v2.rd_list` or `sl_hub_v2.rd_get`
- "推进研发项阶段": preview `sl_hub_v2.rd_advance_stage`, then wait for confirmation

## Configuration

The MCP server and fallback script share the same SL Hub V2 config. Prefer `%USERPROFILE%\.sl-hub-v2.json` or `SL_HUB_V2_CONFIG`.

Recommended Codex MCP config for the published package:

```toml
[mcp_servers.slHubV2]
command = "npx.cmd"
args = ["-y", "@yinuo-ngm/sl-hub-v2-mcp@0.1.2"]
```

Read `references/config.md` when setting up Codex/OpenCode/Claude Code config or diagnosing missing `base_url`, `project_key`, or credentials.

## References

- Read `references/api.md` only when exact endpoint mapping, request body fields, status transitions, or error details are needed.
- Read `references/config.md` for config file shapes, search order, and MCP client examples.

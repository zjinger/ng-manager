---
name: hub-v2-api
description: Use ng-manager Hub V2 MCP tools to read Issue and RD workflows, inspect project configuration, and perform explicitly confirmed Hub V2 write operations when the unified ngm mcp server exposes them.
---

# Hub V2 API Skill

## Boundary with NGM Local Skills

This skill is only for Hub V2 collaboration platform data.

Use this skill for:

- Hub V2 issues
- RD workflows
- project documents
- Project Token API
- collaboration records

Do not use this skill for local ng-manager engineering control or workspace-context tasks such as:

- starting or stopping local projects
- reading or running `package.json` scripts
- Node runtime selection
- Nginx proxy management
- local API debugging
- CodeGraph
- workspace or monorepo analysis
- packages/* capability analysis
- MCP Server local tools

For those tasks, use NGM local skills:

- `ngm-router`
- `ngm-project`
- `ngm-runtime`
- `ngm-nginx`
- `ngm-workspace`

## Primary Tooling

Use the unified ng-manager MCP server started by `ngm mcp`. This skill is only an Agent usage guide; it must not perform direct Hub V2 HTTP requests, store tokens, or duplicate the Hub V2 API schema.

If the user asks whether the local MCP configuration is ready, or if a tool reports missing Hub V2 config/token values, tell the user to run `ngm mcp doctor`. Do not diagnose by asking for token values in chat.

Use these MCP tools first:

- Project/config: `hub_v2_projects_list`, `hub_v2_projects_get`, `hub_v2_project_members_list`
- Docs: `hub_v2_docs_list`, `hub_v2_docs_get`, `hub_v2_docs_get_by_slug`, `hub_v2_docs_create`, `hub_v2_docs_update`
- Issues: `hub_v2_issues_list`, `hub_v2_issues_get`, `hub_v2_issues_create`, `hub_v2_issues_update`, `hub_v2_issues_comment`, `hub_v2_issues_assign`
- RD read: `hub_v2_rd_list`, `hub_v2_rd_get`, `hub_v2_rd_stage_tasks_list`
- RD write: `hub_v2_rd_create`, `hub_v2_rd_advance_stage`, `hub_v2_rd_stage_tasks_create`, `hub_v2_rd_update_progress`
- Markdown images: `hub_v2_upload_markdown_image`

## Project Selection

- If the user names a configured project alias, pass it as `project`.
- If the user gives a Hub V2 project key, pass it as `projectKey`.
- If the user says "current project", call `hub_v2_projects_list` and use the default or only configured project.
- If multiple projects exist and no default is clear, ask for the project alias.
- Do not assume legacy config files or old env prefixes exist; the MCP server reads `~/.ng-manager/agent-connections.json`, `HUB_V2_CONFIG`, and `HUB_V2_*` overrides.

## Read Workflow

- Read operations use Project Token-backed MCP tools.
- Use `hub_v2_issues_get` or `hub_v2_rd_get` before making recommendations about a specific item.
- For unfinished Issue queries, treat `verified` and `closed` as completed unless the user defines a different status boundary.
- When the user asks who can be assigned, call `hub_v2_project_members_list` and summarize `displayName`, `userId`, and `roleCode`.
- When RD context matters, use `hub_v2_rd_get`; use `hub_v2_rd_stage_tasks_list` when stage-task assignment or per-task progress may affect the answer.
- For RD-associated Issues, use `hub_v2_issues_list` with `rdItemId`.

## Write Workflow

- Write tools use Personal Token and require MCP server write policy: `NGM_MCP_ALLOW_WRITE=true`.
- Never ask the user to paste tokens into chat or tool arguments.
- For Document create/update, Issue create/update/comment/assign, RD create, stage advance, stage-task create, progress update, status changes, or any operation that alters workflow state, preview first when the tool supports preview, then execute only after explicit user confirmation.
- For Markdown images, first call `hub_v2_upload_markdown_image` with either `filePath` or `contentBase64 + fileName`, then insert the returned `markdown` into the target `description` or `content`.
- For Document creation or content updates with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_docs_create` or `hub_v2_docs_update` with the returned Markdown in `content` or `contentMd`.
- For Issue creation with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_issues_create` with the returned Markdown in `description`.
- For Issue description updates with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_issues_update` with the returned Markdown in `description`.
- For Issue comments with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_issues_comment` with the returned Markdown in `content`.
- For Issue assignment, call `hub_v2_project_members_list` when the assignee is not already known, ask the user to choose a member when multiple candidates match, then preview and confirm `hub_v2_issues_assign`.
- For RD creation or stage-task descriptions with images, call `hub_v2_upload_markdown_image`, then insert the returned Markdown into `hub_v2_rd_create.description` or `hub_v2_rd_stage_tasks_create.description`.
- When creating an RD item, include `stageTasks` or `stageTaskTemplates` only when the user explicitly provides initial current-stage tasks or asks to create them from templates.
- When advancing an RD stage, include `stageTasks` or `stageTaskTemplates` if the next stage should start with assigned tasks.
- When updating RD progress and the RD has active stage tasks, pass `stageTaskId`; otherwise tell the user to choose a stage task first.
- If a confirmed write tool is blocked by policy, tell the user to set `NGM_MCP_ALLOW_WRITE=true` in the MCP server environment or MCP client server `env`, then restart the MCP server. Do not retry through direct HTTP.

## Error Handling

- `TOKEN_SCOPE_FORBIDDEN`: explain which scope is missing and whether Project Token or Personal Token is involved.
- Document create requires `doc:create:write`; document update requires `doc:update:write`.
- Issue create requires `issue:create:write`; Issue update requires `issue:update:write`; Issue assignment requires `issue:assign:write`; Issue comments require `issue:comment:write`.
- Markdown image upload requires at least one relevant business write scope such as `issue:create:write`, `issue:update:write`, `issue:comment:write`, `rd:create:write`, `rd:stage-task:write`, `rd:transition:write`, or `rd:edit:write`.
- RD create requires `rd:create:write`; stage-task create requires `rd:stage-task:write`; progress update requires `rd:progress:write` or `rd:transition:write`.
- `TOKEN_PROJECT_FORBIDDEN` or `PROJECT_NOT_FOUND`: verify the configured project alias or project key.
- `PROJECT_ACCESS_DENIED`: explain that the Personal Token owner needs project access.
- `TOKEN_RATE_LIMITED`: back off and suggest retrying later.
- Missing config/token errors such as `HUB_V2_PROJECT_TOKEN is required`: ask the user to check `ngm mcp doctor` and local MCP configuration, not to paste token values.
- Validation errors: summarize the invalid field and ask for the missing business input.

## Reply Rules

- Summarize data in the user's language.
- Include ids, issue numbers, RD titles, statuses, and next actions when relevant.
- Do not reveal token values, Authorization headers, or local config file contents.
- For writes, state whether the operation was previewed, blocked, executed, or unavailable.

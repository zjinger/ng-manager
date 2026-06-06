---
name: hub-v2-api
description: Use ng-manager Hub V2 MCP tools to read Issue and RD workflows, inspect project configuration, and perform explicitly confirmed Hub V2 write operations when the unified ngm mcp server exposes them.
---

# Hub V2 API Skill

## Primary Tooling

Use the unified ng-manager MCP server started by `ngm mcp`. This skill is only an Agent usage guide; it must not perform direct Hub V2 HTTP requests, store tokens, or duplicate the Hub V2 API schema.

Use these MCP tools first:

- Project/config: `hub_v2_projects_list`, `hub_v2_projects_get`
- Issues: `hub_v2_issues_list`, `hub_v2_issues_get`, `hub_v2_issues_create`, `hub_v2_issues_update`, `hub_v2_issues_comment`
- RD read: `hub_v2_rd_list`, `hub_v2_rd_get`, `hub_v2_rd_stage_tasks_list`
- RD write: `hub_v2_rd_create`, `hub_v2_rd_advance_stage`, `hub_v2_rd_stage_tasks_create`, `hub_v2_rd_update_progress`
- Markdown images: `hub_v2_upload_markdown_image`

## Project Selection

- If the user names a configured project alias, pass it as `project`.
- If the user gives a Hub V2 project key, pass it as `projectKey`.
- If the user says "current project", call `hub_v2_projects_list` and use the default or only configured project.
- If multiple projects exist and no default is clear, ask for the project alias.

## Read Workflow

- Read operations use Project Token-backed MCP tools.
- Use `hub_v2_issues_get` or `hub_v2_rd_get` before making recommendations about a specific item.
- For unfinished Issue queries, treat `verified` and `closed` as completed unless the user defines a different status boundary.
- When RD context matters, use `hub_v2_rd_get`; use `hub_v2_rd_stage_tasks_list` when stage-task assignment or per-task progress may affect the answer.
- For RD-associated Issues, use `hub_v2_issues_list` with `rdItemId`.

## Write Workflow

- Write tools use Personal Token and are disabled unless the MCP server policy allows write tools.
- Never ask the user to paste tokens into chat or tool arguments.
- For Issue create, Issue update, Issue comment, RD create, stage advance, stage-task create, progress update, status changes, or any operation that alters workflow state, preview first when the tool supports preview, then execute only after explicit user confirmation.
- For Markdown images, first call `hub_v2_upload_markdown_image` with either `filePath` or `contentBase64 + fileName`, then insert the returned `markdown` into the target `description` or `content`.
- For Issue creation with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_issues_create` with the returned Markdown in `description`.
- For Issue description updates with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_issues_update` with the returned Markdown in `description`.
- For Issue comments with images, call `hub_v2_upload_markdown_image`, then preview and confirm `hub_v2_issues_comment` with the returned Markdown in `content`.
- For RD creation or stage-task descriptions with images, call `hub_v2_upload_markdown_image`, then insert the returned Markdown into `hub_v2_rd_create.description` or `hub_v2_rd_stage_tasks_create.description`.
- When creating an RD item, include `stageTasks` or `stageTaskTemplates` only when the user explicitly provides initial current-stage tasks or asks to create them from templates.
- When advancing an RD stage, include `stageTasks` or `stageTaskTemplates` if the next stage should start with assigned tasks.
- When updating RD progress and the RD has active stage tasks, pass `stageTaskId`; otherwise tell the user to choose a stage task first.
- If a write tool is blocked by policy, tell the user which MCP policy flag is blocking it and do not retry through direct HTTP.

## Error Handling

- `TOKEN_SCOPE_FORBIDDEN`: explain which scope is missing and whether Project Token or Personal Token is involved.
- Issue create requires `issue:create:write`; Issue update requires `issue:update:write`; Issue comments require `issue:comment:write`.
- Markdown image upload requires at least one relevant business write scope such as `issue:create:write`, `issue:update:write`, `issue:comment:write`, `rd:create:write`, `rd:stage-task:write`, `rd:transition:write`, or `rd:edit:write`.
- RD create requires `rd:create:write`; stage-task create requires `rd:stage-task:write`; progress update requires `rd:progress:write` or `rd:transition:write`.
- `TOKEN_PROJECT_FORBIDDEN` or `PROJECT_NOT_FOUND`: verify the configured project alias or project key.
- `PROJECT_ACCESS_DENIED`: explain that the Personal Token owner needs project access.
- `TOKEN_RATE_LIMITED`: back off and suggest retrying later.
- Validation errors: summarize the invalid field and ask for the missing business input.

## Reply Rules

- Summarize data in the user's language.
- Include ids, issue numbers, RD titles, statuses, and next actions when relevant.
- Do not reveal token values, Authorization headers, or local config file contents.
- For writes, state whether the operation was previewed, blocked, executed, or unavailable.

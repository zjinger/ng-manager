# Hub V2 API MCP Tool Reference

This reference describes Agent-facing MCP tools, not Hub V2 REST endpoints.

## Read Tools

- `hub_v2_projects_list`: list configured project aliases without token values.
- `hub_v2_projects_get`: read one configured project summary without token values.
- `hub_v2_project_members_list`: list project members using Project Token; use before assignment, RD member selection, stage-task owner selection, or comment mentions.
- `hub_v2_issues_list`: list issues using Project Token.
- `hub_v2_issues_get`: read one issue using Project Token.
- `hub_v2_rd_list`: list RD items using Project Token.
- `hub_v2_rd_get`: read one RD item using Project Token.
- `hub_v2_rd_stage_tasks_list`: list current RD stage tasks using Project Token.

## Write Tools

- `hub_v2_upload_markdown_image`: upload a Markdown inline image using Personal Token and return a Markdown snippet. Use it before RD/Issue/comment write tools when content includes local or base64 images.
- `hub_v2_issues_create`: preview or create an Issue using Personal Token with `issue:create:write`; `description` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_update`: preview or update Issue basic fields using Personal Token with `issue:update:write`; `description` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_assign`: preview or assign an Issue owner using Personal Token with `issue:assign:write`; call `hub_v2_project_members_list` first when the assignee user id is not known.
- `hub_v2_issues_comment`: preview or add an Issue comment using Personal Token with `issue:comment:write`; `content` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_rd_create`: preview or create an RD item using Personal Token with `rd:create:write`.
- `hub_v2_rd_advance_stage`: preview or execute RD stage advance using Personal Token with `rd:transition:write`; supports `stageTasks` and `stageTaskTemplates`.
- `hub_v2_rd_stage_tasks_create`: preview or create a task on the RD current stage using Personal Token with `rd:stage-task:write`.
- `hub_v2_rd_update_progress`: preview or update RD progress using Personal Token with `rd:progress:write` or `rd:transition:write`; pass `stageTaskId` when active stage tasks exist.

Write tools are disabled by default MCP policy. Set `NGM_MCP_ALLOW_WRITE=true` in the MCP server environment or MCP client server `env`, then restart the MCP server to allow confirmed writes. Even when enabled, workflow-state writes must be previewed first when the tool supports preview, then executed only after explicit user confirmation with `confirm: true`.

## Markdown Image Workflow

1. Use `hub_v2_upload_markdown_image` with `filePath` or `contentBase64 + fileName`.
2. Insert the returned `markdown` into the target text field.
3. Preview the target write tool.
4. Execute the target write with `confirm: true` only after user confirmation.

Supported target fields:

- `hub_v2_issues_create.description`
- `hub_v2_issues_update.description`
- `hub_v2_issues_comment.content`
- `hub_v2_rd_create.description`
- `hub_v2_rd_stage_tasks_create.description`

## Token Use

- Project Token is for read tools.
- Personal Token is for write tools.
- Tool arguments must not include token values.

## Common Errors

| Code | Agent response |
|---|---|
| `TOKEN_SCOPE_FORBIDDEN` | Explain the missing scope and token type. |
| `TOKEN_PROJECT_FORBIDDEN` | Verify the selected project alias or project key. |
| `PROJECT_NOT_FOUND` | Ask for a valid configured project. |
| `PROJECT_ACCESS_DENIED` | Explain that the Personal Token owner lacks project access. |
| `TOKEN_RATE_LIMITED` | Back off and retry later. |
| `VALIDATION_ERROR` | Ask for the missing or invalid field. |

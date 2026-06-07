# Hub V2 API MCP Tool Reference

This reference describes Agent-facing MCP tools, not Hub V2 REST endpoints.

## Read Tools

- `hub_v2_projects_list`: list configured project aliases without token values.
- `hub_v2_projects_get`: read one configured project summary without token values.
- `hub_v2_project_members_list`: list project members using Project Token; use before assignment, RD member selection, stage-task owner selection, or comment mentions.
- `hub_v2_docs_list`: list document metadata using Project Token.
- `hub_v2_docs_get`: read one document by id using Project Token.
- `hub_v2_docs_get_by_slug`: read one document by slug using Project Token.
- `hub_v2_issues_list`: list issues using Project Token.
- `hub_v2_issues_get`: read one issue using Project Token.
- `hub_v2_rd_list`: list RD items using Project Token.
- `hub_v2_rd_get`: read one RD item using Project Token.
- `hub_v2_rd_stage_tasks_list`: list current RD stage tasks using Project Token.

## Write Tools

- `hub_v2_upload_markdown_image`: upload a Markdown inline image using Personal Token and return a Markdown snippet. Use it before RD/Issue/comment write tools when content includes local or base64 images.
- `hub_v2_file_upload`: upload a controlled attachment file using Personal Token and return an `uploadId`. Current targets are `issueAttachment` and `taskSheetAttachment`; this tool does not attach the upload to a business object by itself.
- `hub_v2_docs_create`: preview or create a draft document using Personal Token with `doc:create:write`; `content` or `contentMd` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_docs_update`: preview or update document fields using Personal Token with `doc:update:write`; `content` or `contentMd` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_create`: preview or create an Issue using Personal Token with `issue:create:write`; `description` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_update`: preview or update Issue basic fields using Personal Token with `issue:update:write`; `description` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_assign`: preview or assign an Issue owner using Personal Token with `issue:assign:write`; call `hub_v2_project_members_list` first when the assignee user id is not known.
- `hub_v2_issues_participant_add`: preview or add an Issue collaborator using Personal Token with `issue:participant:write`; pass `taskTitle` when the request is to create a collaborator task branch for a new collaborator.
- `hub_v2_issues_branch_create`: preview or create an Issue collaboration branch for an existing collaborator using Personal Token with `issue:branch:write`.
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

## File Upload Workflow

1. Use `hub_v2_file_upload` with `target`, plus `filePath` or `contentBase64 + fileName`.
2. Keep the returned `uploadId`.
3. Use a business-specific attach tool when available to associate the `uploadId` with an Issue, RD task sheet, or another domain object.
4. Until the attach step succeeds, report the result as uploaded but not attached.

## Issue Collaboration Branch Workflow

When the user asks to create an Issue collaboration branch, do not create an RD item and do not add only a comment.

1. Use `hub_v2_project_members_list` if the collaborator user id is not known.
2. Use `hub_v2_issues_participant_add` with `taskTitle` when adding the collaborator and branch task together.
3. Use `hub_v2_issues_branch_create` when the collaborator already exists on the Issue and needs another branch.
4. Report the result as an Issue collaboration branch, not an RD item.

Supported target fields:

- `hub_v2_issues_create.description`
- `hub_v2_issues_update.description`
- `hub_v2_issues_comment.content`
- `hub_v2_docs_create.content`
- `hub_v2_docs_create.contentMd`
- `hub_v2_docs_update.content`
- `hub_v2_docs_update.contentMd`
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

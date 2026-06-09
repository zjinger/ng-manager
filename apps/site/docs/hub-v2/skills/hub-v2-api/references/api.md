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
- `hub_v2_issues_logs_list`: list issue logs using Project Token.
- `hub_v2_issues_comments_list`: list issue comments using Project Token.
- `hub_v2_issues_participants_list`: list issue participants using Project Token.
- `hub_v2_issues_attachments_list`: list issue attachments using Project Token.
- `hub_v2_issues_branches_list`: list issue collaboration branches using Project Token.
- `hub_v2_issues_attachment_raw_get`: read an issue attachment as bounded base64 metadata using Project Token.
- `hub_v2_issues_upload_raw_get`: read an issue Markdown upload as bounded base64 metadata using Project Token.
- `hub_v2_rd_list`: list RD items using Project Token.
- `hub_v2_rd_get`: read one RD item using Project Token.
- `hub_v2_rd_stage_tasks_list`: list current RD stage tasks using Project Token.
- `hub_v2_rd_stages_list`: list RD stages using Project Token.
- `hub_v2_rd_logs_list`: list RD logs using Project Token.
- `hub_v2_rd_stage_history_list`: list RD stage history using Project Token.
- `hub_v2_rd_progress_list`: list RD member progress using Project Token.
- `hub_v2_rd_progress_history_list`: list RD progress history using Project Token.
- `hub_v2_rd_upload_raw_get`: read an RD Markdown upload as bounded base64 metadata using Project Token.

## Write Tools

- `hub_v2_upload_markdown_image`: upload a Markdown inline image using Personal Token and return a Markdown snippet. Use it before RD/Issue/comment write tools when content includes local or base64 images.
- `hub_v2_file_upload`: upload a controlled attachment file using Personal Token and return an `uploadId`. Current targets are `issueAttachment` and `taskSheetAttachment`; this tool does not attach the upload to a business object by itself.
- `hub_v2_docs_create`: preview or create a draft document using Personal Token with `doc:create:write`; `content` or `contentMd` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_docs_update`: preview or update document fields using Personal Token with `doc:update:write`; `content` or `contentMd` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_docs_publish`: preview or publish a document using Personal Token with `doc:publish:write`.
- `hub_v2_issues_create`: preview or create an Issue using Personal Token with `issue:create:write`; `description` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_update`: preview or update Issue basic fields using Personal Token with `issue:update:write`; `description` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_assign`: preview or assign an Issue owner using Personal Token with `issue:assign:write`; call `hub_v2_project_members_list` first when the assignee user id is not known.
- `hub_v2_issues_claim`: preview or claim an Issue using Personal Token with `issue:assign:write`.
- `hub_v2_issues_participant_add`: preview or add an Issue collaborator using Personal Token with `issue:participant:write`; pass `taskTitle` when the request is to create a collaborator task branch for a new collaborator.
- `hub_v2_issues_participant_remove`: preview or remove an Issue collaborator using Personal Token with `issue:participant:write`.
- `hub_v2_issues_branch_create`: preview or create an Issue collaboration branch for an existing collaborator using Personal Token with `issue:branch:write`.
- `hub_v2_issues_branch_start_mine`: preview or create/start the current user's Issue collaboration branch using Personal Token with `issue:branch:write`.
- `hub_v2_issues_branch_start`: preview or start an Issue collaboration branch using Personal Token with `issue:branch:write`.
- `hub_v2_issues_branch_complete`: preview or complete an Issue collaboration branch using Personal Token with `issue:branch:write`.
- `hub_v2_issues_comment`: preview or add an Issue comment using Personal Token with `issue:comment:write`; `content` may include Markdown returned by `hub_v2_upload_markdown_image`.
- `hub_v2_issues_start`: preview or start Issue processing using Personal Token with `issue:transition:write`.
- `hub_v2_issues_wait_update`: preview or move an Issue to waiting update using Personal Token with `issue:transition:write`.
- `hub_v2_issues_resolve`: preview or resolve an Issue using Personal Token with `issue:transition:write`.
- `hub_v2_issues_verify`: preview or verify an Issue using Personal Token with `issue:transition:write`.
- `hub_v2_issues_reopen`: preview or reopen an Issue using Personal Token with `issue:transition:write`.
- `hub_v2_issues_close`: preview or close an Issue using Personal Token with `issue:transition:write`.
- `hub_v2_rd_create`: preview or create an RD item using Personal Token with `rd:create:write`.
- `hub_v2_rd_advance_stage`: preview or execute RD stage advance using Personal Token with `rd:transition:write`; supports `stageTasks` and `stageTaskTemplates`.
- `hub_v2_rd_stage_tasks_create`: preview or create a task on the RD current stage using Personal Token with `rd:stage-task:write`.
- `hub_v2_rd_update_progress`: preview or update RD progress using Personal Token with `rd:progress:write` or `rd:transition:write`; pass `stageTaskId` when active stage tasks exist.
- `hub_v2_rd_start`: preview or start an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_block`: preview or block an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_resume`: preview or resume an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_complete`: preview or complete an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_accept`: preview or accept an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_reopen`: preview or reopen an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_close`: preview or close an RD item using Personal Token with `rd:transition:write`.
- `hub_v2_rd_update`: preview or update RD item basic fields using Personal Token with `rd:edit:write`; pass the current `version`.

Hub V2 write tools default to preview and execute only after explicit user confirmation with `confirm: true`. They use Personal Token scopes and Hub V2 server-side permissions, and do not require local NGM MCP policy flags such as `NGM_MCP_ALLOW_WRITE`.

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

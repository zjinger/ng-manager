# Hub V2 MCP Alignment Reference

Use this reference when adding, updating, reviewing, or documenting Hub V2 tools in `packages/mcp-server`.

## Files To Inspect

MCP implementation:

- `packages/mcp-server/src/tools/hub-v2/client.ts`
- `packages/mcp-server/src/tools/hub-v2/schemas.ts`
- `packages/mcp-server/src/tools/hub-v2/projects.tools.ts`
- `packages/mcp-server/src/tools/hub-v2/docs.tools.ts`
- `packages/mcp-server/src/tools/hub-v2/issues.tools.ts`
- `packages/mcp-server/src/tools/hub-v2/rd.tools.ts`
- `packages/mcp-server/src/tools/hub-v2/upload.tools.ts`
- `packages/mcp-server/src/tools/hub-v2/config/*`
- `packages/mcp-server/src/tools/hub-v2/index.ts`
- `packages/mcp-server/src/tools/index.ts`
- `packages/mcp-server/src/tools/tool-catalog.ts`
- `packages/mcp-server/test/hub-v2-tools.test.js`

Hub V2 server implementation, when a backend route is needed:

- `apps/hub-v2/server/src/modules/personal-token/*`
- `apps/hub-v2/server/src/modules/project-token/*`
- Existing route tests under the same module folder.

Docs and skills to keep aligned:

- `packages/mcp-server/README.md`
- `apps/site/docs/hub-v2/13-api-token-integration.md`
- `apps/site/docs/hub-v2/19-upload-lifecycle-and-cleanup.md`
- `apps/site/docs/hub-v2/33-mcp-agent-connection-config.md`
- `apps/site/docs/hub-v2/skills/hub-v2-api/SKILL.md`
- `apps/site/docs/hub-v2/skills/hub-v2-api/references/api.md`
- `apps/site/docs/hub-v2/skills/hub-v2-docs/SKILL.md`
- `apps/site/docs/hub-v2/skills/hub-v2-docs/references/api.md`

## Current MCP Tool Groups

Project/config:

- `hub_v2_projects_list`
- `hub_v2_projects_get`
- `hub_v2_project_members_list`

Docs:

- `hub_v2_docs_list`
- `hub_v2_docs_get`
- `hub_v2_docs_get_by_slug`
- `hub_v2_docs_create`
- `hub_v2_docs_update`

Issues:

- `hub_v2_issues_list`
- `hub_v2_issues_get`
- `hub_v2_issues_create`
- `hub_v2_issues_update`
- `hub_v2_issues_comment`
- `hub_v2_issues_assign`
- `hub_v2_issues_participant_add`
- `hub_v2_issues_branch_create`

Uploads:

- `hub_v2_upload_markdown_image`
- `hub_v2_file_upload`

RD:

- `hub_v2_rd_list`
- `hub_v2_rd_get`
- `hub_v2_rd_stage_tasks_list`
- `hub_v2_rd_create`
- `hub_v2_rd_advance_stage`
- `hub_v2_rd_stage_tasks_create`
- `hub_v2_rd_update_progress`

## Hub V2 Tool Rules

- Use `HubV2Client` and `resolveHubV2Context`; do not duplicate token/config loading inside handlers.
- Project Token-backed read tools use `client.tokenUrl(...)`.
- Personal Token-backed write tools use `client.personalUrl(...)`.
- Write tools must support preview and require `confirm=true`.
- Preview responses should include method, path, required scope, and compact body/input summary.
- Do not ask for token values in chat. For missing config, tell the user to run `ngm mcp doctor`.
- Do not perform direct REST calls from a skill. Skills teach use of MCP tools; they do not bypass MCP.

## Hub V2 Docs Alignment Rules

- Treat Token API docs as backend route coverage, not as proof that an MCP tool exists.
- In `13-api-token-integration.md`, keep a clear mapping between Token API capabilities and MCP-exposed tools.
- If a Token route exists but no MCP tool exists, document it as "MCP not exposed" and update skills so Agents do not promise it.
- In `hub-v2-api` skill files, list only registered MCP tools.
- If a user asks for Issue collaboration branch creation, use Issue tools, not RD tools:
  - Add collaborator plus task branch with `hub_v2_issues_participant_add` when the user is not already a collaborator.
  - Create a branch for an existing collaborator with `hub_v2_issues_branch_create`.
- `hub_v2_file_upload` uploads a file and returns `uploadId`; it does not attach the file to an Issue, RD, or stage task until a future business attach/update tool consumes that id.
- `hub_v2_upload_markdown_image` returns Markdown intended for document content, Issue descriptions/comments, RD descriptions, or stage-task descriptions.

## Token Routes Currently Not MCP-Exposed

Do not teach Agents to execute these through MCP unless a tool is added and registered:

- Docs publish.
- Issue logs, comments list, participants list, attachments list, branches list, raw attachment/upload reads.
- Issue claim, start, wait-update, resolve, verify, reopen, close.
- Issue branch start-mine, start, complete.
- Issue participant delete.
- RD stages dictionary, logs, stage history, progress history, raw upload reads.
- RD start, block, resume, complete, accept, reopen, close.
- RD basic field patch.
- Feedback list/detail.

## Verification

For MCP-only changes:

```bash
npm run build -w @yinuo-ngm/mcp-server
npm test -w @yinuo-ngm/mcp-server
```

For Hub V2 server route changes, also run the narrow server build/test that covers the modified module. Prefer an existing module test command if one already exists in the package scripts or prior test files.

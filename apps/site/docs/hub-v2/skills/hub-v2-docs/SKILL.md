---
name: hub-v2-docs
description: Use ng-manager Hub V2 MCP tools to list, read, create, update, and publish Hub V2 project documents through the unified ngm mcp server without direct REST calls.
---

# Hub V2 Docs Skill

## Boundary with NGM Local Skills

This skill is only for Hub V2 project documents and collaboration platform data.

Use this skill for:

- Hub V2 project documents
- document discovery
- document Markdown reads
- controlled document draft create/update
- controlled document publish
- Project Token and Personal Token document API

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

- Project/config: `hub_v2_projects_list`, `hub_v2_projects_get`
- List docs: `hub_v2_docs_list`
- Read by id: `hub_v2_docs_get`
- Read by slug: `hub_v2_docs_get_by_slug`
- Create draft: `hub_v2_docs_create`
- Update doc: `hub_v2_docs_update`
- Publish doc: `hub_v2_docs_publish`

## Project Selection

- If the user names a configured project alias, pass it as `project`.
- If the user gives a Hub V2 project key, pass it as `projectKey`.
- If the user says "current project", call `hub_v2_projects_list` and use the default or only configured project.
- If multiple projects exist and no default is clear, ask for the project alias.
- Do not assume legacy config files or old env prefixes exist; the MCP server reads `~/.ng-manager/agent-connections.json`, `HUB_V2_CONFIG`, and `HUB_V2_*` overrides.

## Read Workflow

- List/read operations use Project Token-backed MCP tools.
- `hub_v2_docs_list` is for discovery and metadata; use `hub_v2_docs_get` or `hub_v2_docs_get_by_slug` when Markdown content is needed.
- Use `contentOnly: true` for slug reads when the user only wants the Markdown body.
- For slug-like user input, try `hub_v2_docs_get_by_slug`; otherwise list/search first and then read by id.

## Write Boundary

- Document create/update/publish tools use Personal Token and do not require local NGM MCP policy flags such as `NGM_MCP_ALLOW_WRITE`.
- Preview document create/update first when the tool supports preview, then execute only after explicit user confirmation with `confirm: true`.
- Publishing documents is exposed as `hub_v2_docs_publish` and must be previewed and confirmed like other write tools. Archiving documents is not exposed by the current MCP tools.
- Never ask the user to paste tokens into chat or tool arguments.

## Error Handling

- `TOKEN_SCOPE_FORBIDDEN`: explain that the Project Token needs `docs:read` for read operations.
- Document create requires `doc:create:write`; document update requires `doc:update:write`; document publish requires `doc:publish:write`, all on Personal Token.
- `TOKEN_PROJECT_FORBIDDEN` or `PROJECT_NOT_FOUND`: verify the configured project alias or project key.
- `DOCUMENT_NOT_FOUND`: list docs again or ask for a more precise id or slug.
- `TOKEN_RATE_LIMITED`: back off and suggest retrying later.
- Missing config/token errors such as `HUB_V2_PROJECT_TOKEN is required`: ask the user to check `ngm mcp doctor` and local MCP configuration, not to paste token values.

## Reply Rules

- Summarize document lists with title, slug, status, updated time, and id.
- When returning Markdown content, preserve headings and code blocks.
- Do not reveal token values, Authorization headers, or local config file contents.

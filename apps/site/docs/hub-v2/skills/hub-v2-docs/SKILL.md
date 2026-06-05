---
name: hub-v2-docs
description: Use SL Hub V2 MCP tools to read and write project documents. Trigger when Codex, OpenCode, Claude Code, OpenClaw, or another agent needs to list project docs, fetch Markdown content by id or slug, create a draft doc, update doc title/content/slug/category/summary/version/tags, publish a doc after confirmation, use shared SL Hub V2 token config, or debug SL Hub V2 doc token errors such as TOKEN_SCOPE_FORBIDDEN, TOKEN_PROJECT_FORBIDDEN, PROJECT_ACCESS_DENIED, PROJECT_NOT_FOUND, DOCUMENT_SLUG_EXISTS, and DOCUMENT_NOT_FOUND.
---

# SL Hub V2 Docs

## Primary Tooling

Prefer the SL Hub V2 MCP server when available. Use these MCP tools first:

- Project/config: `sl_hub_v2.projects_list`
- List docs: `sl_hub_v2.docs_list`
- Read by id: `sl_hub_v2.docs_get`
- Read by slug: `sl_hub_v2.docs_get_by_slug`
- Create draft: `sl_hub_v2.docs_create_draft`
- Update doc: `sl_hub_v2.docs_update`
- Publish doc: `sl_hub_v2.docs_publish`

Use `scripts/hub_v2_docs.py` only when MCP tools are not configured in the current agent.

## Project Selection

- If the user names a project alias such as `hubv2` or `ais`, pass it as `project`.
- If the user says "current project", use `sl_hub_v2.projects_list` and choose the configured default.
- If multiple projects exist and no default is clear, ask for the project alias.
- Treat `projectKey` as the SL Hub V2 API project key, not a local workspace id or display name.

## Read Workflow

- Read/list operations should run directly with Project Token-backed tools.
- `docs_list` does not include full Markdown body; use `docs_get` or `docs_get_by_slug` for document content.
- Use `contentOnly: true` for slug reads when the user only wants Markdown content.

## Write Workflow

- Use English short-word slugs joined by hyphens, for example `project-api-guide`.
- Before creating, check for an existing `slug` with `docs_list` or `docs_get_by_slug`.
- Always create with `docs_create_draft`; do not publish as part of creation.
- After creating a draft, report id, slug, title, and status, then ask "草稿已创建，是否发布？"
- Publish only after confirmation. `docs_publish` previews when `confirm` is omitted; execute with `confirm: true` only after the user confirms.
- For updates, read the current doc first when version, slug, or existing content may matter.

## Common Requests

- "查询项目中有多少文档": `sl_hub_v2.docs_list`
- "总共哪些文档": `sl_hub_v2.docs_list` with a sufficient `pageSize`
- "看某个文档": use `docs_get_by_slug` for slug-like values, otherwise list/search then `docs_get`
- "创建文档": check slug duplicate, then `docs_create_draft`
- "发布文档": preview `docs_publish`, then wait for confirmation

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

- Read `references/api.md` only when exact endpoint mapping, request body fields, response fields, or error handling are needed.
- Read `references/config.md` for config file shapes, search order, and MCP client examples.

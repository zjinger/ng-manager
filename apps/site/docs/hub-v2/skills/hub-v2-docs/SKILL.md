---
name: hub-v2-docs
description: Use ng-manager Hub V2 MCP tools to list and read Hub V2 project documents, and to guide future document write operations through the unified ngm mcp server without direct REST calls.
---

# Hub V2 Docs Skill

## Primary Tooling

Use the unified ng-manager MCP server started by `ngm mcp`. This skill is only an Agent usage guide; it must not perform direct Hub V2 HTTP requests, store tokens, or duplicate the Hub V2 API schema.

If the user asks whether the local MCP configuration is ready, or if a tool reports missing Hub V2 config/token values, tell the user to run `ngm mcp doctor`. Do not diagnose by asking for token values in chat.

Use these MCP tools first:

- Project/config: `hub_v2_projects_list`, `hub_v2_projects_get`
- List docs: `hub_v2_docs_list`
- Read by id: `hub_v2_docs_get`
- Read by slug: `hub_v2_docs_get_by_slug`

Deprecated Python helpers in this directory are migration stubs and are not a normal Agent workflow.

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

- Current unified MCP rollout prioritizes read tools. Do not create, update, publish, or archive documents through direct HTTP from this skill.
- If future document write tools are added, they must use Personal Token, be marked as write tools, and require explicit confirmation before publish-style operations.
- Never ask the user to paste tokens into chat or tool arguments.

## Error Handling

- `TOKEN_SCOPE_FORBIDDEN`: explain that the Project Token needs `docs:read` for read operations.
- `TOKEN_PROJECT_FORBIDDEN` or `PROJECT_NOT_FOUND`: verify the configured project alias or project key.
- `DOCUMENT_NOT_FOUND`: list docs again or ask for a more precise id or slug.
- `TOKEN_RATE_LIMITED`: back off and suggest retrying later.
- Missing config/token errors such as `HUB_V2_PROJECT_TOKEN is required`: ask the user to check `ngm mcp doctor` and local MCP configuration, not to paste token values.

## Reply Rules

- Summarize document lists with title, slug, status, updated time, and id.
- When returning Markdown content, preserve headings and code blocks.
- Do not reveal token values, Authorization headers, or local config file contents.

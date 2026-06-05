# Hub V2 Docs MCP Tool Reference

This reference describes Agent-facing MCP tools, not Hub V2 REST endpoints.

## Read Tools

- `hub_v2_projects_list`: list configured project aliases without token values.
- `hub_v2_projects_get`: read one configured project summary without token values.
- `hub_v2_docs_list`: list document metadata using Project Token.
- `hub_v2_docs_get`: read one document by id using Project Token.
- `hub_v2_docs_get_by_slug`: read one document by slug using Project Token.

## Read Behavior

- Lists omit full Markdown content.
- Detail reads include Markdown content when Hub V2 returns it.
- Use `contentOnly: true` only when the user wants just the Markdown body.
- Archived documents require an explicit archived-status query.

## Token Use

- Project Token is required for document reads.
- Tool arguments must not include token values.
- Personal Token document writes are reserved for future unified MCP tools.

## Common Errors

| Code | Agent response |
|---|---|
| `TOKEN_SCOPE_FORBIDDEN` | Explain that `docs:read` is required. |
| `TOKEN_PROJECT_FORBIDDEN` | Verify the selected project alias or project key. |
| `PROJECT_NOT_FOUND` | Ask for a valid configured project. |
| `DOCUMENT_NOT_FOUND` | Re-list documents or ask for a valid id or slug. |
| `TOKEN_RATE_LIMITED` | Back off and retry later. |

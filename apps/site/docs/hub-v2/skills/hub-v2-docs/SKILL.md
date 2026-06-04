---
name: hub-v2-docs
description: Read and write SL Hub V2 project documents through REST APIs. Use when Codex, OpenClaw, or another agent needs to list project docs, fetch Markdown content by id or slug, create a draft doc, update doc title/content/slug/category/summary/version, publish a doc, generate safe curl commands, use external token/base_url config, or debug SL Hub V2 doc token errors such as TOKEN_SCOPE_FORBIDDEN, TOKEN_PROJECT_FORBIDDEN, PROJECT_ACCESS_DENIED, PROJECT_NOT_FOUND, DOCUMENT_SLUG_EXISTS, and DOCUMENT_NOT_FOUND.
---

# SL Hub V2 Docs

## Core Rules

- Read operations use Project Token with `docs:read`.
- Write operations use Personal Token:
  - Create: `doc:create:write`
  - Update: `doc:update:write`
  - Publish: `doc:publish:write`
- Do not use Personal Token for reads unless the user explicitly asks to inspect write-side behavior.
- Do not use Project Token for create, update, or publish.
- Treat `projectKey` as the SL Hub V2 project key in the URL path, not a local project id or project name.
- Default `base_url` is `http://192.168.1.31:7008`, but prefer external config when available.
- Use English short-word slugs joined by hyphens, for example `project-api-guide`.

### Write Safety Rules

- **Always create as draft first.** Never auto-publish. Create → confirm with user → then publish.
- **Check for duplicates before creating.** List docs first and check if the same `slug` already exists. If `DOCUMENT_SLUG_EXISTS` is returned, ask the user whether to update the existing doc instead of creating a new one.
- **Publish requires explicit user confirmation.** After creating a draft, report the draft info (id, slug, title, status) and ask the user: "草稿已创建，是否发布？" Only publish when the user confirms.
- **No delete API available.** Be careful with create operations since they cannot be undone. Double-check title, slug, and content before creating.

## External Config

Use external config so the user does not need to provide `base_url` or tokens in every prompt. `$hub-v2-docs` and `$hub-v2-api` use the same SL Hub V2 config shape and should share one file.

Supported config locations:

1. `--config <path>` when using the script.
2. `SL_HUB_V2_CONFIG` environment variable.
3. `%USERPROFILE%\.openclaw\sl-hub-v2.json`
4. `%USERPROFILE%\.codex\sl-hub-v2.json`
5. OpenCode merged config:
   - User config: `%USERPROFILE%\.config\opencode\opencode.json` or `.jsonc`; on Windows also `%APPDATA%\opencode\opencode.json` or `.jsonc`.
   - Custom config path from `OPENCODE_CONFIG`.
   - Project config: `<workspace>\opencode.json` or `<workspace>\opencode.jsonc`.
   - Inline config from `OPENCODE_CONFIG_CONTENT`.
6. Claude Code project settings: `<workspace>\.claude\settings.local.json`, then `<workspace>\.claude\settings.json`
7. Claude Code user settings: `%USERPROFILE%\.claude\settings.json`
8. `%USERPROFILE%\.sl-hub-v2.json`

Config file shape:

```json
{
  "base_url": "http://192.168.1.31:7008",
  "project_key": "prj_xxx",
  "project_name": "示例项目",
  "project_token": "Project Token with docs:read",
  "personal_token": "Personal Token with doc write scopes",
  "source": "openclaw"
}
```

CamelCase keys are also accepted: `baseUrl`, `projectKey`, `projectName`, `projectToken`, `personalToken`.

Multiple projects are supported:

```json
{
  "base_url": "http://192.168.1.31:7008",
  "default_project": "demo",
  "projects": {
    "demo": {
      "project_key": "prj_demo",
      "project_name": "演示项目",
      "project_token": "Project Token for demo",
      "personal_token": "Personal Token for demo",
      "source": "openclaw"
    },
    "ops": {
      "project_key": "prj_ops",
      "project_name": "运维项目",
      "project_token": "Project Token for ops",
      "personal_token": "Personal Token for ops",
      "source": "openclaw"
    }
  }
}
```

Select a configured project with `--project demo` or `SL_HUB_V2_PROJECT=demo`. If only one project is configured, it is selected automatically. If multiple projects are configured and no `default_project` is set, ask the user which project alias to use.

`project_name` / `projectName` is optional and used only as a human-readable display name when listing configured projects or describing choices to the user. The actual API path still uses `project_key` / `projectKey`.

Claude Code settings are also accepted through `env`:

```json
{
  "env": {
    "SL_HUB_V2_BASE_URL": "http://192.168.1.31:7008",
    "SL_HUB_V2_PROJECT_KEY": "prj_xxx",
    "SL_HUB_V2_PROJECT_NAME": "示例项目",
    "SL_HUB_V2_PROJECT_TOKEN": "Project Token with docs:read",
    "SL_HUB_V2_PERSONAL_TOKEN": "Personal Token with doc write scopes",
    "SL_HUB_V2_SOURCE": "claude-code"
  }
}
```

Claude Code settings may also use a dedicated object:

```json
{
  "slHubV2": {
    "baseUrl": "http://192.168.1.31:7008",
    "projectKey": "prj_xxx",
    "projectName": "示例项目",
    "projectToken": "Project Token with docs:read",
    "personalToken": "Personal Token with doc write scopes",
    "source": "claude-code"
  }
}
```

OpenCode config may use the same dedicated object in `opencode.json` or `opencode.jsonc`:

```json
{
  "slHubV2": {
    "baseUrl": "http://192.168.1.31:7008",
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "projectKey": "prj_demo",
        "projectName": "演示项目",
        "projectToken": "Project Token with docs:read",
        "personalToken": "Personal Token with doc write scopes",
        "source": "opencode"
      }
    }
  }
}
```

Resolution priority:

1. Explicit CLI argument.
2. Environment variable.
3. Config file.
4. Built-in default for `base_url` only.

Environment variables:

- `SL_HUB_V2_BASE_URL`
- `SL_HUB_V2_PROJECT`
- `SL_HUB_V2_PROJECT_KEY`
- `SL_HUB_V2_PROJECT_TOKEN`
- `SL_HUB_V2_PERSONAL_TOKEN`
- `SL_HUB_V2_CONFIG`
- `SL_HUB_V2_SOURCE`
- `OPENCODE_CONFIG`
- `OPENCODE_CONFIG_CONTENT`

## Operations

Read:

- List docs: `GET /api/token/projects/:projectKey/docs`
- Read by id: `GET /api/token/projects/:projectKey/docs/:docId`
- Read by slug: `GET /api/token/projects/:projectKey/docs/by-slug/:slug`
- List responses do not return `contentMd`; use detail reads for Markdown body.

Write:

- Create draft: `POST /api/personal/projects/:projectKey/docs`
- Update doc: `PATCH /api/personal/projects/:projectKey/docs/:docId`
- Publish doc: `POST /api/personal/projects/:projectKey/docs/:docId/publish`
- Create only supports missing status or `draft`; publish must call `/publish`.

## Script Helper

Prefer MCP tools named `sl_hub_v2.docs_*` when an SL Hub V2 MCP server is available. Use the script helper as a fallback when MCP tools are not configured in the current agent.

Use `scripts/hub_v2_docs.py` for deterministic reads and writes.

List docs using external config:

```bash
python scripts/hub_v2_docs.py list
```

List configured project aliases:

```bash
python scripts/hub_v2_docs.py projects
```

List docs for a selected configured project:

```bash
python scripts/hub_v2_docs.py --project demo list
```

Read Markdown by slug:

```bash
python scripts/hub_v2_docs.py --project demo slug --slug project-api-guide --content-only
```

Create from Markdown file:

```bash
python scripts/hub_v2_docs.py --project demo create --title "Project API Guide" --slug project-api-guide --content-file ./project-api-guide.md --category-id integration
```

Update:

```bash
python scripts/hub_v2_docs.py --project demo update --doc-id doc_xxx --content-file ./project-api-guide.md
```

Publish:

```bash
python scripts/hub_v2_docs.py --project demo publish --doc-id doc_xxx
```

## Agent Workflow

1. Determine whether the user wants read or write.
2. For reads, use Project Token. For writes, use Personal Token.
3. Prefer external config for `base_url`, project alias/projectKey, and tokens.
4. If multiple projects are configured and no default is selected, run/list configured projects and ask the user which project alias to use.
5. Ask for missing `projectKey`, `docId`, `slug`, title, or content only when not available in config or prompt.
6. If generating commands, redact tokens as `<PROJECT_TOKEN>` or `<PERSONAL_TOKEN>`.
7. Execute calls through the script helper when possible.

### Write Workflow (must follow in order)

1. **Check duplicates:** Before creating, list docs and check if the target `slug` already exists.
   - If exists: ask user whether to update the existing doc (`PATCH`) instead.
   - If not exists: proceed to step 2.
2. **Create draft:** `POST /api/personal/projects/:projectKey/docs` with `status: draft`.
3. **Report draft:** Show the user the created doc info (id, slug, title, status=draft).
4. **Wait for confirmation:** Ask "草稿已创建，是否发布？"
5. **Publish (only on confirmation):** `POST /api/personal/projects/:projectKey/docs/:docId/publish`.
6. **Report result:** Show the published doc info.

## References

Read `references/api.md` when exact endpoints, request bodies, response fields, status rules, or error handling are needed.

Read `references/config.md` when setting up OpenClaw/Codex external config.

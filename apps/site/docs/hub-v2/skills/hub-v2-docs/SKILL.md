---
name: hub-v2-docs
description: Read and write Hub V2 project documents through REST APIs. Use when Codex, OpenClaw, or another agent needs to list project docs, fetch Markdown content by id or slug, create a draft doc, update doc title/content/slug/category/summary/version, publish a doc, generate safe curl commands, use external token/base_url config, or debug Hub V2 doc token errors such as TOKEN_SCOPE_FORBIDDEN, TOKEN_PROJECT_FORBIDDEN, PROJECT_ACCESS_DENIED, PROJECT_NOT_FOUND, DOCUMENT_SLUG_EXISTS, and DOCUMENT_NOT_FOUND.
---

# Hub V2 Docs

## Core Rules

- Read operations use Project Token with `docs:read`.
- Write operations use Personal Token:
  - Create: `doc:create:write`
  - Update: `doc:update:write`
  - Publish: `doc:publish:write`
- Do not use Personal Token for reads unless the user explicitly asks to inspect write-side behavior.
- Do not use Project Token for create, update, or publish.
- Never print, log, commit, or paste full token values.
- Treat `projectKey` as the Hub V2 project key in the URL path, not a local project id or project name.
- Default `base_url` is `http://192.168.1.31:7008`, but prefer external config when available.
- Use English short-word slugs joined by hyphens, for example `project-api-guide`.

## External Config

Use external config so the user does not need to provide `base_url` or tokens in every prompt.

Supported config locations:

1. `--config <path>` when using the script.
2. `HUB_V2_DOCS_CONFIG` environment variable.
3. `%USERPROFILE%\.openclaw\hub-v2-docs.json`
4. `%USERPROFILE%\.codex\hub-v2-docs.json`
5. `%USERPROFILE%\.hub-v2-docs.json`

Config file shape:

```json
{
  "base_url": "http://192.168.1.31:7008",
  "project_key": "prj_xxx",
  "project_token": "Project Token with docs:read",
  "personal_token": "Personal Token with doc write scopes",
  "source": "openclaw"
}
```

CamelCase keys are also accepted: `baseUrl`, `projectKey`, `projectToken`, `personalToken`.

Resolution priority:

1. Explicit CLI argument.
2. Environment variable.
3. Config file.
4. Built-in default for `base_url` only.

Environment variables:

- `HUB_V2_BASE_URL`
- `HUB_V2_PROJECT_KEY`
- `HUB_V2_PROJECT_TOKEN`
- `HUB_V2_PERSONAL_TOKEN`
- `HUB_V2_DOCS_CONFIG`

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

Use `scripts/hub_v2_docs.py` for deterministic reads and writes.

List docs using external config:

```bash
python scripts/hub_v2_docs.py list
```

Read Markdown by slug:

```bash
python scripts/hub_v2_docs.py slug --slug project-api-guide --content-only
```

Create from Markdown file:

```bash
python scripts/hub_v2_docs.py create --title "Project API Guide" --slug project-api-guide --content-file ./project-api-guide.md --category-id integration
```

Update:

```bash
python scripts/hub_v2_docs.py update --doc-id doc_xxx --content-file ./project-api-guide.md
```

Publish:

```bash
python scripts/hub_v2_docs.py publish --doc-id doc_xxx
```

## Agent Workflow

1. Determine whether the user wants read or write.
2. For reads, use Project Token. For writes, use Personal Token.
3. Prefer external config for `base_url`, `projectKey`, and tokens.
4. Ask for missing `projectKey`, `docId`, `slug`, title, or content only when not available in config or prompt.
5. If generating commands, redact tokens as `<PROJECT_TOKEN>` or `<PERSONAL_TOKEN>`.
6. If executing calls, never echo token values.

## References

Read `references/api.md` when exact endpoints, request bodies, response fields, status rules, or error handling are needed.

Read `references/config.md` when setting up OpenClaw/Codex external config.

---
name: hub-v2-docs-read
description: Read Hub V2 project documents through the Project Token docs:read REST API. Use when Codex, OpenClaw, or another agent needs to list project docs, fetch a doc by id, fetch a doc by slug, retrieve Markdown contentMd, generate curl commands for doc reads, or debug Project Token document read errors such as TOKEN_SCOPE_FORBIDDEN, TOKEN_PROJECT_FORBIDDEN, PROJECT_NOT_FOUND, and DOCUMENT_NOT_FOUND.
---

# Hub V2 Docs Read

## Core Rules

- Use Project Token for document reads.
- Require `docs:read` scope.
- Never use Personal Token for this read flow unless the user explicitly asks for write operations.
- Never print, log, commit, or paste the full token.
- Treat `projectKey` as the Hub V2 project key used in the URL path, not a local project id or project name.
- Keep list calls lightweight: list endpoints do not return `contentMd`; fetch detail by `docId` or `slug` when Markdown content is needed.

## Inputs

Collect or infer these values before calling the API:

- `baseUrl`: Hub V2 host, for example `http://192.168.1.31:7008`.
- `projectKey`: Hub V2 project key, for example `prj_xxxxxxxxxxxxxxxxxxxxxxxx`.
- `projectToken`: Project Token with `docs:read`.
- One of:
  - list filters: `page`, `pageSize`, `statusGroup`, `status`, `keyword`, `category`, `categoryId`
  - `docId`
  - `slug`

Prefer reading the token from an environment variable such as `HUB_V2_PROJECT_TOKEN`.

## Workflow

1. Decide the operation:
   - List docs: `GET /api/token/projects/:projectKey/docs`
   - Read by id: `GET /api/token/projects/:projectKey/docs/:docId`
   - Read by slug: `GET /api/token/projects/:projectKey/docs/by-slug/:slug`
2. Use `Authorization: Bearer <PROJECT_TOKEN>`.
3. For list calls, default to `page=1&pageSize=20&statusGroup=active` unless the user requests other filters.
4. If the user needs Markdown, call a detail endpoint and read `data.contentMd`.
5. If returning output to the user, summarize metadata and content. Do not expose token values.

## Script Helper

Use `scripts/read_hub_docs.py` when a deterministic read helper is useful. It only uses the Python standard library.

Examples:

```bash
python scripts/read_hub_docs.py list --base-url http://192.168.1.31:7008 --project-key prj_xxx --token-env HUB_V2_PROJECT_TOKEN --page 1 --page-size 20
```

```bash
python scripts/read_hub_docs.py get --base-url http://192.168.1.31:7008 --project-key prj_xxx --token-env HUB_V2_PROJECT_TOKEN --doc-id doc_xxx --content-only
```

```bash
python scripts/read_hub_docs.py slug --base-url http://192.168.1.31:7008 --project-key prj_xxx --token-env HUB_V2_PROJECT_TOKEN --slug token-api-read-doc
```

## Curl Templates

Windows cmd single-line list request:

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs?page=1&pageSize=20&statusGroup=active" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

Read by id:

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs/<DOC_ID>" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

Read by slug:

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs/by-slug/<DOC_SLUG>" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

## References

Read `references/api.md` when exact response fields, query parameters, or error handling are needed.

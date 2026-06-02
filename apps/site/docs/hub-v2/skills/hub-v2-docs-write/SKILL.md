---
name: hub-v2-docs-write
description: Create, update, and publish Hub V2 project documents through the Personal Token REST API. Use when Codex, OpenClaw, or another agent needs to write Markdown docs into Hub V2, create a draft doc, edit title/content/slug/category/summary/version, publish a doc, generate safe curl commands for Personal Token doc writes, or debug write errors such as TOKEN_SCOPE_FORBIDDEN, PROJECT_NOT_FOUND, PROJECT_ACCESS_DENIED, DOCUMENT_SLUG_EXISTS, and DOCUMENT_NOT_FOUND.
---

# Hub V2 Docs Write

## Core Rules

- Use Personal Token for document writes.
- Required scopes:
  - Create: `doc:create:write`
  - Update: `doc:update:write`
  - Publish: `doc:publish:write`
- Default `baseUrl` is `http://192.168.1.31:7008`; override only when the user provides another host.
- Never use Project Token for create, update, or publish.
- Never print, log, commit, or paste the full Personal Token.
- Prefer reading the token from `HUB_V2_PERSONAL_TOKEN`.
- Treat `projectKey` as the Hub V2 project key in the URL path, not a local project id or project name.
- Use English short-word slugs joined by hyphens, for example `token-api-test-doc`.
- Do not publish through create/update payloads. Create only supports missing status or `draft`; publish must call `/publish`.

## Inputs

Collect or infer these values before calling the API:

- `projectKey`: Hub V2 project key.
- `personalToken`: Personal Token with the required doc write scopes.
- For create:
  - `title`
  - Markdown `content` or `contentMd`
  - optional `slug`, `categoryId`, `summary`, `tags`, `source`
- For update:
  - `docId`
  - fields to change: `title`, `content`, `slug`, `categoryId`, `summary`, `version`, `tags`, `source`
- For publish:
  - `docId`
  - optional `source`

## Workflow

1. Decide the operation:
   - Create draft: `POST /api/personal/projects/:projectKey/docs`
   - Update doc: `PATCH /api/personal/projects/:projectKey/docs/:docId`
   - Publish doc: `POST /api/personal/projects/:projectKey/docs/:docId/publish`
2. Use `Authorization: Bearer <PERSONAL_TOKEN>` and `Content-Type: application/json`.
3. Normalize Markdown to `content` or `contentMd`; both are accepted.
4. Use `categoryId` when matching examples; it maps to the existing document `category`.
5. After create, capture `data.id`; update and publish need this `docId`.
6. After publish, check `data.status` is `published` and `data.publishAt` is present.
7. If returning commands to a user, keep them Windows cmd single-line unless the user asks otherwise.

## Script Helper

Use `scripts/write_hub_docs.py` when deterministic write calls are useful. It only uses the Python standard library.

Create from inline content:

```bash
python scripts/write_hub_docs.py --project-key prj_xxx create --title "API Guide" --slug api-guide --content "# API Guide"
```

Create from a Markdown file:

```bash
python scripts/write_hub_docs.py --project-key prj_xxx create --title "API Guide" --slug api-guide --content-file ./api-guide.md --category-id integration
```

Update:

```bash
python scripts/write_hub_docs.py --project-key prj_xxx update --doc-id doc_xxx --title "Updated API Guide" --content-file ./api-guide.md
```

Publish:

```bash
python scripts/write_hub_docs.py --project-key prj_xxx publish --doc-id doc_xxx
```

The script defaults:

- `--base-url` from `HUB_V2_BASE_URL`, otherwise `http://192.168.1.31:7008`
- token from `HUB_V2_PERSONAL_TOKEN`
- `source` as `agent`

## Curl Templates

Create:

```cmd
curl -X POST "http://192.168.1.31:7008/api/personal/projects/<PROJECT_KEY>/docs" -H "Content-Type: application/json" -H "Authorization: Bearer <PERSONAL_TOKEN>" -d "{\"title\":\"Token API 测试文档\",\"slug\":\"token-api-test-doc\",\"content\":\"# Token API 测试文档\n\n这是一篇通过 Personal Token 创建的文档。\",\"categoryId\":\"api-test\",\"summary\":\"Personal Token 创建文档测试\",\"tags\":[\"token-api\",\"docs\"],\"status\":\"draft\",\"source\":\"agent\"}"
```

Update:

```cmd
curl -X PATCH "http://192.168.1.31:7008/api/personal/projects/<PROJECT_KEY>/docs/<DOC_ID>" -H "Content-Type: application/json" -H "Authorization: Bearer <PERSONAL_TOKEN>" -d "{\"title\":\"Token API 更新后的文档\",\"slug\":\"token-api-updated-doc\",\"content\":\"# Token API 更新后的文档\n\n这是通过 Personal Token 更新后的正文。\",\"categoryId\":\"api-test\",\"summary\":\"Personal Token 编辑文档测试\",\"tags\":[\"token-api\",\"docs\",\"updated\"],\"source\":\"agent\"}"
```

Publish:

```cmd
curl -X POST "http://192.168.1.31:7008/api/personal/projects/<PROJECT_KEY>/docs/<DOC_ID>/publish" -H "Content-Type: application/json" -H "Authorization: Bearer <PERSONAL_TOKEN>" -d "{\"source\":\"agent\"}"
```

## References

Read `references/api.md` when exact fields, response shapes, validation rules, or error handling are needed.

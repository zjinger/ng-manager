# Hub V2 Personal Token Docs Write API

## Authentication

Use Personal Token:

```http
Authorization: Bearer <PERSONAL_TOKEN>
Content-Type: application/json
```

Required scopes:

| Operation | Scope |
|---|---|
| Create document | `doc:create:write` |
| Update document | `doc:update:write` |
| Publish document | `doc:publish:write` |

Do not expose the full token in logs, responses, screenshots, or generated files.

## Defaults

Default host:

```text
http://192.168.1.31:7008
```

Default token environment variable:

```text
HUB_V2_PERSONAL_TOKEN
```

Default source:

```text
agent
```

## Endpoints

### Create Document Draft

```http
POST /api/personal/projects/:projectKey/docs
```

Request body:

```json
{
  "title": "Token API 测试文档",
  "slug": "token-api-test-doc",
  "content": "# Token API 测试文档\n\n这是一篇通过 Personal Token 创建的文档。",
  "categoryId": "api-test",
  "summary": "Personal Token 创建文档测试",
  "tags": ["token-api", "docs"],
  "status": "draft",
  "source": "agent"
}
```

Fields:

| Field | Required | Description |
|---|---:|---|
| `title` | Yes | Document title. |
| `content` | Yes | Markdown body. `contentMd` is also accepted. |
| `slug` | No | Stable identifier. Use English short words joined by hyphens. |
| `categoryId` | No | Compatibility alias for document `category`. |
| `category` | No | Document category. |
| `summary` | No | Short summary. |
| `tags` | No | Audit metadata only. |
| `status` | No | Missing or `draft` only. |
| `source` | No | Audit metadata source, for example `agent`, `curl`, or `openclaw`. |

Create does not publish. Use the publish endpoint after content is confirmed.

### Update Document

```http
PATCH /api/personal/projects/:projectKey/docs/:docId
```

Request body:

```json
{
  "title": "Token API 更新后的文档",
  "slug": "token-api-updated-doc",
  "content": "# Token API 更新后的文档\n\n这是通过 Personal Token 更新后的正文。",
  "categoryId": "api-test",
  "summary": "Personal Token 编辑文档测试",
  "tags": ["token-api", "docs", "updated"],
  "source": "agent"
}
```

Editable fields:

- `title`
- `content` or `contentMd`
- `slug`
- `category` or `categoryId`
- `summary`
- `version`
- `tags`
- `source`

Update does not publish or archive. Do not send `status` for publishing.

### Publish Document

```http
POST /api/personal/projects/:projectKey/docs/:docId/publish
```

Request body:

```json
{
  "source": "agent"
}
```

Publish requires the token owner to be allowed to publish the document. A successful response returns `status: "published"` and a non-null `publishAt`.

## Response Shape

All successful responses use the common wrapper:

```json
{
  "code": "OK",
  "message": "document created",
  "data": {}
}
```

Document response:

```json
{
  "id": "doc_xxx",
  "title": "Token API 测试文档",
  "slug": "token-api-test-doc",
  "category": "api-test",
  "categoryId": "api-test",
  "status": "draft",
  "publishAt": null,
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-01T10:00:00.000Z"
}
```

Save `data.id` from create responses. Update and publish endpoints need this `docId`.

## Error Codes

| Code | Meaning | Next step |
|---|---|---|
| `TOKEN_SCOPE_FORBIDDEN` | Token lacks the required scope. | Use a Personal Token with `doc:create:write`, `doc:update:write`, or `doc:publish:write`. |
| `PROJECT_NOT_FOUND` | `projectKey` does not exist. | Verify the Hub V2 project key. |
| `PROJECT_ACCESS_DENIED` | Token owner is not a target project member or lacks access. | Add the owner to the project or use the correct user's token. |
| `DOCUMENT_SLUG_EXISTS` | Same project already has the slug. | Choose a new slug or update the existing document. |
| `DOCUMENT_NOT_FOUND` | `docId` is invalid or not in the project. | Use the id from create/list response and verify projectKey. |
| `VALIDATION_ERROR` | Payload is invalid, often non-draft status on create. | Fix fields and retry. |
| `TOKEN_RATE_LIMITED` | Token exceeded rate limit. | Back off and retry later. |

## Audit Notes

- Create, update, and publish write Personal Token audit logs.
- Audit metadata includes non-sensitive fields such as title, categoryId, summary, tags, status, source, and slug.
- Audit does not store the raw token.
- Audit does not store full Markdown content.

## Security Notes

- Do not store Personal Tokens in code.
- Prefer environment variables, secret managers, or the user's configured agent secret store.
- Redact token values when showing commands. Use `<PERSONAL_TOKEN>` or only a short prefix.
- Personal Token actions execute as the token owner.

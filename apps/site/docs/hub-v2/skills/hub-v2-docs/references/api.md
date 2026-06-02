# Hub V2 Docs API

## Read API

Read operations use Project Token:

```http
Authorization: Bearer <PROJECT_TOKEN>
```

Required scope:

```text
docs:read
```

### List Documents

```http
GET /api/token/projects/:projectKey/docs
```

Query parameters:

| Name | Description |
|---|---|
| `page` | Page number. Defaults to page 1. |
| `pageSize` | Page size. |
| `keyword` | Search title, summary, slug, or markdown body. |
| `category` | Document category. |
| `categoryId` | Alias of `category`. |
| `status` | Optional `draft`, `published`, or `archived`. |
| `statusGroup` | `active` means draft and published, excluding archived. |

Default list behavior:

- Use `statusGroup=active` when no status is requested.
- Archived docs require `status=archived`.
- List responses omit `contentMd`.

### Get Document By Id

```http
GET /api/token/projects/:projectKey/docs/:docId
```

### Get Document By Slug

```http
GET /api/token/projects/:projectKey/docs/by-slug/:slug
```

Detail responses include `contentMd`.

## Write API

Write operations use Personal Token:

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

Create accepts missing `status` or `draft` only.

### Update Document

```http
PATCH /api/personal/projects/:projectKey/docs/:docId
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

Update does not publish or archive.

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

Successful publish returns `status: "published"` and a non-null `publishAt`.

## Response Fields

Common success wrapper:

```json
{
  "code": "OK",
  "message": "OK",
  "data": {}
}
```

List item fields:

```json
{
  "id": "doc_xxx",
  "projectId": "prj_xxx",
  "slug": "project-api-guide",
  "title": "Project API Guide",
  "category": "api",
  "categoryId": "api",
  "summary": "Short summary",
  "status": "published",
  "version": null,
  "createdBy": "usr_xxx",
  "createdByName": "User Name",
  "publishAt": "2026-06-02T09:00:00.000Z",
  "createdAt": "2026-06-02T08:00:00.000Z",
  "updatedAt": "2026-06-02T09:00:00.000Z"
}
```

Detail responses include:

```json
{
  "contentMd": "# Markdown body"
}
```

## Error Codes

| Code | Meaning | Next step |
|---|---|---|
| `TOKEN_SCOPE_FORBIDDEN` | Token lacks required scope. | Use a token with the needed read/write scope. |
| `PROJECT_NOT_FOUND` | `projectKey` does not exist. | Verify the Hub V2 project key. |
| `TOKEN_PROJECT_FORBIDDEN` | Project Token belongs to another project. | Use the target project's Project Token. |
| `PROJECT_ACCESS_DENIED` | Personal Token owner lacks project access. | Add owner to project or use correct user's token. |
| `DOCUMENT_SLUG_EXISTS` | Same project already has the slug. | Choose a new slug or update existing document. |
| `DOCUMENT_NOT_FOUND` | `docId` or `slug` is invalid for the project. | Re-list docs and verify identifiers. |
| `VALIDATION_ERROR` | Payload is invalid. | Fix fields; do not publish via create/update. |
| `TOKEN_RATE_LIMITED` | Token exceeded rate limit. | Back off and retry later. |

## Audit Notes

- Create, update, and publish write Personal Token audit logs.
- Audit metadata includes non-sensitive fields such as title, categoryId, summary, tags, status, source, and slug.
- Audit does not store raw token values.
- Audit does not store full Markdown content.
